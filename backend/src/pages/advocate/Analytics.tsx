import { Star, Users, Clock, Target } from 'lucide-react'

const caseTypes = [
  { label: 'Property Law', pct: 38, color: '#2563EB' },
  { label: 'Employment Law', pct: 24, color: '#7C3AED' },
  { label: 'Consumer Law', pct: 18, color: '#059669' },
  { label: 'Family Law', pct: 12, color: '#F59E0B' },
  { label: 'Other', pct: 8, color: '#94A3B8' },
]

const ratingBreakdown = [
  { stars: 5, pct: 78 }, { stars: 4, pct: 15 }, { stars: 3, pct: 5 }, { stars: 2, pct: 1 }, { stars: 1, pct: 1 },
]

export default function Analytics() {
  return (
    <div className="page-enter">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>Analytics</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 2 }}>Your practice performance at a glance</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }} className="an-stats">
        {[
          { icon: Users, val: '312', lbl: 'Total Cases Handled', color: 'var(--blue)' },
          { icon: Target, val: '89%', lbl: 'Success Rate', color: 'var(--emerald)' },
          { icon: Clock, val: '2.4hrs', lbl: 'Avg. Response Time', color: '#F59E0B' },
          { icon: Star, val: '4.9', lbl: 'Average Rating', color: '#EC4899' },
        ].map(s => (
          <div key={s.lbl} className="card" style={{ padding: 18 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, marginBottom: 12,
              background: `color-mix(in srgb, ${s.color} 12%, transparent)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>{s.val}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="an-grid">
        <div className="card" style={{ padding: 22 }}>
          <h2 style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem', marginBottom: 18 }}>Cases by Practice Area</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {caseTypes.map(c => (
              <div key={c.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>{c.label}</span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{c.pct}%</span>
                </div>
                <div style={{ height: 7, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${c.pct}%`, borderRadius: 4, background: c.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <h2 style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem', marginBottom: 18 }}>Rating Breakdown · 218 reviews</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ratingBreakdown.map(r => (
              <div key={r.stars} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', width: 34, display: 'flex', alignItems: 'center', gap: 2 }}>
                  {r.stars} <Star size={11} fill="#F59E0B" style={{ color: '#F59E0B' }} />
                </span>
                <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${r.pct}%`, borderRadius: 4, background: '#F59E0B' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: 30, textAlign: 'right' }}>{r.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { .an-stats { grid-template-columns: 1fr 1fr !important; } .an-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
