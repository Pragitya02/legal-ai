const express = require("express");
const crypto = require("crypto");
const authMiddleware = require("../middleware/authMiddleware");
const managementMiddleware = require("../middleware/managementMiddleware");
const db = require("../db");
const { createNotification } = require("./notificationRoutes");

const router = express.Router();

const ADVOCATE_EDITABLE = ["description", "category", "severity"];
const REPORT_CATEGORIES = new Set([
    "unprofessional_behaviour", "fraud_or_impersonation", "inappropriate_communication",
    "misuse_of_confidential_information", "unauthorized_case_changes",
    "improper_payment_request", "other",
]);
const REPORT_STATUSES = new Set(["submitted", "under_review", "resolved", "dismissed"]);

const uid = (req) => Number(req.user?.id);
const role = (req) => String(req.user?.role || "").toLowerCase();
const isAdvocate = (req) => role(req) === "lawyer";
const posInt = (v) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null);
const fail = (res, code, message) => res.status(code).json({ success: false, message });
const wrap = (fn) => async (req, res) => {
    try { await fn(req, res); }
    catch (e) { console.error("COLLAB ERROR:", e); fail(res, 500, "Something went wrong."); }
};

async function audit(conn, { userId, caseId, action, description, metadata }) {
    await conn.query(
        `INSERT INTO audit_logs (user_id, entity_type, entity_id, action, description, metadata)
         VALUES (?, 'case', ?, ?, ?, ?)`,
        [userId, caseId, action, description, JSON.stringify(metadata || {})]
    );
}

// Loads a collaboration only if the caller is its owner or advocate (IDOR-safe: identity from JWT, never body).
async function loadForParticipant(req, id, conn = db) {
    const cid = posInt(id);
    if (!cid) return null;
    const [rows] = await conn.query(
        `SELECT cc.*, c.title, c.description, c.category, c.severity, c.status AS case_status,
                c.created_at AS case_created_at, c.updated_at AS case_updated_at
         FROM case_collaborations cc JOIN cases c ON c.id = cc.case_id
         WHERE cc.id = ? AND (cc.owner_id = ? OR cc.advocate_id = ?) LIMIT 1`,
        [cid, uid(req), uid(req)]
    );
    const row = rows[0];
    if (!row) return null;
    row.viewer = row.owner_id === uid(req) ? "owner" : "advocate";
    return row;
}

const canWrite = (c) => c.status === "active" && !["closed", "resolved"].includes(c.case_status);

/* ---------- Feedback follow-up: should we show the "continue with advocate" popup? ---------- */
router.get("/consultation/:appointmentId/context", authMiddleware, wrap(async (req, res) => {
    const apptId = posInt(req.params.appointmentId);
    if (!apptId) return fail(res, 400, "Invalid appointment.");
    const [rows] = await db.query(
        `SELECT a.id, a.advocate_id, u.full_name AS advocate_name
         FROM appointments a JOIN users u ON u.id = a.advocate_id
         WHERE a.id = ? AND a.citizen_id = ? LIMIT 1`, [apptId, uid(req)]);
    if (!rows[0]) return res.json({ success: true, eligible: false });
    const [fb] = await db.query(
        `SELECT 1 FROM meeting_feedback WHERE appointment_id = ? AND reviewer_id = ? LIMIT 1`,
        [apptId, uid(req)]).catch(() => [[]]);
    const [existing] = await db.query(
        `SELECT 1 FROM case_collaborations WHERE owner_id = ? AND advocate_id = ?
         AND status IN ('pending','active') LIMIT 1`, [uid(req), rows[0].advocate_id]);
    res.json({
        success: true,
        eligible: fb.length > 0 && existing.length === 0,
        advocateId: rows[0].advocate_id,
        advocateName: rows[0].advocate_name,
        appointmentId: apptId,
    });
}));

