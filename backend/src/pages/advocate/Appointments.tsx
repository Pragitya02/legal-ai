import { useState } from 'react'
import { Video, MapPin, Check, X, Calendar } from 'lucide-react'

interface Appt { id: string; name: string; initials: string; type: string; time: string; mode: string; fee: number; status: 'confirmed' | 'pending' | 'declined'; color: string }

const seed: Appt[] = [
  { id: '1', name: 'Gaurav Mehta', initials: 'GM', type: 'Property Dispute', time: '10 Aug, 3:00 PM', mode: 'Video', fee: 1500, status: 'confirmed', color: '#2563EB' },
  { id: '2', name: 'Sneha Patel', initials: 'SP', type: 'Consumer Complaint', time: '11 Aug, 11:00 AM', mode: 'In-Person', fee: 1500, status: 'confirmed', color: '#7C3AED' },
  { id: '3', name: 'Rajan Gupta', initials: 'RG', type: 'Labour Dispute', time: '12 Aug, 2:00 PM', mode: 'Video', fee: 1500, status: 'pending', color: '#F59E0B' },
  { id: '4', name: 'Meera Iyer', initials: 'MI', type: 'Divorce Mediation', time: '14 Aug, 4:00 PM', mode: 'In-Person', fee: 1500, status: 'confirmed', color: '#059669' },
  { id: '5', name: 'Vikram Singh', initials: 'VS', type: 'Criminal Bail Application', time: '16 Aug, 10:00 AM', mode: 'Video', fee: 2000, status: 'pending', color: '#EF4444' },
]

export default function Appointments() {
  const [appts, setAppts] = useState<Appt[]>(seed)
  const [filter, setFilter] = useState<'All' | 'confirmed' | 'pending'>('All')

  const respond = (id: string, status: 'confirmed' | 'declined') =>
    setAppts(prev => prev.map(a => a.id === id ? { ...a, status } : a))

  const visible = appts.filter(a => a.status !== 'declined' && (filter === 'All' || a.status === filter))

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>Appointments</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 2 }}>
          {appts.filter(a => a.status === 'confirmed').length} confirmed · {appts.filter(a => a.status === 'pending').length} pending
        </p>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {(['All', 'confirmed', 'pending'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
            border: '1px solid var(--border)', textTransform: 'capitalize',
            background: filter === f ? 'var(--emerald)' : 'var(--bg-secondary)',
            color: filter === f ? 'white' : 'var(--text-muted)',
          }}>{f}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visible.map(a => (
          <div key={a.id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div className="avatar" style={{ width: 42, height: 42, fontSize: '0.85rem', background: `linear-gradient(135deg, ${a.color}, ${a.color}88)` }}>
              {a.initials}
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>{a.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{a.type}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <Calendar size={13} /> {a.time}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {a.mode === 'Video' ? <Video size={13} /> : <MapPin size={13} />} {a.mode}
            </div>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.85rem' }}>₹{a.fee.toLocaleString()}</div>
            {a.status === 'pending' ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => respond(a.id, 'declined')} style={{
                  padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontWeight: 600,
                }}><X size={13} /> Decline</button>
                <button onClick={() => respond(a.id, 'confirmed')} className="btn-emerald" style={{
                  padding: '7px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontWeight: 600,
                }}><Check size={13} /> Confirm</button>
              </div>
            ) : (
              <span className="badge" style={{ background: 'var(--emerald-subtle)', color: 'var(--emerald)' }}>Confirmed</span>
            )}
          </div>
        ))}
        {visible.length === 0 && (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No appointments in this view.
          </div>
        )}
      </div>
    </div>
  )
}
