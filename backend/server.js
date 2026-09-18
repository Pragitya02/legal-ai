// =====================================================
// NYAYA AI - SECURE BACKEND SERVER
// =====================================================

process.env.TZ = "Asia/Kolkata";
require("dotenv").config();

const express = require("express");
const feedbackRoutes = require("./routes/feedbackRoutes");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const http = require("http");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cookie = require("cookie");
const { Server } = require("socket.io");
const { ACCESS_TOKEN_COOKIE } = require("./utils/cookieConfig");

// =====================================================
// ENVIRONMENT / JWT CONFIGURATION
// =====================================================

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error(
        "JWT_SECRET is not configured. Add JWT_SECRET to your .env file."
    );
}

const PORT = process.env.PORT || 5001;

const FRONTEND_URL =
    process.env.FRONTEND_URL || "http://localhost:5173";

// =====================================================
// DATABASE
// =====================================================

const db = require("./db");

// =====================================================
// DATABASE INITIALIZATION
// =====================================================

const { ensureOtpTable } = require("./database/otpModel");
const { ensureGoogleAuthSupport } = require("./database/userModel");
const { ensureRefreshTokenTable } = require("./database/refreshTokenModel");
const { ensurePasswordResetTokenTable } = require("./database/passwordResetTokenModel");
const {
    ensureDocumentHashColumn,
    ensureBlockchainColumns,
} = require("./database/documentHashModel");

ensureOtpTable().catch((err) => {
    console.error(
        "Failed to ensure otp_verifications table:",
        err.message
    );
});

ensureGoogleAuthSupport().catch((err) => {
    console.error(
        "Failed to ensure Google auth support:",
        err.message
    );
});

ensureRefreshTokenTable().catch((err) => {
    console.error(
        "Failed to ensure refresh_tokens table:",
        err.message
    );
});

ensurePasswordResetTokenTable().catch((err) => {
    console.error(
        "Failed to ensure password_reset_tokens table:",
        err.message
    );
});

ensureDocumentHashColumn().catch((err) => {
    console.error(
        "Failed to ensure document_hash column:",
        err.message
    );
});

ensureBlockchainColumns().catch((err) => {
    console.error(
        "Failed to ensure blockchain registration columns:",
        err.message
    );
});

// =====================================================
// ROUTES
// =====================================================

const uploadRoutes = require("./routes/uploadRoutes");
const documentSecurityRoutes = require("./routes/documentSecurityRoutes");
const authRoutes = require("./routes/authRoutes");
const lawyerRoutes = require("./routes/lawyerRoutes");
const voiceRoutes = require("./routes/voiceRoutes");
const chatRoutes = require("./routes/chatRoutes");
const caseRoutes = require("./routes/caseRoutes");
const profileRoutes = require("./routes/profileRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const signalingRoutes = require("./routes/signalingRoutes");
const researchRoutes = require("./routes/researchRoutes");
const searchRoutes = require("./routes/searchRoutes");

// =====================================================
// MIDDLEWARE / AGENTS
// =====================================================

const authMiddleware = require("./middleware/authMiddleware");
const masterAgent = require("./agents/masterAgent");
const { createNotification } = require("./routes/notificationRoutes");

// =====================================================
// EXPRESS APP
// =====================================================

const app = express();
// Render runs the application behind a trusted reverse proxy.
// This allows express-rate-limit to safely process X-Forwarded-For.

app.set("trust proxy", 1);
// =====================================================
// SECURITY HEADERS - HELMET
// =====================================================
    
app.use(
    helmet({
        crossOriginResourcePolicy: {
            policy: "cross-origin",
        },
    })
);

// =====================================================
// COOKIE PARSER
// Required so authMiddleware / routes can read the
// HttpOnly authentication cookies via req.cookies.
// =====================================================
app.use(cookieParser());

app.use("/api/feedback", feedbackRoutes);
// =====================================================
// CORS CONFIGURATION
// =====================================================

const isProduction = process.env.NODE_ENV === "production";

const allowedOrigins = [
    FRONTEND_URL,
    "https://nyayaai.online",
    "https://www.nyayaai.online",
].filter(Boolean);

// Localhost origins are only needed for local development
// and must never be trusted in production.
if (!isProduction) {
    allowedOrigins.push(
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    );
}

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests without an Origin header.
            // This includes server-to-server requests and some CLI tools.
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            console.warn(
                "Blocked CORS request from origin:",
                origin
            );

            return callback(
                new Error("CORS policy: Origin not allowed.")
            );
        },

        credentials: true,

        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS",
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Document-Password",
            "X-CSRF-Token",
        ],
    })
);