/* ---------- Lists ---------- */
router.get("/my-cases", authMiddleware, wrap(async (req, res) => {
    const me = uid(req);
    const lastMsg = `(SELECT MAX(m.created_at) FROM case_messages m WHERE m.collaboration_id = cc.id)`;
    const unread = `(SELECT COUNT(*) FROM case_messages m WHERE m.collaboration_id = cc.id AND m.sender_id <> ?
        AND m.id > COALESCE((SELECT r.last_read_id FROM case_message_reads r WHERE r.collaboration_id = cc.id AND r.user_id = ?), 0))`;
    if (isAdvocate(req)) {
        // Pending rows deliberately omit description: no protected case data before acceptance.
        const [rows] = await db.query(
            `SELECT cc.id AS collaboration_id, cc.case_id, cc.status AS collaboration_status,
                    cc.requested_at AS shared_at, c.title, c.category,
                    client.full_name AS client_name,
                    GREATEST(c.updated_at, COALESCE(${lastMsg}, c.updated_at)) AS last_activity,
                    ${unread} AS unread_count
             FROM case_collaborations cc
             JOIN cases c ON c.id = cc.case_id JOIN users client ON client.id = cc.owner_id
             WHERE cc.advocate_id = ? AND cc.status IN ('pending','active','ended_by_user')
             ORDER BY last_activity DESC`, [me, me, me]);
        return res.json({ success: true, items: rows });
    }
    const [rows] = await db.query(
        `SELECT c.id AS case_id, c.title, c.category, c.status AS case_status, c.created_at, c.updated_at,
                cc.id AS collaboration_id, cc.status AS collaboration_status,
                adv.full_name AS advocate_name, cc.advocate_id,
                GREATEST(c.updated_at, COALESCE(${lastMsg}, c.updated_at)) AS last_activity,
                ${unread} AS unread_count
         FROM cases c
         LEFT JOIN case_collaborations cc ON cc.case_id = c.id AND cc.owner_id = c.user_id
         LEFT JOIN users adv ON adv.id = cc.advocate_id
         WHERE c.user_id = ? ORDER BY last_activity DESC`, [me, me, me]);
    res.json({ success: true, items: rows });
}));

/* ---------- Share (owner only, explicit) ---------- */
router.post("/cases/:caseId/share", authMiddleware, wrap(async (req, res) => {
    const caseId = posInt(req.params.caseId);
    const advocateId = posInt(req.body?.advocateId);
    if (!caseId || !advocateId) return fail(res, 400, "Case and advocate are required.");
    if (isAdvocate(req)) return fail(res, 403, "Only the case owner can share a case.");
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [own] = await conn.query(
            `SELECT id, title FROM cases WHERE id = ? AND user_id = ? FOR UPDATE`, [caseId, uid(req)]);
        if (!own[0]) { await conn.rollback(); return fail(res, 404, "Case not found."); }
        const [adv] = await conn.query(`SELECT id FROM users WHERE id = ? AND role = 'lawyer'`, [advocateId]);
        const [appt] = await conn.query(
            `SELECT id FROM appointments WHERE citizen_id = ? AND advocate_id = ? ORDER BY id DESC LIMIT 1`,
            [uid(req), advocateId]);
        if (!adv[0] || !appt[0]) {
            await conn.rollback();
            return fail(res, 403, "You can only share a case with an advocate you have consulted.");
        }
        const [ex] = await conn.query(
            `SELECT id, status FROM case_collaborations WHERE case_id = ? AND advocate_id = ? FOR UPDATE`,
            [caseId, advocateId]);
        let collabId;
        if (ex[0]) {
            if (["pending", "active"].includes(ex[0].status)) {
                await conn.rollback();
                return res.status(409).json({ success: false, message: "This case is already shared with this advocate.", collaborationId: ex[0].id });
            }
            collabId = ex[0].id; // re-share after decline/end: same row, back to pending
            await conn.query(
                `UPDATE case_collaborations SET status='pending', appointment_id=?, requested_at=NOW(),
                 responded_at=NULL, ended_at=NULL, ended_by=NULL WHERE id = ?`, [appt[0].id, collabId]);
        } else {
            const [r] = await conn.query(
                `INSERT INTO case_collaborations (case_id, owner_id, advocate_id, appointment_id) VALUES (?,?,?,?)`,
                [caseId, uid(req), advocateId, appt[0].id]);
            collabId = r.insertId;
        }
        await audit(conn, { userId: uid(req), caseId, action: "case_shared", description: "Case shared with advocate (pending approval).", metadata: { actor_role: "citizen", advocateId, collaborationId: collabId } });
        await conn.commit();
        await createNotification({ userId: advocateId, type: "case_request", title: "New case collaboration request", message: "A client has shared a case with you. Review the request in My Cases.", relatedId: collabId });
        res.status(201).json({ success: true, collaborationId: collabId });
    } catch (e) { try { await conn.rollback(); } catch {} throw e; }
    finally { conn.release(); }
}));

