import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { collabFetch } from '../lib/collabApi'

interface Row {
  collaboration_id: number
  case_id: number
  collaboration_status: string
  shared_at: string
  title: string
  category: string
  client_name: string
  last_activity: string
  unread_count: number
}

const fmt = (d?: string) => (d ? new Date(d).toLocaleString() : '—')

export default function AdvocateCases() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    try { setRows((await collabFetch<{ items: Row[] }>('/my-cases')).items) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load cases.') }
  }, [])
  useEffect(() => { load() }, [load])

  async function respond(id: number, decision: 'accept' | 'decline') {
    if (busyId) return
    setBusyId(id); setError('')
    try { await collabFetch(`/collaborations/${id}/respond`, { method: 'PATCH', body: { decision } }); await load() }
    catch (e) { setError(e instanceof Error ? e.message : 'Action failed.') }
    finally { setBusyId(null) }
  }

  const sections: [string, Row[]][] = [
    ['Pending Requests', rows.filter((r) => r.collaboration_status === 'pending')],
    ['Active Cases', rows.filter((r) => r.collaboration_status === 'active')],
    ['Completed Collaborations', rows.filter((r) => r.collaboration_status === 'ended_by_user')],
  ]

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold" style={{ color: 'var(--text)' }}>My Cases</h1>
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      {sections.map(([label, list]) => (
        <section key={label} className="mb-8">
          <h2 className="mb-3 text-lg font-medium" style={{ color: 'var(--text)' }}>{label} ({list.length})</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {list.map((r) => (
              <div key={r.collaboration_id} className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                <div className="flex justify-between">
                  <span className="font-medium" style={{ color: 'var(--text)' }}>{r.title}</span>
                  {r.unread_count > 0 && <span className="rounded-full bg-[#C27635] px-2 text-xs text-white">{r.unread_count}</span>}
                </div>
                <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Case #{r.case_id} · {r.category} · Client: {r.client_name}
                </div>
                <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Shared {fmt(r.shared_at)} · Last activity {fmt(r.last_activity)}
                </div>
                {r.collaboration_status === 'pending' ? (
                  <div className="mt-3 flex gap-2">
                    <button disabled={busyId === r.collaboration_id} onClick={() => respond(r.collaboration_id, 'accept')} className="btn-primary rounded-lg px-3 py-1.5 text-sm">Accept</button>
                    <button disabled={busyId === r.collaboration_id} onClick={() => respond(r.collaboration_id, 'decline')} className="rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>Decline</button>
                  </div>
                ) : (
                  <button className="mt-3 text-sm text-[#E3A15F]" onClick={() => navigate(`/advocate/collaborations/${r.collaboration_id}`)}>Open workspace</button>
                )}
              </div>
            ))}
            {!list.length && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>None.</p>}
          </div>
        </section>
      ))}
    </div>
  )
}
