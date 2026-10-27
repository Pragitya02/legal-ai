import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { collabFetch, STATUS_LABEL } from '../lib/collabApi'

interface Detail {
  viewer: 'owner' | 'advocate'
  collaboration: { id: number; status: string; canWrite: boolean }
  case: { id: number; title: string; category: string; status: string; description: string | null; severity: string | null }
  owner: { name: string }
  advocate: { name: string }
}
interface Msg { id: number; body: string; created_at: string; sender_name: string; mine: boolean }
interface Act { id: number; action: string; description: string; actor: string | null; created_at: string }

const TABS = ['Overview', 'Documents', 'Messages', 'Activity History'] as const
const REPORT_CATS: [string, string][] = [
  ['unprofessional_behaviour', 'Unprofessional behaviour'], ['fraud_or_impersonation', 'Suspected fraud or impersonation'],
  ['inappropriate_communication', 'Inappropriate communication'], ['misuse_of_confidential_information', 'Misuse of confidential information'],
  ['unauthorized_case_changes', 'Unauthorized case changes'], ['improper_payment_request', 'Improper payment request'], ['other', 'Other concern'],
]
const box = 'w-full rounded-lg border px-3 py-2 text-sm'
const boxStyle = { borderColor: 'var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)' }

export default function CollaborationWorkspace() {
  const { id } = useParams()
  const [d, setD] = useState<Detail | null>(null)
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview')
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState<'end' | 'report' | null>(null)

  const load = useCallback(async () => {
    try { setD(await collabFetch<Detail>(`/collaborations/${id}`)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to open this case.') }
  }, [id])
  useEffect(() => { load() }, [load])

  if (error) return <p className="p-6 text-red-400">{error}</p>
  if (!d) return <p className="p-6" style={{ color: 'var(--text-muted)' }}>Loading…</p>

  const owner = d.viewer === 'owner'
  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>{d.case.title}</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Case #{d.case.id} · {STATUS_LABEL[d.collaboration.status] || d.collaboration.status} · {owner ? `Advocate: ${d.advocate.name}` : `Client: ${d.owner.name}`}
          </p>
        </div>
        {owner && (
          <div className="flex gap-2">
            {d.collaboration.status === 'active' && <button onClick={() => setDialog('end')} className="rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>End Collaboration</button>}
            <button onClick={() => setDialog('report')} className="rounded-lg border px-3 py-1.5 text-sm text-red-300" style={{ borderColor: 'var(--border)' }}>Report Advocate</button>
          </div>
        )}
      </div>
      <div className="mb-4 flex gap-4 border-b" style={{ borderColor: 'var(--border)' }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className="pb-2 text-sm" style={{ color: tab === t ? '#E3A15F' : 'var(--text-muted)', borderBottom: tab === t ? '2px solid #E3A15F' : 'none' }}>{t}</button>
        ))}
      </div>
      {tab === 'Overview' && <Overview d={d} onSaved={load} />}
      {tab === 'Documents' && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Case-level document sharing is not yet connected to this workspace. Existing document sharing continues to work from the Documents page.</p>}
      {tab === 'Messages' && <Messages id={d.collaboration.id} />}
      {tab === 'Activity History' && <Activity id={d.collaboration.id} />}
      {dialog === 'end' && <EndDialog id={d.collaboration.id} onClose={() => setDialog(null)} onDone={() => { setDialog(null); load() }} />}
      {dialog === 'report' && <ReportDialog id={d.collaboration.id} onClose={() => setDialog(null)} />}
    </div>
  )
}