/* ---------- Advocate accepts / declines ---------- */
router.patch("/collaborations/:id/respond", authMiddleware, wrap(async (req, res) => {
    if (!isAdvocate(req)) return fail(res, 403, "Advocates only.");
    const decision = req.body?.decision;
    if (!["accept", "decline"].includes(decision)) return fail(res, 400, "Decision must be accept or decline.");
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [rows] = await conn.query(
            `SELECT * FROM case_collaborations WHERE id = ? AND advocate_id = ? AND status = 'pending' FOR UPDATE`,
            [posInt(req.params.id) || 0, uid(req)]);
        if (!rows[0]) { await conn.rollback(); return fail(res, 404, "No pending request found."); }
        const next = decision === "accept" ? "active" : "declined";
        await conn.query(`UPDATE case_collaborations SET status = ?, responded_at = NOW() WHERE id = ?`, [next, rows[0].id]);
        await audit(conn, { userId: uid(req), caseId: rows[0].case_id, action: `collaboration_${next}`, description: `Advocate ${decision}ed the collaboration request.`, metadata: { actor_role: "lawyer", collaborationId: rows[0].id } });
        await conn.commit();
        await createNotification({ userId: rows[0].owner_id, type: "case_request_" + next, title: decision === "accept" ? "Advocate accepted your case" : "Advocate declined your case", message: "Open My Cases to see the update.", relatedId: rows[0].id });
        res.json({ success: true, status: next });
    } catch (e) { try { await conn.rollback(); } catch {} throw e; }
    finally { conn.release(); }
}));

/* ---------- Workspace overview ---------- */
router.get("/collaborations/:id", authMiddleware, wrap(async (req, res) => {
    const c = await loadForParticipant(req, req.params.id);
    if (!c) return fail(res, 404, "Not found.");
    const full = c.viewer === "owner" || c.status === "active";
    const [people] = await db.query(
        `SELECT id, full_name FROM users WHERE id IN (?, ?)`, [c.owner_id, c.advocate_id]);
    const name = (id) => people.find((p) => p.id === id)?.full_name || "";
    res.json({
        success: true,
        viewer: c.viewer,
        collaboration: { id: c.id, status: c.status, canWrite: canWrite(c), requestedAt: c.requested_at, respondedAt: c.responded_at, endedAt: c.ended_at },
        case: {
            id: c.case_id, title: c.title, category: c.category, status: c.case_status,
            description: full ? c.description : null, severity: full ? c.severity : null,
            createdAt: c.case_created_at, updatedAt: c.case_updated_at,
        },
        owner: { name: name(c.owner_id) },
        advocate: { id: c.advocate_id, name: name(c.advocate_id) },
    });
}));

