import {
  Star,
  Users,
  Clock,
  Target,
} from 'lucide-react'

export default function Analytics() {

  // Real analytics will come from backend.
  const analytics = {
    totalCases: null as number | null,
    successRate: null as number | null,
    responseTime: null as number | null,
    rating: null as number | null,
  }

  const stats = [
    {
      icon: Users,
      value:
        analytics.totalCases !== null
          ? analytics.totalCases
          : '__',
      label: 'Total Cases Handled',
    },

    {
      icon: Target,
      value:
        analytics.successRate !== null
          ? `${analytics.successRate}%`
          : '__',
      label: 'Success Rate',
    },

    {
      icon: Clock,
      value:
        analytics.responseTime !== null
          ? `${analytics.responseTime}hrs`
          : '__',
      label: 'Avg. Response Time',
    },

    {
      icon: Star,
      value:
        analytics.rating !== null
          ? analytics.rating
          : '__',
      label: 'Average Rating',
    },
  ]

  return (
    <div className="page-enter">

      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: 'var(--text)',
          }}
        >
          Analytics
        </h1>

        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            marginTop: 2,
          }}
        >
          Your practice performance at a glance
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(4, 1fr)',
          gap: 14,
          marginBottom: 20,
        }}
        className="an-stats"
      >

        {stats.map((stat) => {

          const Icon = stat.icon

          return (
            <div
              key={stat.label}
              className="card"
              style={{ padding: 18 }}
            >

              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  marginBottom: 12,
                  background:
                    'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={18} />
              </div>

              <div
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: 'var(--text)',
                }}
              >
                {stat.value}
              </div>

              <div
                style={{
                  fontSize: '0.75rem',
                  color:
                    'var(--text-muted)',
                  marginTop: 2,
                }}
              >
                {stat.label}
              </div>

            </div>
          )
        })}

      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            '1fr 1fr',
          gap: 20,
        }}
        className="an-grid"
      >

        <div
          className="card"
          style={{ padding: 22 }}
        >

          <h2
            style={{
              fontWeight: 700,
              color: 'var(--text)',
              fontSize: '0.95rem',
              marginBottom: 18,
            }}
          >
            Cases by Practice Area
          </h2>

          <div
            style={{
              padding: '40px 10px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}
          >
            __
          </div>

        </div>

        <div
          className="card"
          style={{ padding: 22 }}
        >

          <h2
            style={{
              fontWeight: 700,
              color: 'var(--text)',
              fontSize: '0.95rem',
              marginBottom: 18,
            }}
          >
            Rating Breakdown
          </h2>

          <div
            style={{
              padding: '40px 10px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}
          >
            __
          </div>

        </div>

      </div>

      <style>{`
        @media (max-width: 900px) {
          .an-stats {
            grid-template-columns: 1fr 1fr !important;
          }

          .an-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </div>
  )
}