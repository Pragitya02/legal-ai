import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { collabFetch, API_ORIGIN, STATUS_LABEL } from '../../lib/collabApi'

interface Item {
  case_id: number
  title: string
  category: string
  case_status: string
  created_at: string
  last_activity: string
  collaboration_id: number | null
  collaboration_status: string | null
  advocate_name: string | null
  advocate_id: number | null
  unread_count: number
}

const FILTERS = ['All Cases', 'Active', 'Pending Requests', 'Completed'] as const
const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString() : '—')

export default function CaseCollaborationsPanel() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState<Item[]>([])
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All Cases')
  const [error, setError] = useState('')
  const [advocateId, setAdvocateId] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      setItems((await collabFetch<{ items: Item[] }>('/my-cases')).items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load collaborations.')
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Arrive from the post-feedback popup.
  useEffect(() => {
    const a = Number(params.get('shareAdvocate'))
    if (a > 0) setAdvocateId(a)
  }, [params])

  const closeShare = () => {
    setAdvocateId(null)
    params.delete('shareAdvocate')
    params.delete('appointmentId')
    setParams(params, { replace: true })
  }

  const shown = items.filter((i) => {
    const s = i.collaboration_status
    if (filter === 'Active') return s === 'active'
    if (filter === 'Pending Requests') return s === 'pending'
    if (filter === 'Completed') return s === 'ended_by_user' || i.case_status === 'closed' || i.case_status === 'resolved'
    return true
  })

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold" style={{ color: 'var(--text)' }}>Advocate collaboration</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className="rounded-full border px-3 py-1 text-xs"
            style={{ borderColor: 'var(--border)', color: filter === f ? '#E3A15F' : 'var(--text-muted)' }}>
            {f}
          </button>
        ))}
      </div>
      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {shown.map((i) => (
          <div key={`${i.case_id}-${i.collaboration_id}`} className="rounded-xl border p-4"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            <div className="flex justify-between gap-2">
              <div className="font-medium" style={{ color: 'var(--text)' }}>{i.title}</div>
              {i.unread_count > 0 && <span className="rounded-full bg-[#C27635] px-2 text-xs text-white">{i.unread_count}</span>}
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Case #{i.case_id} · {i.category} · Advocate: {i.advocate_name || 'Not shared'}
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              {i.collaboration_status ? STATUS_LABEL[i.collaboration_status] : 'Not shared'} · Created {fmt(i.created_at)} · Last activity {fmt(i.last_activity)}
            </div>
            {i.collaboration_id && i.collaboration_status !== 'declined' && (
              <button className="mt-3 text-sm text-[#E3A15F]" onClick={() => navigate(`/dashboard/collaborations/${i.collaboration_id}`)}>
                Open workspace
              </button>
            )}
          </div>
        ))}
        {!shown.length && !error && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nothing here yet.</p>}
      </div>
      {advocateId && <ShareDialog advocateId={advocateId} items={items} onClose={closeShare} onDone={() => { closeShare(); load() }} />}
    </section>
  )
}

function ShareDialog({ advocateId, items, onClose, onDone }: {
  advocateId: number; items: Item[]; onClose: () => void; onDone: () => void
}) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [caseId, setCaseId] = useState<number | null>(null)
  const [form, setForm] = useState({ title: '', category: '', description: '', incidentDate: '', court: '' })
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Unique cases not already shared (pending/active) with this advocate.
  const blocked = new Set(items.filter((i) => i.advocate_id === advocateId && ['pending', 'active'].includes(i.collaboration_status || '')).map((i) => i.case_id))
  const options = Array.from(new Map(items.map((i) => [i.case_id, i])).values()).filter((i) => !blocked.has(i.case_id))

  async function createCase(): Promise<number> {
    const extra = [form.incidentDate && `Incident date: ${form.incidentDate}`, form.court && `Court/jurisdiction: ${form.court}`].filter(Boolean).join('\n')
    const res = await fetch(`${API_ORIGIN}/api/cases`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: form.title, category: form.category, description: [form.description.trim(), extra].filter(Boolean).join('\n\n') }),
    })
    const data = await res.json()
    if (!res.ok || !data?.success) throw new Error(data?.message || 'Unable to create case.')
    return data.caseId
  }

  async function run(share: boolean) {
    if (busy) return // blocks double-clicks
    setBusy(true); setError('')
    try {
      let id = caseId
      if (mode === 'new') {
        id = await createCase()
        // If sharing fails below, a retry reuses this case instead of creating a duplicate.
        setCaseId(id); setMode('existing')
      }
      if (!id) throw new Error('Select a case.')
      if (share) await collabFetch(`/cases/${id}/share`, { method: 'POST', body: { advocateId } })
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  const valid = mode === 'existing' ? !!caseId : form.title.trim() && form.description.trim()
  const input = 'w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-gray-950 p-6 text-white">
        {confirming ? (
          <>
            <h3 className="text-lg font-semibold">Share this case?</h3>
            <p className="mt-3 text-sm text-gray-400">
              The advocate will receive a request. Only after they accept will they be able to view this case&apos;s details and message you. You remain the owner and can end the collaboration at any time.
            </p>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            <div className="mt-5 flex gap-3">
              <button disabled={busy} onClick={() => run(true)} className="btn-primary flex-1 rounded-lg px-4 py-2 text-sm">{busy ? 'Sharing…' : 'Confirm & Share'}</button>
              <button disabled={busy} onClick={() => setConfirming(false)} className="flex-1 rounded-lg border border-white/15 px-4 py-2 text-sm">Back</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold">Share a case with your advocate</h3>
            <div className="mt-3 flex gap-2 text-sm">
              {(['existing', 'new'] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} className="rounded-full border px-3 py-1" style={{ borderColor: mode === m ? '#E3A15F' : 'rgba(255,255,255,.15)' }}>
                  {m === 'existing' ? 'Select existing case' : 'Create new case'}
                </button>
              ))}
            </div>
            {mode === 'existing' ? (
              <div className="mt-4 space-y-2">
                {options.map((o) => (
                  <label key={o.case_id} className="flex items-center gap-2 rounded-lg border border-white/10 p-3 text-sm">
                    <input type="radio" name="case" checked={caseId === o.case_id} onChange={() => setCaseId(o.case_id)} />
                    {o.title} <span className="text-gray-500">#{o.case_id}</span>
                  </label>
                ))}
                {!options.length && <p className="text-sm text-gray-400">No available cases. Create a new one.</p>}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <input className={input} placeholder="Case title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <input className={input} placeholder="Category (e.g. Property)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                <textarea className={input} rows={4} placeholder="Case description *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <input className={input} type="date" value={form.incidentDate} onChange={(e) => setForm({ ...form, incidentDate: e.target.value })} />
                <input className={input} placeholder="Court or jurisdiction (optional)" value={form.court} onChange={(e) => setForm({ ...form, court: e.target.value })} />
              </div>
            )}
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              <button disabled={!valid || busy} onClick={() => setConfirming(true)} className="btn-primary rounded-lg px-4 py-2 text-sm disabled:opacity-50">
                {mode === 'new' ? 'Create & Share' : 'Share'}
              </button>
              {mode === 'new' && (
                <button disabled={!valid || busy} onClick={() => run(false)} className="rounded-lg border border-white/15 px-4 py-2 text-sm disabled:opacity-50">Save draft</button>
              )}
              <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-400">Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
