import { useEffect, useState } from 'react'
import { isLoggedIn } from '../../lib/auth'
import {
  DollarSign,
  TrendingUp,
  Download,
  Clock,
} from 'lucide-react'


// =====================================================
// API
// =====================================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'


// =====================================================
// TYPES
// =====================================================

interface MonthlyRevenue {
  month: string
  amount: number
  cases: number
}

interface Transaction {
  id: string
  client: string
  desc: string
  date: string
  amount: number | null
  status: string
}


// =====================================================
// FORMAT CURRENCY
// =====================================================

function formatCurrency(
  amount: number | null
) {

  if (
    amount === null ||
    amount === undefined
  ) {
    return '__'
  }

  return `₹${amount.toLocaleString(
    'en-IN'
  )}`
}


// =====================================================
// MAIN COMPONENT
// =====================================================

export default function Earnings() {

  const [
    monthlyRevenue,
    setMonthlyRevenue
  ] = useState<MonthlyRevenue[]>([])


  const [
    transactions,
    setTransactions
  ] = useState<Transaction[]>([])


  const [
    loading,
    setLoading
  ] = useState(true)


  const [
    error,
    setError
  ] = useState('')


  // ===================================================
  // LOAD REAL EARNINGS
  // ===================================================

  useEffect(() => {

    async function loadEarnings() {

      try {

        setLoading(true)

        setError('')


        if (!isLoggedIn()) {

          setError(
            'Authentication token not found.'
          )

          setLoading(false)

          return

        }


        /*
         * REAL DATABASE DATA ONLY
         *
         * Backend endpoint:
         *
         * GET /api/lawyers/earnings
         *
         * Expected response:
         *
         * {
         *   success: true,
         *   monthlyRevenue: [],
         *   transactions: []
         * }
         */


        const response =
          await fetch(
            `${API_URL}/api/lawyers/earnings`,
            {
              method: 'GET',
              credentials: 'include',

              headers: {

                'Content-Type':
                  'application/json',

              },

            }
          )


        if (!response.ok) {

          throw new Error(
            `Failed to fetch earnings (${response.status})`
          )

        }


        const data =
          await response.json()


        if (
          !data ||
          data.success !== true
        ) {

          throw new Error(
            data?.message ||
            'Unable to fetch earnings'
          )

        }


        // ---------------------------------------------
        // MONTHLY REVENUE
        // ---------------------------------------------

        const realMonthlyRevenue =
          Array.isArray(
            data.monthlyRevenue
          )
            ? data.monthlyRevenue
            : []


        setMonthlyRevenue(
          realMonthlyRevenue.map(
            (item: any) => ({

              month:
                item.month ||
                '',

              amount:
                item.amount === null ||
                item.amount === undefined
                  ? 0
                  : Number(item.amount),

              cases:
                item.cases === null ||
                item.cases === undefined
                  ? 0
                  : Number(item.cases),

            })
          )
        )


        // ---------------------------------------------
        // TRANSACTIONS
        // ---------------------------------------------

        const realTransactions =
          Array.isArray(
            data.transactions
          )
            ? data.transactions
            : []


        setTransactions(
          realTransactions.map(
            (item: any) => ({

              id:
                String(
                  item.id
                ),

              client:
                item.client ||
                item.clientName ||
                item.client_name ||
                'Client',

              desc:
                item.desc ||
                item.description ||
                'Legal service',

              date:
                item.date ||
                item.createdAt ||
                item.created_at ||
                '',

              amount:
                item.amount === null ||
                item.amount === undefined ||
                item.amount === ''
                  ? null
                  : Number(item.amount),

              status:
                item.status ||
                'Pending',

            })
          )
        )


      } catch (err: any) {

        console.error(
          'EARNINGS ERROR:',
          err
        )


        setMonthlyRevenue([])

        setTransactions([])


        setError(
          err?.message ||
          'Unable to fetch earnings'
        )


      } finally {

        setLoading(false)

      }

    }


    loadEarnings()

  }, [])


  // ===================================================
  // CALCULATIONS FROM REAL DATA
  // ===================================================

  const total =
    monthlyRevenue.reduce(
      (
        sum,
        month
      ) =>
        sum +
        (
          Number.isFinite(
            month.amount
          )
            ? month.amount
            : 0
        ),
      0
    )


  const thisMonth =
    monthlyRevenue.length > 0
      ? monthlyRevenue[
          monthlyRevenue.length - 1
        ]
      : null


  const lastMonth =
    monthlyRevenue.length > 1
      ? monthlyRevenue[
          monthlyRevenue.length - 2
        ]
      : null


  let growth: string = '__'


  if (
    thisMonth &&
    lastMonth &&
    lastMonth.amount !== 0
  ) {

    growth =
      (
        (
          (
            thisMonth.amount -
            lastMonth.amount
          ) /
          lastMonth.amount
        ) *
        100
      ).toFixed(1)

  }


  const pendingPayout =
    transactions.reduce(
      (
        sum,
        transaction
      ) => {

        if (
          String(
            transaction.status
          ).toLowerCase() ===
          'pending'
        ) {

          return (
            sum +
            (
              transaction.amount ||
              0
            )
          )

        }

        return sum

      },
      0
    )


  const maxRevenue =
    monthlyRevenue.length > 0
      ? Math.max(
          ...monthlyRevenue.map(
            month =>
              month.amount
          )
        )
      : 0


  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {

    return (

      <div
        className="page-enter"

        style={{
          padding:
            '50px 20px',

          textAlign:
            'center',

          color:
            'var(--text-muted)',

          fontSize:
            '0.85rem',
        }}
      >

        Loading earnings...

      </div>

    )

  }


  // ===================================================
  // PAGE
  // ===================================================

  return (

    <div className="page-enter">

      {/* =================================================
          HEADER
      ================================================= */}

      <div
        style={{
          marginBottom:
            24,
        }}
      >

        <h1
          style={{
            fontSize:
              '1.4rem',

            fontWeight:
              800,

            color:
              'var(--text)',

            letterSpacing:
              '-0.03em',
          }}
        >

          Earnings

        </h1>


        <p
          style={{
            color:
              'var(--text-muted)',

            fontSize:
              '0.9rem',

            marginTop:
              2,
          }}
        >

          Track your revenue and payouts

        </p>

      </div>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (

        <div
          style={{
            marginBottom:
              18,

            padding:
              '12px 14px',

            borderRadius:
              9,

            background:
              'rgba(239,68,68,0.08)',

            border:
              '1px solid rgba(239,68,68,0.2)',

            color:
              '#EF4444',

            fontSize:
              '0.8rem',
          }}
        >

          {error}

        </div>

      )}


      {/* =================================================
          STAT CARDS
      ================================================= */}

      <div
        style={{
          display:
            'grid',

          gridTemplateColumns:
            'repeat(3, 1fr)',

          gap:
            14,

          marginBottom:
            20,
        }}

        className="earn-stats"
      >

        {/* THIS MONTH */}

        <div
          className="card"
          style={{
            padding:
              18,
          }}
        >

          <div
            style={{
              width:
                38,

              height:
                38,

              borderRadius:
                10,

              marginBottom:
                12,

              background:
                'var(--emerald-subtle)',

              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'center',
            }}
          >

            <DollarSign
              size={18}
              style={{
                color:
                  'var(--emerald)',
              }}
            />

          </div>


          <div
            style={{
              fontSize:
                '1.4rem',

              fontWeight:
                800,

              color:
                'var(--text)',
            }}
          >

            {thisMonth
              ? formatCurrency(
                  thisMonth.amount
                )
              : '__'}

          </div>


          <div
            style={{
              fontSize:
                '0.75rem',

              color:
                'var(--text-muted)',

              marginTop:
                2,
            }}
          >

            This Month

          </div>

        </div>


        {/* GROWTH */}

        <div
          className="card"
          style={{
            padding:
              18,
          }}
        >

          <div
            style={{
              width:
                38,

              height:
                38,

              borderRadius:
                10,

              marginBottom:
                12,

              background:
                'rgba(37,99,235,0.1)',

              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'center',
            }}
          >

            <TrendingUp
              size={18}
              style={{
                color:
                  'var(--blue)',
              }}
            />

          </div>


          <div
            style={{
              fontSize:
                '1.4rem',

              fontWeight:
                800,

              color:
                'var(--text)',
            }}
          >

            {growth === '__'
              ? '__'
              : `${Number(growth) >= 0 ? '+' : ''}${growth}%`}

          </div>


          <div
            style={{
              fontSize:
                '0.75rem',

              color:
                'var(--text-muted)',

              marginTop:
                2,
            }}
          >

            vs Last Month

          </div>

        </div>


        {/* PENDING */}

        <div
          className="card"
          style={{
            padding:
              18,
          }}
        >

          <div
            style={{
              width:
                38,

              height:
                38,

              borderRadius:
                10,

              marginBottom:
                12,

              background:
                'rgba(245,158,11,0.1)',

              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'center',
            }}
          >

            <Clock
              size={18}
              style={{
                color:
                  '#F59E0B',
              }}
            />

          </div>


          <div
            style={{
              fontSize:
                '1.4rem',

              fontWeight:
                800,

              color:
                'var(--text)',
            }}
          >

            {transactions.length === 0
              ? '__'
              : formatCurrency(
                  pendingPayout
                )}

          </div>


          <div
            style={{
              fontSize:
                '0.75rem',

              color:
                'var(--text-muted)',

              marginTop:
                2,
            }}
          >

            Pending Payout

          </div>

        </div>

      </div>


      {/* =================================================
          REVENUE TREND
      ================================================= */}

      <div
        className="card"
        style={{
          padding:
            22,

          marginBottom:
            20,
        }}
      >

        <h2
          style={{
            fontWeight:
              700,

            color:
              'var(--text)',

            fontSize:
              '0.95rem',

            marginBottom:
              18,
          }}
        >

          Revenue Trend

          {' · '}

          {monthlyRevenue.length > 0
            ? `${formatCurrency(total)} total`
            : '__'}

        </h2>


        {monthlyRevenue.length === 0 ? (

          <div
            style={{
              height:
                140,

              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'center',

              textAlign:
                'center',

              color:
                'var(--text-muted)',

              fontSize:
                '0.8rem',
            }}
          >

            No real revenue data available yet.

          </div>

        ) : (

          <div
            style={{
              display:
                'flex',

              alignItems:
                'flex-end',

              gap:
                14,

              height:
                140,
            }}
          >

            {monthlyRevenue.map(
              month => (

                <div
                  key={
                    month.month
                  }

                  style={{
                    flex:
                      1,

                    display:
                      'flex',

                    flexDirection:
                      'column',

                    alignItems:
                      'center',

                    gap:
                      8,
                  }}
                >

                  <div
                    style={{
                      fontSize:
                        '0.68rem',

                      color:
                        'var(--text-muted)',

                      fontWeight:
                        600,
                    }}
                  >

                    {formatCurrency(
                      month.amount
                    )}

                  </div>


                  <div
                    style={{
                      width:
                        '100%',

                      borderRadius:
                        '6px 6px 0 0',

                      height:
                        maxRevenue > 0
                          ? `${
                              (
                                month.amount /
                                maxRevenue
                              ) *
                              100
                            }px`
                          : '0px',

                      background:
                        'linear-gradient(180deg, var(--emerald), var(--emerald-dark))',
                    }}
                  />


                  <div
                    style={{
                      fontSize:
                        '0.72rem',

                      color:
                        'var(--text-muted)',

                      fontWeight:
                        600,
                    }}
                  >

                    {month.month}

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>


      {/* =================================================
          TRANSACTIONS
      ================================================= */}

      <div
        className="card"
        style={{
          padding:
            8,
        }}
      >

        <div
          style={{
            display:
              'flex',

            justifyContent:
              'space-between',

            alignItems:
              'center',

            padding:
              '12px 14px',
          }}
        >

          <h2
            style={{
              fontWeight:
                700,

              color:
                'var(--text)',

              fontSize:
                '0.9rem',
            }}
          >

            Recent Transactions

          </h2>


          {transactions.length > 0 && (

            <button
              style={{
                fontSize:
                  '0.78rem',

                fontWeight:
                  600,

                color:
                  'var(--blue)',

                background:
                  'none',

                border:
                  'none',

                cursor:
                  'pointer',

                display:
                  'flex',

                alignItems:
                  'center',

                gap:
                  5,
              }}
            >

              <Download
                size={13}
              />

              Export

            </button>

          )}

        </div>


        {/* =================================================
            NO TRANSACTIONS
        ================================================= */}

        {transactions.length === 0 ? (

          <div
            style={{
              padding:
                '50px 20px',

              textAlign:
                'center',

              color:
                'var(--text-muted)',

              fontSize:
                '0.85rem',
            }}
          >

            No real transactions available yet.

          </div>

        ) : (

          transactions.map(
            transaction => (

              <div
                key={
                  transaction.id
                }

                style={{
                  display:
                    'flex',

                  alignItems:
                    'center',

                  gap:
                    12,

                  padding:
                    '12px 14px',

                  borderTop:
                    '1px solid var(--border)',
                }}
              >

                <div
                  style={{
                    flex:
                      1,

                    minWidth:
                      0,
                  }}
                >

                  <div
                    style={{
                      fontWeight:
                        600,

                      color:
                        'var(--text)',

                      fontSize:
                        '0.84rem',
                    }}
                  >

                    {transaction.client}

                  </div>


                  <div
                    style={{
                      fontSize:
                        '0.74rem',

                      color:
                        'var(--text-muted)',

                      marginTop:
                        1,
                    }}
                  >

                    {transaction.desc}

                    {transaction.date
                      ? ` · ${transaction.date}`
                      : ''}

                  </div>

                </div>


                <span
                  className="badge"

                  style={{
                    background:
                      String(
                        transaction.status
                      ).toLowerCase() ===
                      'paid'
                        ? 'var(--emerald-subtle)'
                        : 'rgba(245,158,11,0.1)',

                    color:
                      String(
                        transaction.status
                      ).toLowerCase() ===
                      'paid'
                        ? 'var(--emerald)'
                        : '#F59E0B',
                  }}
                >

                  {transaction.status}

                </span>


                <div
                  style={{
                    fontWeight:
                      700,

                    color:
                      'var(--text)',

                    fontSize:
                      '0.85rem',

                    minWidth:
                      70,

                    textAlign:
                      'right',
                  }}
                >

                  {formatCurrency(
                    transaction.amount
                  )}

                </div>

              </div>

            )
          )

        )}

      </div>


      {/* =================================================
          RESPONSIVE
      ================================================= */}

      <style>{`

        @media (max-width: 700px) {

          .earn-stats {
            grid-template-columns:
              1fr !important;
          }

        }

      `}</style>

    </div>

  )

}