// =====================================================
// BODY PARSERS
// =====================================================

// Limit JSON payload size to reduce abuse / DoS risk.
app.use(
    express.json({
        limit: "1mb",
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "1mb",
    })
);

// =====================================================
// RATE LIMITING
// =====================================================

// Authentication endpoints are particularly sensitive.
// This limits repeated login / signup / OTP requests.

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,

    max: 20,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
        success: false,
        message:
            "Too many authentication requests. Please try again later.",
    },
});

// General API protection.
//
// This is deliberately higher than the authentication limit
// because AI requests and normal application traffic can be frequent.

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,

    max: 300,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
        success: false,
        message:
            "Too many requests. Please try again later.",
    },
});

// Apply general limiter to API routes.
app.use("/api", apiLimiter);

// =====================================================
// API ROUTES
// =====================================================

// -----------------------------------------------------
// Upload
// -----------------------------------------------------

app.use(
    "/api",
    uploadRoutes
);

// -----------------------------------------------------
// Authentication
// -----------------------------------------------------

app.use(
    "/api/auth",
    authLimiter,
    authRoutes
);

// -----------------------------------------------------
// Voice
// -----------------------------------------------------

app.use(
    "/api/voice",
    voiceRoutes
);

// -----------------------------------------------------
// Lawyers / Advocates
// -----------------------------------------------------

app.use(
    "/api/lawyers",
    lawyerRoutes
);

// -----------------------------------------------------
// AI Chat
// -----------------------------------------------------

app.use(
    "/api/chat",
    chatRoutes
);

// -----------------------------------------------------
// Cases
// -----------------------------------------------------

app.use(
    "/api/cases",
    caseRoutes
);

// -----------------------------------------------------
// User Profile
// -----------------------------------------------------

app.use(
    "/api/profile",
    profileRoutes
);

// -----------------------------------------------------
// Notifications
// -----------------------------------------------------

app.use(
    "/api/notifications",
    notificationRoutes
);

// -----------------------------------------------------
// Appointments
// -----------------------------------------------------

app.use(
    "/api/appointments",
    appointmentRoutes
);

// -----------------------------------------------------
// Advocate Availability
// -----------------------------------------------------

app.use(
    "/api/availability",
    availabilityRoutes
);

// -----------------------------------------------------
// Consultation Meetings
// -----------------------------------------------------

app.use(
    "/api/meetings",
    meetingRoutes
);

// -----------------------------------------------------
// Document Security
// -----------------------------------------------------

app.use(
    "/api/document-security",
    documentSecurityRoutes
);

// -----------------------------------------------------
// WebRTC Signaling HTTP Routes
// -----------------------------------------------------

app.use(
    "/api/signaling",
    signalingRoutes
);
// -----------------------------------------------------
// Advocate AI Research
// -----------------------------------------------------

app.use(
    "/api/research",
    researchRoutes
);
// -----------------------------------------------------
// Global Content Search
// -----------------------------------------------------

app.use(
    "/api/search",
    searchRoutes
);

// =====================================================
// ROUTE STATUS
// =====================================================

console.log(
    "******** PROFILE ROUTES MOUNTED ********"
);

console.log(
    "******** NOTIFICATION ROUTES MOUNTED ********"
);

console.log(
    "******** APPOINTMENT ROUTES MOUNTED ********"
);

console.log(
    "******** AVAILABILITY ROUTES MOUNTED ********"
);

console.log(
    "******** MEETING ROUTES MOUNTED ********"
);

console.log(
    "******** SIGNALING ROUTES MOUNTED ********"
);

// =====================================================
// AI CASE ANALYSIS
// =====================================================

