import { useState } from 'react'
import { useLocation } from 'react-router'
import { Bell, MessageSquare, Calendar, FileText, Users, CheckCircle } from 'lucide-react'

interface Notif { id: string; icon: typeof Bell; title: string; desc: string; time: string; read: boolean; color: string }

const citizenSeed: Notif[] = [
  { id: '1', icon: MessageSquare, title: 'AI Assistant replied to your query', desc: 'Legal guidance ready for your security deposit case', time: '10 min ago', read: false, color: 'var(--blue)' },
  { id: '2', icon: Calendar, title: 'Appointment confirmed', desc: 'Adv. Kavita Srinivasan · 10 Aug, 3:00 PM', time: '2 hours ago', read: false, color: 'var(--emerald)' },
  { id: '3', icon: FileText, title: 'Document analysis complete', desc: 'Your rental agreement has been reviewed', time: '1 day ago', read: true, color: '#7C3AED' },
  { id: '4', icon: Users, title: 'Advocate accepted your request', desc: 'Adv. Aman Joshi will contact you shortly', time: '3 days ago', read: true, color: '#F59E0B' },
]

const advocateSeed: Notif[] = [
  { id: '1', icon: Users, title: 'New client request', desc: 'Priya Nair — Property Law consultation', time: '2 hours ago', read: false, color: 'var(--blue)' },
  { id: '2', icon: Calendar, title: 'Upcoming appointment reminder', desc: 'Gaurav Mehta · Tomorrow, 3:00 PM', time: '5 hours ago', read: false, color: 'var(--emerald)' },
  { id: '3', icon: FileText, title: 'Client uploaded a document', desc: 'Rajan Gupta shared a labour contract for review', time: '1 day ago', read: true, color: '#7C3AED' },
  { id: '4', icon: CheckCircle, title: 'Payment received', desc: '₹1,500 from Sneha Patel', time: '2 days ago', read: true, color: '#F59E0B' },
]

export default function Notifications() {
  const location = useLocation()
  const isAdvocate = location.pathname.startsWith('/advocate')
  const [items, setItems] = useState<Notif[]>(isAdvocate ? advocateSeed : citizenSeed)

  const markAllRead = () => setItems(prev => prev.map(n => ({ ...n, read: true })))
  const markRead = (id: string) => setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))

  const unread = items.filter(n => !n.read).length

  return (
    <div className="page-enter" style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>Notifications</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 2 }}>{unread} unread</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} style={{
            fontSize: '0.8rem', color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600,
          }}>Mark all as read</button>
        )}
      </div>

      <div className="card" style={{ padding: 8 }}>
        {items.map((n, i) => (
          <div key={n.id} onClick={() => markRead(n.id)} style={{
            display: 'flex', gap: 12, padding: '14px', cursor: 'pointer',
            borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
            background: n.read ? 'transparent' : 'var(--blue-subtle)', borderRadius: 8,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: `color-mix(in srgb, ${n.color} 12%, transparent)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <n.icon size={16} style={{ color: n.color }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.85rem' }}>{n.title}</div>
                {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue)', flexShrink: 0 }} />}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{n.desc}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: 4 }}>{n.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
