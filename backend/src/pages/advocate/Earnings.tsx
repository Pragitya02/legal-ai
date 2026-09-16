import { DollarSign, TrendingUp, Download, Clock } from 'lucide-react'

const monthlyRevenue = [
  { month: 'Feb', amount: 42000, cases: 14 },
  { month: 'Mar', amount: 38000, cases: 12 },
  { month: 'Apr', amount: 55000, cases: 18 },
  { month: 'May', amount: 49000, cases: 16 },
  { month: 'Jun', amount: 62000, cases: 21 },
  { month: 'Jul', amount: 58000, cases: 19 },
]
const maxRevenue = Math.max(...monthlyRevenue.map(m => m.amount))

const transactions = [
  { client: 'Gaurav Mehta', desc: 'Property consultation', date: '30 Jul 2026', amount: 1500, status: 'Paid' },
  { client: 'Sneha Patel', desc: 'Consumer complaint review', date: '28 Jul 2026', amount: 1500, status: 'Paid' },
  { client: 'Meera Iyer', desc: 'Divorce mediation session', date: '25 Jul 2026', amount: 1800, status: 'Paid' },
  { client: 'Vikram Singh', desc: 'Criminal bail consultation', date: '22 Jul 2026', amount: 2000, status: 'Pending' },
  { client: 'Rajan Gupta', desc: 'Labour dispute follow-up', date: '18 Jul 2026', amount: 1500, status: 'Paid' },
]

export default function Earnings() {
  const total = monthlyRevenue.reduce((s, m) => s + m.amount, 0)
  const thisMonth = monthlyRevenue[monthlyRevenue.length - 1]
  const lastMonth = monthlyRevenue[monthlyRevenue.length - 2]
  const growth = (((thisMonth.amount - lastMonth.amount) / lastMonth.amount) * 100).toFixed(1)

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>Earnings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 2 }}>Track your revenue and payouts</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }} className="earn-stats">
        {[
          { icon: DollarSign, val: `₹${thisMonth.amount.toLocaleString()}`, lbl: 'This Month', color: 'var(--emerald)' },
          { icon: TrendingUp, val: `+${growth}%`, lbl: 'vs Last Month', color: 'var(--blue)' },
          { icon: Clock, val: `₹${transactions.filter(t => t.status === 'Pending').reduce((s, t) => s + t.amount, 0).toLocaleString()}`, lbl: 'Pending Payout', color: '#F59E0B' },
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

      <div className="card" style={{ padding: 22, marginBottom: 20 }}>
        <h2 style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem', marginBottom: 18 }}>Revenue Trend (6 months) · ₹{total.toLocaleString()} total</h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 140 }}>
          {monthlyRevenue.map(m => (
            <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>₹{(m.amount / 1000).toFixed(0)}K</div>
              <div style={{
                width: '100%', borderRadius: '6px 6px 0 0',
                height: `${(m.amount / maxRevenue) * 100}px`,
                background: 'linear-gradient(180deg, var(--emerald), var(--emerald-dark))',
              }} />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{m.month}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px' }}>
          <h2 style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>Recent Transactions</h2>
          <button style={{
            fontSize: '0.78rem', fontWeight: 600, color: 'var(--blue)', background: 'none',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          }}><Download size={13} /> Export</button>
        </div>
        {transactions.map((t, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            borderTop: '1px solid var(--border)',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.84rem' }}>{t.client}</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 1 }}>{t.desc} · {t.date}</div>
            </div>
            <span className="badge" style={{
              background: t.status === 'Paid' ? 'var(--emerald-subtle)' : 'rgba(245,158,11,0.1)',
              color: t.status === 'Paid' ? 'var(--emerald)' : '#F59E0B',
            }}>{t.status}</span>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.85rem', minWidth: 70, textAlign: 'right' }}>₹{t.amount.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <style>{`@media (max-width: 700px) { .earn-stats { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