app.post(
    "/analyze",
    authMiddleware,
    async (req, res) => {
        try {
            console.log(
                "================================="
            );

            console.log(
                "ANALYZE REQUEST RECEIVED"
            );

            // Safe to log user ID.
            // Never log JWT tokens or passwords.
            console.log(
                "USER ID:",
                req.user.id
            );

            console.log(
                "================================="
            );

            const result = await masterAgent({
                ...req.body,
                userId: req.user.id,
            });

            // =================================================
            // CREATE AI RESPONSE NOTIFICATION
            // =================================================

            if (
                result?.success === true
            ) {
                await createNotification({
                    userId: req.user.id,

                    type: "ai_response",

                    title:
                        "AI Assistant replied to your query",

                    message:
                        "Your legal guidance is ready to view.",

                    relatedId: null,
                });
            }

            res.json(result);

        } catch (err) {
            console.error(
                "ANALYZE ERROR:",
                err.message
            );

            res.status(500).json({
                success: false,

                response:
                    "Backend Error",

                message:
                    "Failed to analyze case",
            });
        }
    }
);

// =====================================================
// 404 HANDLER
// =====================================================

app.use(
    (req, res) => {
        res.status(404).json({
            success: false,

            message:
                "API endpoint not found",

            path:
                req.originalUrl,
        });
    }
);

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
    (err, req, res, next) => {
        console.error(
            "================================="
        );

        console.error(
            "GLOBAL SERVER ERROR:"
        );

        console.error(
            err.message
        );

        console.error(
            "================================="
        );

        // Don't expose internal error details
        // to production users.

        const isProduction =
            process.env.NODE_ENV === "production";

        res.status(
            err.status || 500
        ).json({
            success: false,

            message: isProduction
                ? "Internal server error"
                : err.message || "Internal server error",
        });
    }
);

// =====================================================
// HTTP SERVER
// =====================================================

const server =
    http.createServer(app);

// =====================================================
// SOCKET.IO SERVER
// =====================================================

const io =
    new Server(
        server,
        {
            cors: {
                origin: function (origin, callback) {
                    if (!origin) {
                        return callback(null, true);
                    }

                    if (allowedOrigins.includes(origin)) {
                        return callback(null, true);
                    }

                    console.warn(
                        "Blocked Socket.IO origin:",
                        origin
                    );

                    return callback(
                        new Error(
                            "Socket.IO CORS policy: Origin not allowed."
                        )
                    );
                },

                credentials: true,

                methods: [
                    "GET",
                    "POST",
                ],
            },
        }
    );

// Make Socket.IO available to Express route handlers so meeting lifecycle
// APIs can notify the participant who is currently in the consultation.
app.set("io", io);

// =====================================================
// SOCKET.IO AUTHENTICATION
// =====================================================

io.use(
    (socket, next) => {
        try {
            // Preferred: HttpOnly auth cookie, sent automatically
            // by the browser when the Socket.IO client connects
            // with `withCredentials: true`. This keeps the JWT
            // out of frontend JavaScript entirely.
            let token = null;

            const cookieHeader =
                socket.handshake.headers?.cookie;

            if (cookieHeader) {
                const parsedCookies =
                    cookie.parse(cookieHeader);

                token =
                    parsedCookies[ACCESS_TOKEN_COOKIE] ||
                    null;
            }

            if (!token) {
                console.error(
                    "Socket connection rejected: no token"
                );

                return next(
                    new Error(
                        "Authentication required"
                    )
                );
            }

            const decoded =
                jwt.verify(
                    token,
                    JWT_SECRET
                );

            if (!decoded?.id) {
                console.error(
                    "Socket connection rejected: invalid user"
                );

                return next(
                    new Error(
                        "Invalid authentication token"
                    )
                );
            }

            // Store only verified JWT data.
            socket.user = decoded;

            console.log(
                "Socket authenticated:",
                decoded.id,
                decoded.role
            );

            next();

        } catch (error) {
            console.error(
                "Socket authentication failed:",
                error.message
            );

            next(
                new Error(
                    "Invalid authentication token"
                )
            );
        }
    }
);

// =====================================================
// SOCKET.IO ROOM STORAGE
// =====================================================

const socketRooms =
    new Map();

// =====================================================
// SOCKET.IO WEBRTC SIGNALING
// =====================================================

