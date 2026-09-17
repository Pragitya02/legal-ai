import { DollarSign, TrendingUp, Clock3, Download } from 'lucide-react'
import { Link } from 'react-router'

type RevenueItem = {
  month: string
  amount: number
  cases: number
}

type Transaction = {
  client: string
  desc: string
  date: string
  amount: number
  status: 'Paid' | 'Pending'
}

const revenueData: RevenueItem[] = [
  { month: 'Feb', amount: 42000, cases: 14 },
  { month: 'Mar', amount: 38000, cases: 12 },
  { month: 'Apr', amount: 55000, cases: 18 },
  { month: 'May', amount: 49000, cases: 16 },
  { month: 'Jun', amount: 62000, cases: 21 },
  { month: 'Jul', amount: 58000, cases: 19 },
]

const transactions: Transaction[] = [
  {
    client: 'Gaurav Mehta',
    desc: 'Property consultation',
    date: '30 Jul 2026',
    amount: 1500,
    status: 'Paid',
  },
  {
    client: 'Sneha Patel',
    desc: 'Consumer complaint review',
    date: '28 Jul 2026',
    amount: 1500,
    status: 'Paid',
  },
  {
    client: 'Meera Iyer',
    desc: 'Divorce mediation session',
    date: '25 Jul 2026',
    amount: 1800,
    status: 'Paid',
  },
  {
    client: 'Vikram Singh',
    desc: 'Criminal bail consultation',
    date: '22 Jul 2026',
    amount: 2000,
    status: 'Pending',
  },
  {
    client: 'Rajan Gupta',
    desc: 'Labour dispute follow-up',
    date: '18 Jul 2026',
    amount: 1500,
    status: 'Paid',
  },
]

