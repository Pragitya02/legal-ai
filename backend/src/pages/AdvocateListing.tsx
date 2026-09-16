import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  Search,
  Star,
  MapPin,
  Briefcase,
  Globe,
  Clock,
  Filter,
  ChevronDown,
  Award,
} from 'lucide-react'

interface Advocate {
  id: string
  name: string
  initials: string
  color: string

  // These are not currently returned by your backend
  specializations: string[]
  rating: number | null
  reviews: number | null
  experience: number | null
  languages: string[]
  fee: number | null
  city: string
  court: string
  available: boolean
  about: string

  email: string
  phone: string
}

const cities = [
  'All Cities',
]

const areas = [
  'All Areas',
]

const feeRanges = [
  'Any Fee',
]

export default function AdvocateListing() {
  const [advocates, setAdvocates] = useState<Advocate[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [city, setCity] = useState('All Cities')
  const [area, setArea] = useState('All Areas')
  const [feeRange, setFeeRange] = useState('Any Fee')
  const [minRating, setMinRating] = useState(0)
  const [showFilters, setShowFilters] = useState(false)

  const [availability, setAvailability] =
    useState<'All' | 'Available Now' | 'Busy'>('All')

  const [expandedId, setExpandedId] =
    useState<string | null>(null)

  // =====================================================
  // LOAD REAL ADVOCATES FROM DATABASE
  // =====================================================

  useEffect(() => {
    const loadAdvocates = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(
          'http://localhost:5001/api/lawyers'
        )

        const data = await response.json()

        console.log('LAWYERS API RESPONSE:', data)

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
            'Failed to load advocates'
          )
        }

        const lawyers = Array.isArray(data.lawyers)
          ? data.lawyers
          : []

        const realAdvocates: Advocate[] =
          lawyers.map(
            (lawyer: any, index: number) => {

              const name =
                lawyer.full_name ||
                lawyer.fullName ||
                lawyer.name ||
                'Advocate'

              const initials =
                name
                  .split(' ')
                  .filter(Boolean)
                  .map(
                    (word: string) =>
                      word[0]
                  )
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()

              const colors = [
                '#2563EB',
                '#7C3AED',
                '#059669',
                '#F59E0B',
                '#EF4444',
                '#06B6D4',
                '#EC4899',
                '#8B5CF6',
              ]

              return {
                id: String(lawyer.id),

                name,

                initials,

                color:
                  colors[
                    index % colors.length
                  ],

                // Not available from current API
                specializations: [],

                rating: null,

                reviews: null,

                experience: null,

                languages: [],

                fee: null,

                city: '__',

                court: '__',

                // Currently we only know that
                // the user is registered as lawyer.
                // Real availability will be added later.
                available: true,

                about:
                  'Registered advocate on NyayaAI.',

                email:
                  lawyer.email || '__',

                phone:
                  lawyer.phone || '__',
              }
            }
          )

        setAdvocates(realAdvocates)

      } catch (err) {

        console.error(
          'LOAD ADVOCATES ERROR:',
          err
        )

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load advocates'
        )

        setAdvocates([])

      } finally {
        setLoading(false)
      }
    }

    loadAdvocates()
  }, [])

  // =====================================================
  // FILTER
  // =====================================================

  const filtered = advocates.filter(a => {

    const searchText =
      search.toLowerCase().trim()

    const matchSearch =
      !searchText ||
      a.name
        .toLowerCase()
        .includes(searchText) ||
      a.email
        .toLowerCase()
        .includes(searchText)

    const matchCity =
      city === 'All Cities' ||
      a.city === city

    const matchArea =
      area === 'All Areas'

    const matchRating =
      minRating === 0 ||
      (
        a.rating !== null &&
        a.rating >= minRating
      )

    const matchFee =
      feeRange === 'Any Fee' ||
      a.fee === null

    const matchAvailability =
      availability === 'All' ||
      (
        availability ===
        'Available Now' &&
        a.available
      ) ||
      (
        availability === 'Busy' &&
        !a.available
      )

    return (
      matchSearch &&
      matchCity &&
      matchArea &&
      matchRating &&
      matchFee &&
      matchAvailability
    )
  })

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div
        className="page-enter"
        style={{
          padding: 40,
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}
      >
        Loading advocates...
      </div>
    )
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="page-enter">

      {/* =================================================
          HEADER
      ================================================= */}

      <div style={{ marginBottom: 24 }}>

        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '-0.03em',
            marginBottom: 4,
          }}
        >
          Find an Advocate
        </h1>

        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
          }}
        >
          {advocates.length} registered advocates
        </p>

      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div
          className="card"
          style={{
            padding: 16,
            marginBottom: 20,
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#EF4444',
            background:
              'rgba(239,68,68,0.05)',
          }}
        >
          {error}
        </div>
      )}

      {/* =================================================
          SEARCH + FILTER BAR
      ================================================= */}

      <div
        className="card"
        style={{
          padding: 16,
          marginBottom: 20,
        }}
      >

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >

          {/* SEARCH */}

          <div
            style={{
              flex: 1,
              minWidth: 220,
              position: 'relative',
            }}
          >

            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform:
                  'translateY(-50%)',
                color:
                  'var(--text-muted)',
              }}
            />

            <input
              className="input"
              placeholder="Search by advocate name or email..."
              value={search}
              onChange={e =>
                setSearch(e.target.value)
              }
              style={{
                paddingLeft: 32,
              }}
            />

          </div>

          <SelectFilter
            label="City"
            value={city}
            options={cities}
            onChange={setCity}
          />

          <SelectFilter
            label="Practice Area"
            value={area}
            options={areas}
            onChange={setArea}
          />

          <SelectFilter
            label="Fee Range"
            value={feeRange}
            options={feeRanges}
            onChange={setFeeRange}
          />

          <button
            onClick={() =>
              setShowFilters(
                s => !s
              )
            }
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border:
                '1px solid var(--border)',
              background:
                showFilters
                  ? 'var(--blue-subtle)'
                  : 'var(--bg-secondary)',
              color:
                showFilters
                  ? 'var(--blue)'
                  : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            <Filter size={14} />
            More Filters
          </button>

        </div>

        {/* =================================================
            MORE FILTERS
        ================================================= */}

        {showFilters && (
          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop:
                '1px solid var(--border)',
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >

            {/* RATING */}

            <div>

              <label
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color:
                    'var(--text-muted)',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Minimum Rating
              </label>

              <div
                style={{
                  display: 'flex',
                  gap: 6,
                }}
              >

                {[0, 4, 4.5, 4.8].map(
                  r => (
                    <button
                      key={r}
                      onClick={() =>
                        setMinRating(r)
                      }
                      style={{
                        padding:
                          '5px 12px',
                        borderRadius: 7,
                        fontSize:
                          '0.78rem',
                        fontWeight: 600,
                        border:
                          '1px solid var(--border)',
                        cursor: 'pointer',
                        background:
                          minRating === r
                            ? 'var(--blue-subtle)'
                            : 'var(--bg-secondary)',
                        color:
                          minRating === r
                            ? 'var(--blue)'
                            : 'var(--text-muted)',
                      }}
                    >
                      {r === 0
                        ? 'Any'
                        : `${r}+`}
                      {' '}⭐
                    </button>
                  )
                )}

              </div>

            </div>

            {/* AVAILABILITY */}

            <div>

              <label
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color:
                    'var(--text-muted)',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Availability
              </label>

              <div
                style={{
                  display: 'flex',
                  gap: 6,
                }}
              >

                {(
                  [
                    'All',
                    'Available Now',
                    'Busy',
                  ] as const
                ).map(a => (

                  <button
                    key={a}
                    onClick={() =>
                      setAvailability(a)
                    }
                    style={{
                      padding:
                        '5px 12px',
                      borderRadius: 7,
                      fontSize:
                        '0.78rem',
                      fontWeight: 500,
                      border:
                        '1px solid var(--border)',
                      cursor: 'pointer',
                      background:
                        availability === a
                          ? 'var(--blue-subtle)'
                          : 'var(--bg-secondary)',
                      color:
                        availability === a
                          ? 'var(--blue)'
                          : 'var(--text-muted)',
                    }}
                  >
                    {a}
                  </button>

                ))}

              </div>

            </div>

          </div>
        )}

      </div>

      {/* =================================================
          RESULTS COUNT
      ================================================= */}

      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >

        <span
          style={{
            fontSize: '0.875rem',
            color:
              'var(--text-muted)',
          }}
        >
          Showing{' '}
          <strong
            style={{
              color: 'var(--text)',
            }}
          >
            {filtered.length}
          </strong>{' '}
          advocates
        </span>

        {(search ||
          city !== 'All Cities' ||
          area !== 'All Areas' ||
          feeRange !== 'Any Fee' ||
          minRating > 0 ||
          availability !== 'All') && (

          <button
            onClick={() => {
              setSearch('')
              setCity('All Cities')
              setArea('All Areas')
              setFeeRange('Any Fee')
              setMinRating(0)
              setAvailability('All')
            }}
            style={{
              fontSize:
                '0.78rem',
              color:
                'var(--blue)',
              background:
                'none',
              border: 'none',
              cursor:
                'pointer',
              fontWeight: 500,
            }}
          >
            Clear all filters
          </button>

        )}

      </div>

      {/* =================================================
          ADVOCATE CARDS
      ================================================= */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(2, 1fr)',
          gap: 16,
        }}
        className="advocates-grid"
      >

        {filtered.map(a => (

          <div
            key={a.id}
            className="card card-interactive"
            style={{
              padding: 22,
            }}
          >

            {/* =================================================
                TOP ROW
            ================================================= */}

            <div
              style={{
                display: 'flex',
                gap: 14,
                marginBottom: 14,
              }}
            >

              <div
                className="avatar"
                style={{
                  width: 56,
                  height: 56,
                  fontSize: '1rem',
                  background:
                    `linear-gradient(135deg, ${a.color}, ${a.color}88)`,
                }}
              >
                {a.initials}
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
              >

                <div
                  style={{
                    display: 'flex',
                    alignItems:
                      'flex-start',
                    justifyContent:
                      'space-between',
                    gap: 8,
                  }}
                >

                  <div>

                    <div
                      style={{
                        fontWeight: 700,
                        color:
                          'var(--text)',
                        fontSize:
                          '0.95rem',
                      }}
                    >
                      {a.name}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems:
                          'center',
                        gap: 6,
                        marginTop: 2,
                      }}
                    >
                      <Award
                        size={11}
                        style={{
                          color:
                            'var(--emerald)',
                        }}
                      />

                      <span
                        style={{
                          fontSize:
                            '0.7rem',
                          color:
                            'var(--emerald)',
                          fontWeight: 600,
                        }}
                      >
                        Registered Advocate
                      </span>

                    </div>

                  </div>

                  <span
                    style={{
                      padding:
                        '4px 10px',
                      borderRadius: 99,
                      fontSize:
                        '0.7rem',
                      fontWeight: 700,
                      flexShrink: 0,
                      background:
                        'var(--emerald-subtle)',
                      color:
                        'var(--emerald)',
                      border:
                        '1px solid var(--emerald-light)',
                    }}
                  >
                    ● Registered
                  </span>

                </div>

              </div>

            </div>

            {/* =================================================
                SPECIALIZATIONS
            ================================================= */}

            <div
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                marginBottom: 12,
              }}
            >

              <span
                className="badge"
                style={{
                  background:
                    'var(--blue-subtle)',
                  color:
                    'var(--blue)',
                }}
              >
                Legal Services
              </span>

            </div>

            {/* =================================================
                ABOUT
            ================================================= */}

            <p
              style={{
                fontSize: '0.8rem',
                color:
                  'var(--text-muted)',
                lineHeight: 1.5,
                marginBottom: 14,
              }}
            >
              {a.about}
            </p>

            {/* =================================================
                CONTACT
            ================================================= */}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '1fr 1fr',
                gap: 10,
                marginBottom: 14,
              }}
            >

              <MetaStat
                icon={Star}
                val="__"
                sub="rating"
                iconColor="#F59E0B"
                fill
              />

              <MetaStat
                icon={Briefcase}
                val="__"
                sub="experience"
              />

              <MetaStat
                icon={MapPin}
                val="__"
                sub="location"
              />

              <MetaStat
                icon={Globe}
                val="__"
                sub="languages"
              />

            </div>

            {/* =================================================
                REAL DATABASE CONTACT
            ================================================= */}

            <div
              style={{
                padding:
                  '10px 12px',
                marginBottom: 16,
                borderRadius: 8,
                background:
                  'var(--bg-secondary)',
                border:
                  '1px solid var(--border)',
              }}
            >

              <div
                style={{
                  fontSize:
                    '0.75rem',
                  color:
                    'var(--text-muted)',
                  marginBottom: 4,
                }}
              >
                Email
              </div>

              <div
                style={{
                  fontSize:
                    '0.82rem',
                  color:
                    'var(--text)',
                  fontWeight: 600,
                  wordBreak:
                    'break-word',
                }}
              >
                {a.email}
              </div>

              <div
                style={{
                  fontSize:
                    '0.75rem',
                  color:
                    'var(--text-muted)',
                  marginTop: 8,
                  marginBottom: 4,
                }}
              >
                Phone
              </div>

              <div
                style={{
                  fontSize:
                    '0.82rem',
                  color:
                    'var(--text)',
                  fontWeight: 600,
                }}
              >
                {a.phone}
              </div>

            </div>

            {/* =================================================
                FOOTER
            ================================================= */}

            <div
              style={{
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'space-between',
                borderTop:
                  '1px solid var(--border)',
                paddingTop: 14,
              }}
            >

              <div>

                <div
                  style={{
                    fontSize:
                      '1.2rem',
                    fontWeight: 800,
                    color:
                      'var(--text)',
                    letterSpacing:
                      '-0.02em',
                  }}
                >
                  __
                </div>

                <div
                  style={{
                    fontSize:
                      '0.7rem',
                    color:
                      'var(--text-muted)',
                  }}
                >
                  consultation fee
                </div>

              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                }}
              >

                {/* VIEW PROFILE */}

                <button
                  onClick={() =>
                    setExpandedId(
                      id =>
                        id === a.id
                          ? null
                          : a.id
                    )
                  }
                  style={{
                    padding:
                      '8px 14px',
                    borderRadius: 8,
                    fontSize:
                      '0.8rem',
                    fontWeight: 600,
                    border:
                      '1px solid var(--border)',
                    background:
                      expandedId === a.id
                        ? 'var(--blue-subtle)'
                        : 'var(--bg-secondary)',
                    color:
                      expandedId === a.id
                        ? 'var(--blue)'
                        : 'var(--text-muted)',
                    cursor:
                      'pointer',
                  }}
                >
                  {expandedId === a.id
                    ? 'Hide Profile'
                    : 'View Profile'}
                </button>

                {/* BOOK */}

                <Link
                  to={`/dashboard/booking?advocateId=${encodeURIComponent(a.id)}&advocateName=${encodeURIComponent(a.name)}`}
                  className="btn-primary"
                  style={{
                    padding:
                      '8px 16px',
                    borderRadius: 8,
                    fontSize:
                      '0.8rem',
                    fontWeight: 700,
                    textDecoration:
                      'none',
                    display:
                      'inline-flex',
                    alignItems:
                      'center',
                    gap: 5,
                  }}
                >
                  <Clock size={13} />
                  Book Consultation
                </Link>

              </div>

            </div>

            {/* =================================================
                EXPANDED PROFILE
            ================================================= */}

            {expandedId === a.id && (

              <div
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop:
                    '1px solid var(--border)',
                }}
              >

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      '1fr 1fr',
                    gap: 10,
                    fontSize:
                      '0.8rem',
                  }}
                >

                  <div>
                    <span
                      style={{
                        color:
                          'var(--text-muted)',
                      }}
                    >
                      High Court:
                    </span>{' '}
                    <strong
                      style={{
                        color:
                          'var(--text)',
                      }}
                    >
                      __
                    </strong>
                  </div>

                  <div>
                    <span
                      style={{
                        color:
                          'var(--text-muted)',
                      }}
                    >
                      Reviews:
                    </span>{' '}
                    <strong
                      style={{
                        color:
                          'var(--text)',
                      }}
                    >
                      __
                    </strong>
                  </div>

                  <div>
                    <span
                      style={{
                        color:
                          'var(--text-muted)',
                      }}
                    >
                      Experience:
                    </span>{' '}
                    <strong
                      style={{
                        color:
                          'var(--text)',
                      }}
                    >
                      __
                    </strong>
                  </div>

                  <div>
                    <span
                      style={{
                        color:
                          'var(--text-muted)',
                      }}
                    >
                      Consultation Fee:
                    </span>{' '}
                    <strong
                      style={{
                        color:
                          'var(--text)',
                      }}
                    >
                      __
                    </strong>
                  </div>

                  <div
                    style={{
                      gridColumn:
                        '1 / -1',
                    }}
                  >
                    <span
                      style={{
                        color:
                          'var(--text-muted)',
                      }}
                    >
                      Email:
                    </span>{' '}
                    <strong
                      style={{
                        color:
                          'var(--text)',
                      }}
                    >
                      {a.email}
                    </strong>
                  </div>

                  <div
                    style={{
                      gridColumn:
                        '1 / -1',
                    }}
                  >
                    <span
                      style={{
                        color:
                          'var(--text-muted)',
                      }}
                    >
                      Phone:
                    </span>{' '}
                    <strong
                      style={{
                        color:
                          'var(--text)',
                      }}
                    >
                      {a.phone}
                    </strong>
                  </div>

                </div>

              </div>

            )}

          </div>

        ))}

      </div>

      {/* =================================================
          NO ADVOCATES
      ================================================= */}

      {!loading &&
        filtered.length === 0 && (

        <div
          style={{
            padding:
              '60px 20px',
            textAlign:
              'center',
          }}
        >

          <div
            style={{
              fontSize:
                '2.5rem',
              marginBottom: 12,
            }}
          >
            🔍
          </div>

          <div
            style={{
              fontWeight: 700,
              color:
                'var(--text)',
              marginBottom: 6,
            }}
          >
            No advocates found
          </div>

          <div
            style={{
              color:
                'var(--text-muted)',
              fontSize:
                '0.9rem',
            }}
          >
            No advocates are currently
            registered.
          </div>

        </div>

      )}

      {/* =================================================
          RESPONSIVE
      ================================================= */}

      <style>{`
        @media (max-width: 900px) {
          .advocates-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </div>
  )
}

// =====================================================
// META STAT
// =====================================================

function MetaStat({
  icon: Icon,
  val,
  sub,
  iconColor,
  fill,
}: {
  icon: typeof Star
  val: string
  sub: string
  iconColor?: string
  fill?: boolean
}) {
  return (
    <div
      style={{
        textAlign: 'center',
      }}
    >

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
        }}
      >

        <Icon
          size={12}
          style={{
            color:
              iconColor ||
              'var(--text-muted)',
          }}
          fill={
            fill
              ? (
                  iconColor ||
                  'currentColor'
                )
              : 'none'
          }
        />

        <span
          style={{
            fontSize:
              '0.825rem',
            fontWeight: 700,
            color:
              'var(--text)',
          }}
        >
          {val}
        </span>

      </div>

      <div
        style={{
          fontSize:
            '0.65rem',
          color:
            'var(--text-subtle)',
          marginTop: 1,
        }}
      >
        {sub}
      </div>

    </div>
  )
}

// =====================================================
// SELECT FILTER
// =====================================================

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <div
      style={{
        position: 'relative',
      }}
    >

      <select
        value={value}
        onChange={e =>
          onChange(e.target.value)
        }
        style={{
          padding:
            '8px 28px 8px 12px',
          borderRadius: 8,
          border:
            '1px solid var(--border)',
          background:
            'var(--bg-secondary)',
          color:
            'var(--text)',
          fontSize:
            '0.875rem',
          cursor:
            'pointer',
          appearance:
            'none',
          outline:
            'none',
          fontFamily:
            'inherit',
        }}
      >

        {options.map(o => (
          <option
            key={o}
            value={o}
          >
            {o}
          </option>
        ))}

      </select>

      <ChevronDown
        size={13}
        style={{
          position:
            'absolute',
          right: 8,
          top: '50%',
          transform:
            'translateY(-50%)',
          color:
            'var(--text-muted)',
          pointerEvents:
            'none',
        }}
      />

    </div>
  )
}