io.on(
    "connection",
    (socket) => {
        console.log(
            "WebRTC signaling client connected:",
            socket.id
        );

        // =================================================
        // JOIN CONSULTATION
        // =================================================

        socket.on(
            "join-consultation",
            async (data) => {
                try {
                    // Only appointmentId comes from
                    // the browser.
                    const {
                        appointmentId,
                    } = data || {};

                    // User identity comes ONLY from
                    // the verified JWT.
                    const userId =
                        socket.user?.id;

                    const role =
                        String(
                            socket.user?.role || ""
                        ).toLowerCase();

                    // -----------------------------------------
                    // VALIDATE APPOINTMENT ID
                    // -----------------------------------------

                    if (!appointmentId) {
                        socket.emit(
                            "signaling-error",
                            {
                                message:
                                    "Appointment ID is required",
                            }
                        );

                        return;
                    }

                    if (!userId || !role) {
                        socket.emit(
                            "signaling-error",
                            {
                                message:
                                    "Authenticated user information is missing",
                            }
                        );

                        return;
                    }

                    const numericAppointmentId =
                        Number(appointmentId);

                    if (
                        !Number.isInteger(
                            numericAppointmentId
                        ) ||
                        numericAppointmentId <= 0
                    ) {
                        socket.emit(
                            "signaling-error",
                            {
                                message:
                                    "Invalid appointment ID",
                            }
                        );

                        return;
                    }

                    // -----------------------------------------
                    // VERIFY APPOINTMENT
                    // -----------------------------------------

                    const [appointmentRows] =
                        await db.query(
                            `
                            SELECT
                                a.id,
                                a.citizen_id,
                                a.lawyer_id,
                                a.status,
                                a.notes,
                                a.appointment_date
                            FROM appointments a
                            WHERE a.id = ?
                            LIMIT 1
                            `,
                            [
                                numericAppointmentId,
                            ]
                        );

                    if (
                        appointmentRows.length === 0
                    ) {
                        socket.emit(
                            "signaling-error",
                            {
                                message:
                                    "Consultation appointment not found",
                            }
                        );

                        return;
                    }

                    const appointment =
                        appointmentRows[0];

                    // -----------------------------------------
                    // ONLY CONFIRMED APPOINTMENTS
                    // -----------------------------------------

                    if (
                        String(
                            appointment.status
                        ).toLowerCase() !== "confirmed"
                    ) {
                        socket.emit(
                            "signaling-error",
                            {
                                message:
                                    "This consultation has not been confirmed",
                            }
                        );

                        return;
                    }

                    // -----------------------------------------
                    // ONLY VIDEO CONSULTATIONS
                    // -----------------------------------------

                    const notes =
                        String(
                            appointment.notes || ""
                        ).toLowerCase();

                    const modeMatch =
                        notes.match(
                            /(?:^|[;\s])mode\s*=\s*([^;\s]+)/i
                        );

                    const consultationMode =
                        modeMatch
                            ? modeMatch[1].toLowerCase()
                            : "video";

                    if (
                        consultationMode !== "video"
                    ) {
                        socket.emit(
                            "signaling-error",
                            {
                                message:
                                    "This appointment is not a video consultation",
                            }
                        );

                        return;
                    }

                    // -----------------------------------------
                    // VERIFY PARTICIPANT OWNERSHIP
                    // -----------------------------------------

                    const isCitizen =
                        Number(
                            appointment.citizen_id
                        ) === Number(userId);

                    const isAdvocate =
                        Number(
                            appointment.lawyer_id
                        ) === Number(userId);

                    if (
                        !isCitizen &&
                        !isAdvocate
                    ) {
                        console.warn(
                            "Unauthorized consultation access:",
                            {
                                socketId:
                                    socket.id,

                                userId,

                                appointmentId:
                                    numericAppointmentId,
                            }
                        );

                        socket.emit(
                            "signaling-error",
                            {
                                message:
                                    "You are not authorized to join this consultation",
                            }
                        );

                        return;
                    }

                    // -----------------------------------------
                    // VERIFY ROLE CONSISTENCY
                    // -----------------------------------------

                    if (
                        isCitizen &&
                        role !== "citizen"
                    ) {
                        socket.emit(
                            "signaling-error",
                            {
                                message:
                                    "Your account role does not match this consultation",
                            }
                        );

                        return;
                    }

                    if (
                        isAdvocate &&
                        role !== "lawyer"
                    ) {
                        socket.emit(
                            "signaling-error",
                            {
                                message:
                                    "Your account role does not match this consultation",
                            }
                        );

                        return;
                    }

                    // -----------------------------------------
                    // LEAVE PREVIOUS ROOM
                    // -----------------------------------------

                    if (
                        socket.data.roomName
                    ) {
                        removeSocketFromConsultation(
                            socket
                        );
                    }

                    const roomName =
                        `consultation-${numericAppointmentId}`;

                    // -----------------------------------------
                    // JOIN SOCKET.IO ROOM
                    // -----------------------------------------

                    socket.join(
                        roomName
                    );

                    socket.data.appointmentId =
                        String(
                            numericAppointmentId
                        );

                    socket.data.userId =
                        String(
                            userId
                        );

                    socket.data.role =
                        role;

                    socket.data.roomName =
                        roomName;

                    // -----------------------------------------
                    // CREATE PARTICIPANT MAP
                    // -----------------------------------------

                    if (
                        !socketRooms.has(
                            roomName
                        )
                    ) {
                        socketRooms.set(
                            roomName,
                            new Map()
                        );
                    }

                    const participants =
                        socketRooms.get(
                            roomName
                        );

                    // -----------------------------------------
                    // STORE PARTICIPANT
                    // -----------------------------------------

                    participants.set(
                        socket.id,
                        {
                            socketId:
                                socket.id,

                            userId:
                                String(
                                    userId
                                ),

                            role:
                                role,
                        }
                    );

                    console.log(
                        `Authorized ${role} joined ${roomName}`
                    );

                    // -----------------------------------------
                    // EXISTING PARTICIPANTS
                    // -----------------------------------------

                    const existingParticipants =
                        Array.from(
                            participants.values()
                        ).filter(
                            (participant) =>
                                participant.socketId !==
                                socket.id
                        );

                    // -----------------------------------------
                    // TELL NEW PARTICIPANT
                    // -----------------------------------------

                    socket.emit(
                        "consultation-joined",
                        {
                            roomName,

                            participants:
                                existingParticipants,
                        }
                    );

                    // -----------------------------------------
                    // TELL EXISTING PARTICIPANTS
                    // -----------------------------------------

                    socket.to(
                        roomName
                    ).emit(
                        "participant-joined",
                        {
                            socketId:
                                socket.id,

                            userId:
                                String(
                                    userId
                                ),

                            role:
                                role,
                        }
                    );

                } catch (error) {
                    console.error(
                        "Join consultation authorization error:",
                        error.message
                    );

                    socket.emit(
                        "signaling-error",
                        {
                            message:
                                "Unable to authorize consultation access",
                        }
                    );
                }
            }
        );

        // =================================================
        // WEBRTC OFFER
        // =================================================

        socket.on(
            "webrtc-offer",
            (data) => {
                try {
                    const roomName =
                        socket.data.roomName;

                    if (!roomName) {
                        socket.emit(
                            "signaling-error",
                            {
                                message:
                                    "You are not in a consultation room",
                            }
                        );

                        return;
                    }

                    console.log(
                        "WebRTC offer received:",
                        socket.id,
                        roomName
                    );

                    socket.to(
                        roomName
                    ).emit(
                        "webrtc-offer",
                        {
                            from:
                                socket.id,

                            offer:
                                data?.offer,
                        }
                    );

                } catch (error) {
                    console.error(
                        "WebRTC offer error:",
                        error.message
                    );
                }
            }
        );

        // =================================================
        // WEBRTC ANSWER
        // =================================================

        socket.on(
            "webrtc-answer",
            (data) => {
                try {
                    const roomName =
                        socket.data.roomName;

                    if (!roomName) {
                        socket.emit(
                            "signaling-error",
                            {
                                message:
                                    "You are not in a consultation room",
                            }
                        );

                        return;
                    }

                    console.log(
                        "WebRTC answer received:",
                        socket.id,
                        roomName
                    );

                    socket.to(
                        roomName
                    ).emit(
                        "webrtc-answer",
                        {
                            from:
                                socket.id,

                            answer:
                                data?.answer,
                        }
                    );

                } catch (error) {
                    console.error(
                        "WebRTC answer error:",
                        error.message
                    );
                }
            }
        );

        // =================================================
        // ICE CANDIDATE
        // =================================================

        socket.on(
            "webrtc-ice-candidate",
            (data) => {
                try {
                    const roomName =
                        socket.data.roomName;

                    if (!roomName) {
                        socket.emit(
                            "signaling-error",
                            {
                                message:
                                    "You are not in a consultation room",
                            }
                        );

                        return;
                    }

                    console.log(
                        "ICE candidate received:",
                        socket.id,
                        roomName
                    );

                    socket.to(
                        roomName
                    ).emit(
                        "webrtc-ice-candidate",
                        {
                            from:
                                socket.id,

                            candidate:
                                data?.candidate,
                        }
                    );

                } catch (error) {
                    console.error(
                        "ICE candidate error:",
                        error.message
                    );
                }
            }
        );

        // =================================================
        // LEAVE CONSULTATION
        // =================================================

        socket.on(
            "leave-consultation",
            () => {
                removeSocketFromConsultation(
                    socket
                );
            }
        );

        // =================================================
        // DISCONNECT
        // =================================================

        socket.on(
            "disconnect",
            (reason) => {
                removeSocketFromConsultation(
                    socket
                );

                console.log(
                    "WebRTC signaling client disconnected:",
                    socket.id,
                    reason
                );
            }
        );
    }
);