function Overview({ d, onSaved }: { d: Detail; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [desc, setDesc] = useState(d.case.description || '')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const canEdit = d.viewer === 'advocate' && d.collaboration.canWrite

  async function save() {
    if (busy) return
    if (note.trim().length < 10) { setErr('Please describe what you changed (at least 10 characters).'); return }
    setBusy(true); setErr('')
    try {
      await collabFetch(`/collaborations/${d.collaboration.id}/case`, { method: 'PATCH', body: { changes: { description: desc }, changeDescription: note } })
      setEditing(false); setNote(''); onSaved()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Save failed.') } finally { setBusy(false) }
  }

  return (
    <div className="space-y-3 text-sm" style={{ color: 'var(--text)' }}>
      <div>Category: {d.case.category} · Severity: {d.case.severity ?? '—'} · Case status: {d.case.status}</div>
      {d.case.description === null ? <p style={{ color: 'var(--text-muted)' }}>Details are not available for this collaboration state.</p> : editing ? (
        <>
          <textarea className={box} style={boxStyle} rows={8} value={desc} onChange={(e) => setDesc(e.target.value)} />
          <textarea className={box} style={boxStyle} rows={2} placeholder="Required: describe what you changed and why" value={note} onChange={(e) => setNote(e.target.value)} />
          {err && <p className="text-red-400">{err}</p>}
          <div className="flex gap-2">
            <button disabled={busy} onClick={save} className="btn-primary rounded-lg px-4 py-2">Save update</button>
            <button onClick={() => setEditing(false)} className="rounded-lg px-4 py-2" style={{ color: 'var(--text-muted)' }}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <p className="whitespace-pre-wrap">{d.case.description}</p>
          {canEdit && <button onClick={() => setEditing(true)} className="text-[#E3A15F]">Edit case summary</button>}
        </>
      )}
    </div>
  )
}

function Messages({ id }: { id: number }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [readOnly, setReadOnly] = useState(false)
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [sending, setSending] = useState(false)
  const last = useRef(0)
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let stop = false
    const poll = async () => {
      try {
        const r = await collabFetch<{ items: Msg[]; readOnly: boolean }>(`/collaborations/${id}/messages?after=${last.current}`)
        if (stop) return
        setReadOnly(r.readOnly)
        if (r.items.length) { last.current = r.items[r.items.length - 1].id; setMsgs((m) => [...m, ...r.items]) }
      } catch (e) { if (!stop) setErr(e instanceof Error ? e.message : 'Unable to load messages.') }
    }
    poll()
    const t = setInterval(poll, 5000)
    return () => { stop = true; clearInterval(t) }
  }, [id])
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  async function send() {
    if (!text.trim() || sending) return
    setSending(true); setErr('')
    try { await collabFetch(`/collaborations/${id}/messages`, { method: 'POST', body: { body: text } }); setText('') }
    catch (e) { setErr(e instanceof Error ? e.message : 'Send failed.') } finally { setSending(false) }
  }

  return (
    <div>
      <div className="h-96 space-y-2 overflow-y-auto rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[75%] rounded-2xl px-3 py-2 text-sm" style={{ background: m.mine ? '#8F5428' : 'rgba(255,255,255,.08)', color: m.mine ? '#fff' : 'var(--text)' }}>
              <div className="text-xs opacity-70">{m.sender_name} · {new Date(m.created_at).toLocaleString()}</div>
              <div className="whitespace-pre-wrap">{m.body}</div>
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
      {readOnly ? <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>This conversation is read-only.</p> : (
        <div className="mt-2 flex gap-2">
          <input className={box} style={boxStyle} value={text} maxLength={4000} placeholder="Type a message" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
          <button onClick={send} disabled={sending} className="btn-primary rounded-lg px-4 text-sm">Send</button>
        </div>
      )}
    </div>
  )
}

function Activity({ id }: { id: number }) {
  const [rows, setRows] = useState<Act[]>([])
  const [err, setErr] = useState('')
  useEffect(() => {
    collabFetch<{ items: Act[] }>(`/collaborations/${id}/activity`).then((r) => setRows(r.items)).catch((e) => setErr(e.message))
  }, [id])
  return (
    <div className="space-y-2 text-sm" style={{ color: 'var(--text)' }}>
      {err && <p className="text-red-400">{err}</p>}
      {rows.map((r) => (
        <div key={r.id} className="rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleString()} · {r.actor || 'System'} · {r.action}</div>
          <div>{r.description}</div>
        </div>
      ))}
    </div>
  )
}

function Modal({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-950 p-6 text-white">{children}</div></div>
}

function EndDialog({ id, onClose, onDone }: { id: number; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  async function go() {
    if (busy) return
    setBusy(true)
    try { await collabFetch(`/collaborations/${id}/end`, { method: 'POST' }); onDone() }
    catch (e) { setErr(e instanceof Error ? e.message : 'Failed.'); setBusy(false) }
  }
  return (
    <Modal>
      <h3 className="text-lg font-semibold">End collaboration?</h3>
      <p className="mt-3 text-sm text-gray-400">The advocate will lose the ability to edit this case or send messages. The conversation becomes read-only. Your case, messages and history are kept. This does not mean your legal matter has concluded.</p>
      {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
      <div className="mt-5 flex gap-3">
        <button disabled={busy} onClick={go} className="btn-primary flex-1 rounded-lg px-4 py-2 text-sm">End Collaboration</button>
        <button onClick={onClose} className="flex-1 rounded-lg border border-white/15 px-4 py-2 text-sm">Cancel</button>
      </div>
    </Modal>
  )
}

function ReportDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [evidenceNote, setEvidenceNote] = useState('')
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  async function go() {
    if (busy) return
    setBusy(true); setErr('')
    try { setCode((await collabFetch<{ reportCode: string }>(`/collaborations/${id}/report`, { method: 'POST', body: { category, description, evidenceNote } })).reportCode) }
    catch (e) { setErr(e instanceof Error ? e.message : 'Failed.') } finally { setBusy(false) }
  }
  const input = 'w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white'
  return (
    <Modal>
      <h3 className="text-lg font-semibold">Report Advocate</h3>
      {code ? (
        <>
          <p className="mt-3 text-sm text-gray-300">Report {code} submitted. It will be reviewed by our team; a report is an allegation, not a finding.</p>
          <button onClick={onClose} className="btn-primary mt-4 rounded-lg px-4 py-2 text-sm">Close</button>
        </>
      ) : (
        <div className="mt-3 space-y-3">
          <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Select category</option>
            {REPORT_CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <textarea className={input} rows={4} placeholder="Describe the incident (min 20 characters)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <textarea className={input} rows={2} placeholder="Supporting evidence — describe or reference (optional)" value={evidenceNote} onChange={(e) => setEvidenceNote(e.target.value)} />
          {err && <p className="text-sm text-red-400">{err}</p>}
          <div className="flex gap-3">
            <button disabled={busy || !category} onClick={go} className="btn-primary flex-1 rounded-lg px-4 py-2 text-sm">Submit report</button>
            <button onClick={onClose} className="flex-1 rounded-lg border border-white/15 px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}
    </Modal>
  )
}