export default function Earnings() {
  const totalRevenue = revenueData.reduce(
    (total, item) => total + item.amount,
    0
  )

  const currentMonth =
    revenueData[revenueData.length - 1]

  const previousMonth =
    revenueData[revenueData.length - 2]

  const percentageChange =
    previousMonth.amount > 0
      ? (
          ((currentMonth.amount - previousMonth.amount) /
            previousMonth.amount) *
          100
        ).toFixed(1)
      : '0.0'

  const pendingPayout = transactions
    .filter((item) => item.status === 'Pending')
    .reduce((total, item) => total + item.amount, 0)

  const maxRevenue = Math.max(
    ...revenueData.map((item) => item.amount)
  )

  return (
    <div
      className="page-enter"
      style={{
        width: '100%',
        maxWidth: 1400,
        margin: '0 auto',
      }}
    >
      {/* BACK BUTTON */}
      <div
        style={{
          marginBottom: 22,
        }}
      >
        <Link
          to="/advocate"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid rgba(212,175,55,0.45)',
            background: 'rgba(212,175,55,0.04)',
            color: '#D4AF37',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 700,
          }}
        >
          ← Back
        </Link>
      </div>

      {/* HEADER */}
      <div
        style={{
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '-0.03em',
            margin: 0,
          }}
        >
          Earnings
        </h1>

        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            marginTop: 4,
            marginBottom: 0,
          }}
        >
          Track your revenue and payouts
        </p>
      </div>

      {/* STAT CARDS */}
      <div
        className="earn-stats"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
          marginBottom: 20,
        }}
      >
        {/* THIS MONTH */}
        <div
          className="card"
          style={{
            padding: 18,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              marginBottom: 12,
              background:
                'rgba(16,185,129,0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DollarSign
              size={18}
              style={{
                color: 'var(--emerald)',
              }}
            />
          </div>

          <div
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'var(--text)',
            }}
          >
            ₹{currentMonth.amount.toLocaleString('en-IN')}
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginTop: 2,
            }}
          >
            This Month
          </div>
        </div>

        {/* CHANGE */}
        <div
          className="card"
          style={{
            padding: 18,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              marginBottom: 12,
              background:
                'rgba(37,99,235,0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingUp
              size={18}
              style={{
                color: 'var(--blue)',
              }}
            />
          </div>

          <div
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'var(--text)',
            }}
          >
            {Number(percentageChange) >= 0
              ? '+'
              : ''}
            {percentageChange}%
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginTop: 2,
            }}
          >
            vs Last Month
          </div>
        </div>

        {/* PENDING PAYOUT */}
        <div
          className="card"
          style={{
            padding: 18,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              marginBottom: 12,
              background:
                'rgba(245,158,11,0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock3
              size={18}
              style={{
                color: '#F59E0B',
              }}
            />
          </div>

          <div
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'var(--text)',
            }}
          >
            ₹{pendingPayout.toLocaleString('en-IN')}
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginTop: 2,
            }}
          >
            Pending Payout
          </div>
        </div>
      </div>

      {/* REVENUE TREND */}
      <div
        className="card"
        style={{
          padding: 22,
          marginBottom: 20,
        }}
      >
        <h2
          style={{
            fontWeight: 700,
            color: 'var(--text)',
            fontSize: '0.95rem',
            margin: 0,
            marginBottom: 18,
          }}
        >
          Revenue Trend (6 months) · ₹
          {totalRevenue.toLocaleString('en-IN')} total
        </h2>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 14,
            height: 180,
            width: '100%',
          }}
        >
          {revenueData.map((item) => (
            <div
              key={item.month}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 8,
                minWidth: 0,
              }}
            >
              {/* AMOUNT */}
              <div
                style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                ₹{(item.amount / 1000).toFixed(0)}K
              </div>

              {/* BAR */}
              <div
                style={{
                  width: '100%',
                  maxWidth: 100,
                  height: `${Math.max(
                    12,
                    (item.amount / maxRevenue) * 115
                  )}px`,
                  borderRadius:
                    '6px 6px 0 0',
                  background:
                    'linear-gradient(180deg, var(--emerald), var(--emerald-dark))',
                }}
              />

              {/* MONTH */}
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                {item.month}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RECENT TRANSACTIONS */}
      <div
        className="card"
        style={{
          padding: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 14px',
          }}
        >
          <h2
            style={{
              fontWeight: 700,
              color: 'var(--text)',
              fontSize: '0.9rem',
              margin: 0,
            }}
          >
            Recent Transactions
          </h2>

          <button
            type="button"
            onClick={() => {
              window.print()
            }}
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--blue)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Download size={13} />
            Export
          </button>
        </div>

        {transactions.map(
          (transaction, index) => (
            <div
              key={`${transaction.client}-${index}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderTop:
                  '1px solid var(--border)',
              }}
            >
              {/* CLIENT */}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: 'var(--text)',
                    fontSize: '0.84rem',
                    overflow: 'hidden',
                    textOverflow:
                      'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {transaction.client}
                </div>

                <div
                  style={{
                    fontSize: '0.74rem',
                    color: 'var(--text-muted)',
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow:
                      'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {transaction.desc}
                </div>
              </div>

              {/* DATE */}
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                {transaction.date}
              </div>

              {/* AMOUNT */}
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--text)',
                  minWidth: 70,
                  textAlign: 'right',
                }}
              >
                ₹
                {transaction.amount.toLocaleString(
                  'en-IN'
                )}
              </div>

              {/* STATUS */}
              <span
                className="badge"
                style={{
                  minWidth: 58,
                  textAlign: 'center',
                  background:
                    transaction.status ===
                    'Paid'
                      ? 'rgba(16,185,129,0.10)'
                      : 'rgba(245,158,11,0.10)',
                  color:
                    transaction.status ===
                    'Paid'
                      ? 'var(--emerald)'
                      : '#F59E0B',
                  borderRadius: 6,
                  padding:
                    '4px 8px',
                  fontSize:
                    '0.68rem',
                  fontWeight: 700,
                }}
              >
                {transaction.status}
              </span>
            </div>
          )
        )}
      </div>

      {/* RESPONSIVE STYLES */}
      <style>
        {`
          @media (max-width: 900px) {
            .earn-stats {
              grid-template-columns: 1fr 1fr !important;
            }
          }

          @media (max-width: 600px) {
            .earn-stats {
              grid-template-columns: 1fr !important;
            }

            .earn-stats + .card {
              overflow-x: auto;
            }
          }

          @media print {
            body {
              background: white !important;
            }

            button {
              display: none !important;
            }
          }
        `}
      </style>
    </div>
  )
}