/* ---------- Advocate edits (description mandatory, validated here) ---------- */
router.patch("/collaborations/:id/case", authMiddleware, wrap(async (req, res) => {
    if (!isAdvocate(req)) return fail(res, 403, "Only the collaborating advocate can edit working information.");
    const note = typeof req.body?.changeDescription === "string" ? req.body.changeDescription.trim() : "";
    if (note.length < 10) return fail(res, 400, "A description of the change (at least 10 characters) is required.");
    if (note.length > 2000) return fail(res, 400, "Change description is too long.");
    const requested = Object.keys(req.body?.changes || {});
    if (!requested.length) return fail(res, 400, "No changes supplied.");
    if (requested.some((k) => !ADVOCATE_EDITABLE.includes(k))) return fail(res, 403, "One or more fields cannot be edited by an advocate.");
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const c = await loadForParticipant(req, req.params.id, conn);
        if (!c || c.viewer !== "advocate" || !canWrite(c)) { await conn.rollback(); return fail(res, 403, "Collaboration is not active."); }
        const updates = [];
        for (const k of requested) {
            const nv = String(req.body.changes[k] ?? "").trim();
            if (!nv || nv.length > (k === "description" ? 10000 : 100)) { await conn.rollback(); return fail(res, 400, `Invalid value for ${k}.`); }
            if (String(c[k] ?? "") !== nv) updates.push([k, c[k], nv]);
        }
        if (!updates.length) { await conn.rollback(); return fail(res, 400, "Nothing changed."); }
        for (const [k, oldV, newV] of updates) {
            await conn.query(`UPDATE cases SET ${k} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [newV, c.case_id]); // k is allow-listed
            await conn.query(
                `INSERT INTO case_versions (case_id, collaboration_id, field_name, old_value, new_value, changed_by, changed_by_role, change_description)
                 VALUES (?,?,?,?,?,?, 'lawyer', ?)`, [c.case_id, c.id, k, oldV, newV, uid(req), note]);
        }
        await audit(conn, { userId: uid(req), caseId: c.case_id, action: "case_updated_by_advocate", description: note, metadata: { actor_role: "lawyer", fields: updates.map(([k, o, n]) => ({ field: k, from: o, to: n })) } });
        await conn.commit();
        await createNotification({ userId: c.owner_id, type: "case_updated", title: "Your advocate updated a case", message: "Open the case to review the change.", relatedId: c.id });
        res.json({ success: true });
    } catch (e) { try { await conn.rollback(); } catch {} throw e; }
    finally { conn.release(); }
}));

router.get("/collaborations/:id/activity", authMiddleware, wrap(async (req, res) => {
    const c = await loadForParticipant(req, req.params.id);
    if (!c) return fail(res, 404, "Not found.");
    if (c.status === "pending" && c.viewer === "advocate") return fail(res, 403, "Accept the request to view activity.");
    const [rows] = await db.query(
        `SELECT a.id, a.action, a.description, a.metadata, a.created_at, u.full_name AS actor
         FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
         WHERE a.entity_type = 'case' AND a.entity_id = ? ORDER BY a.id DESC LIMIT 200`, [c.case_id]);
    res.json({ success: true, items: rows });
}));

/* ---------- Messaging (REST + polling) ---------- */
router.get("/collaborations/:id/messages", authMiddleware, wrap(async (req, res) => {
    const c = await loadForParticipant(req, req.params.id);
    if (!c || (c.viewer === "advocate" && c.status === "pending")) return fail(res, 404, "Not found.");
    const after = Number(req.query.after) > 0 ? Number(req.query.after) : 0;
    const [rows] = await db.query(
        `SELECT m.id, m.sender_id, m.sender_role, m.body, m.created_at, u.full_name AS sender_name
         FROM case_messages m JOIN users u ON u.id = m.sender_id
         WHERE m.collaboration_id = ? AND m.id > ? ORDER BY m.id ASC LIMIT 500`, [c.id, after]);
    if (rows.length) {
        await db.query(
            `INSERT INTO case_message_reads (collaboration_id, user_id, last_read_id) VALUES (?,?,?)
             ON DUPLICATE KEY UPDATE last_read_id = GREATEST(last_read_id, VALUES(last_read_id))`,
            [c.id, uid(req), rows[rows.length - 1].id]);
    }
    res.json({ success: true, readOnly: !canWrite(c), items: rows.map((m) => ({ ...m, mine: m.sender_id === uid(req) })) });
}));

router.post("/collaborations/:id/messages", authMiddleware, wrap(async (req, res) => {
    const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    if (!body || body.length > 4000) return fail(res, 400, "Message must be 1–4000 characters.");
    const c = await loadForParticipant(req, req.params.id);
    if (!c) return fail(res, 404, "Not found.");
    if (!canWrite(c)) return fail(res, 403, "This conversation is read-only.");
    const senderRole = c.viewer === "owner" ? "citizen" : "lawyer";
    const [r] = await db.query(
        `INSERT INTO case_messages (case_id, collaboration_id, sender_id, sender_role, body) VALUES (?,?,?,?,?)`,
        [c.case_id, c.id, uid(req), senderRole, body]);
    // Generic preview only: no legal content in notifications.
    await createNotification({ userId: c.viewer === "owner" ? c.advocate_id : c.owner_id, type: "case_message", title: "New case message", message: "You have a new message in a shared case.", relatedId: c.id });
    res.status(201).json({ success: true, id: r.insertId });
}));

/* ---------- End collaboration (owner only) ---------- */
router.post("/collaborations/:id/end", authMiddleware, wrap(async (req, res) => {
    if (isAdvocate(req)) return fail(res, 403, "Only the case owner can end a collaboration.");
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [rows] = await conn.query(
            `SELECT * FROM case_collaborations WHERE id = ? AND owner_id = ? AND status = 'active' FOR UPDATE`,
            [posInt(req.params.id) || 0, uid(req)]);
        if (!rows[0]) { await conn.rollback(); return fail(res, 404, "No active collaboration found."); }
        await conn.query(`UPDATE case_collaborations SET status='ended_by_user', ended_at=NOW(), ended_by=? WHERE id=?`, [uid(req), rows[0].id]);
        await audit(conn, { userId: uid(req), caseId: rows[0].case_id, action: "collaboration_ended", description: "Client ended the platform collaboration. Case data retained.", metadata: { actor_role: "citizen", collaborationId: rows[0].id } });
        await conn.commit();
        await createNotification({ userId: rows[0].advocate_id, type: "case_collab_ended", title: "Collaboration ended", message: "A client has ended a case collaboration on the platform.", relatedId: rows[0].id });
        res.json({ success: true, status: "ended_by_user" });
    } catch (e) { try { await conn.rollback(); } catch {} throw e; }
    finally { conn.release(); }
}));

/* ---------- Report advocate (owner only, even after collaboration ended) ---------- */
router.post("/collaborations/:id/report", authMiddleware, wrap(async (req, res) => {
    if (isAdvocate(req)) return fail(res, 403, "Only the case owner can report an advocate.");
    const { category, description, evidenceNote } = req.body || {};
    if (!REPORT_CATEGORIES.has(category)) return fail(res, 400, "Select a valid report category.");
    const desc = typeof description === "string" ? description.trim() : "";
    if (desc.length < 20 || desc.length > 5000) return fail(res, 400, "Describe the incident (20–5000 characters).");
    const ev = typeof evidenceNote === "string" ? evidenceNote.trim().slice(0, 2000) : null;
    const c = await loadForParticipant(req, req.params.id);
    if (!c || c.viewer !== "owner" || c.status === "pending") return fail(res, 404, "Not found.");
    const code = "RPT-" + crypto.randomBytes(5).toString("hex").toUpperCase();
    await db.query(
        `INSERT INTO advocate_reports (report_code, reporter_id, advocate_id, case_id, collaboration_id, category, description, evidence_note)
         VALUES (?,?,?,?,?,?,?,?)`, [code, uid(req), c.advocate_id, c.case_id, c.id, category, desc, ev || null]);
    const [mgmt] = await db.query(`SELECT id FROM users WHERE role = 'management' LIMIT 20`);
    for (const m of mgmt) await createNotification({ userId: m.id, type: "advocate_report", title: "New advocate report", message: `Report ${code} needs review.`, relatedId: c.id });
    res.status(201).json({ success: true, reportCode: code, message: "Report submitted. It is an allegation under review, not a finding." });
}));

router.get("/reports/mine", authMiddleware, wrap(async (req, res) => {
    const [rows] = await db.query(
        `SELECT report_code, collaboration_id, category, status, created_at FROM advocate_reports WHERE reporter_id = ? ORDER BY id DESC`, [uid(req)]);
    res.json({ success: true, items: rows });
}));

/* ---------- Management review (existing management role; no auto-ban) ---------- */
router.get("/management/reports", managementMiddleware, wrap(async (req, res) => {
    const [rows] = await db.query(
        `SELECT r.*, rep.full_name AS reporter_name, adv.full_name AS advocate_name
         FROM advocate_reports r JOIN users rep ON rep.id = r.reporter_id JOIN users adv ON adv.id = r.advocate_id
         ORDER BY r.id DESC LIMIT 200`);
    res.json({ success: true, items: rows });
}));

router.patch("/management/reports/:id", managementMiddleware, wrap(async (req, res) => {
    const { status, notes } = req.body || {};
    if (!REPORT_STATUSES.has(status)) return fail(res, 400, "Invalid status.");
    const [r] = await db.query(
        `UPDATE advocate_reports SET status = ?, management_notes = ?, reviewed_by = ? WHERE id = ?`,
        [status, typeof notes === "string" ? notes.slice(0, 5000) : null, uid(req), posInt(req.params.id) || 0]);
    if (!r.affectedRows) return fail(res, 404, "Report not found.");
    res.json({ success: true });
}));

module.exports = router;