// =====================================================
// REMOVE SOCKET FROM CONSULTATION
// =====================================================

function removeSocketFromConsultation(
    socket
) {
    const roomName =
        socket.data?.roomName;

    if (!roomName) {
        return;
    }

    const participants =
        socketRooms.get(
            roomName
        );

    if (participants) {
        participants.delete(
            socket.id
        );

        socket.to(
            roomName
        ).emit(
            "participant-left",
            {
                socketId:
                    socket.id,
            }
        );

        if (
            participants.size === 0
        ) {
            socketRooms.delete(
                roomName
            );
        }
    }

    socket.leave(
        roomName
    );

    socket.data.roomName =
        null;

    socket.data.appointmentId =
        null;

    socket.data.userId =
        null;

    socket.data.role =
        null;

    console.log(
        `Socket ${socket.id} left ${roomName}`
    );
}

// =====================================================
// START SERVER
// =====================================================

server.listen(
    PORT,
    () => {
        console.log(
            "================================="
        );

        console.log(
            "NYAYA AI SECURE BACKEND"
        );

        console.log(
            "================================="
        );

        console.log(
            `Server running on http://localhost:${PORT}`
        );

        console.log(
            `Frontend origin: ${FRONTEND_URL}`
        );


        console.log(
            `Auth API: http://localhost:${PORT}/api/auth`
        );

        console.log(
            `Profile API: http://localhost:${PORT}/api/profile`
        );

        console.log(
            `Cases API: http://localhost:${PORT}/api/cases`
        );

        console.log(
            `Lawyers API: http://localhost:${PORT}/api/lawyers`
        );

        console.log(
            `Chat API: http://localhost:${PORT}/api/chat`
        );

        console.log(
            `Notifications API: http://localhost:${PORT}/api/notifications`
        );

        console.log(
            `Appointments API: http://localhost:${PORT}/api/appointments`
        );

        console.log(
            `Availability API: http://localhost:${PORT}/api/availability`
        );

        console.log(
            `Meetings API: http://localhost:${PORT}/api/meetings`
        );

        console.log(
            `Signaling API: http://localhost:${PORT}/api/signaling`
        );
console.log(
    `Research API: http://localhost:${PORT}/api/research`
);
        console.log(
            `Socket.IO: http://localhost:${PORT}`
        );

        console.log(
            "Security: Helmet enabled"
        );

        console.log(
            "Security: Rate limiting enabled"
        );

        console.log(
            "Security: JWT environment secret enabled"
        );

        console.log(
            "================================="
        );
    }
);