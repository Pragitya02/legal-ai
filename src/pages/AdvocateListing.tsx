import { useState, useEffect } from 'react'
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
  X,
} from 'lucide-react'

import { indiaDistricts } from '../data/indiaDistricts'
import { practiceAreas } from '../data/practiceAreas'

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5001'

// =====================================================
// ADVOCATE LISTING
// =====================================================

export default function AdvocateListing() {
  const [search, setSearch] = useState('')

  const [district, setDistrict] =
    useState('All Districts')

  const [practiceArea, setPracticeArea] =
    useState('All Practice Areas')

  const [districtSearch, setDistrictSearch] =
    useState('')

  const [practiceAreaSearch, setPracticeAreaSearch] =
    useState('')

  const [minRating, setMinRating] =
    useState(0)

  const [showFilters, setShowFilters] =
    useState(false)

  const [availability, setAvailability] =
    useState<
      'All' |
      'Available Now' |
      'Busy'
    >('All')

  const [selectedAdvocate, setSelectedAdvocate] =
    useState<any | null>(null)

  const [advocates, setAdvocates] =
    useState<any[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  // =====================================================
  // LOAD REAL ADVOCATES FROM BACKEND
  // =====================================================

  useEffect(() => {
    const loadAdvocates = async () => {
      try {
        setLoading(true)
        setError('')

        const response =
          await fetch(
            `${API_URL}/api/lawyers`
          )

        if (!response.ok) {
          throw new Error(
            `Server error: ${response.status}`
          )
        }

        const data =
          await response.json()

        console.log(
          'ADVOCATES FROM BACKEND:',
          data
        )

        if (
          !data.success ||
          !Array.isArray(
            data.lawyers
          )
        ) {
          throw new Error(
            'Invalid advocate data received from server.'
          )
        }

        const formatted =
          data.lawyers.map(
            (lawyer: any) => {
              const name =
                lawyer.full_name ||
                'Advocate'

              // -------------------------------------------
              // INITIALS
              // -------------------------------------------

              const initials =
                name
                  .split(' ')
                  .filter(Boolean)
                  .map(
                    (n: string) =>
                      n[0]
                  )
                  .join('')
                  .substring(0, 2)
                  .toUpperCase()

              // -------------------------------------------
              // PRACTICE AREAS
              // -------------------------------------------

              const specializations =
                lawyer.specialization
                  ? String(
                      lawyer.specialization
                    )
                      .split(',')
                      .map(
                        (item: string) =>
                          item.trim()
                      )
                      .filter(Boolean)
                  : []

              // -------------------------------------------
              // EXPERIENCE
              // -------------------------------------------

              let experience =
                Number(
                  lawyer.experience || 0
                )

              if (
                experience <= 0 &&
                lawyer.enrollment_year
              ) {
                const enrollmentYear =
                  Number(
                    lawyer.enrollment_year
                  )

                const currentYear =
                  new Date().getFullYear()

                if (
                  enrollmentYear > 0 &&
                  enrollmentYear <=
                    currentYear
                ) {
                  experience =
                    Math.max(
                      0,
                      currentYear -
                        enrollmentYear
                    )
                }
              }

              // -------------------------------------------
              // RETURN REAL ADVOCATE
              // -------------------------------------------

              return {
                id:
                  String(
                    lawyer.id
                  ),

                name,

                initials,

                color:
                  '#2563EB',

                specializations:
                  specializations.length >
                  0
                    ? specializations
                    : ['Legal Practice'],

                rating:
                  Number(
                    lawyer.rating || 0
                  ),

                reviews:
                  Number(
                    lawyer.reviews || 0
                  ),

                experience,

                languages:
                  Array.isArray(
                    lawyer.languages
                  )
                    ? lawyer.languages
                    : [
                        'English',
                        'Hindi',
                      ],

                // Kept for the existing card UI.
                // Fee is NOT used as a filter.
                fee:
                  Number(
                    lawyer.fee || 0
                  ),

                city:
                  lawyer.location ||
                  'Not provided',

                court:
                  lawyer.high_court ||
                  'Not provided',

                available:
                  lawyer.available !==
                  undefined
                    ? Boolean(
                        lawyer.available
                      )
                    : true,

                about:
                  lawyer.bio ||
                  'No biography provided.',

                email:
                  lawyer.email ||
                  '',

                phone:
                  lawyer.phone ||
                  '',

                verified:
                  Boolean(
                    lawyer.verified
                  ),

                enrollmentYear:
                  lawyer.enrollment_year
                    ? String(
                        lawyer.enrollment_year
                      )
                    : '',
              }
            }
          )

        setAdvocates(
          formatted
        )
      } catch (err: any) {
        console.error(
          'LOAD ADVOCATES ERROR:',
          err
        )

        setError(
          err.message ||
          'Failed to load advocates.'
        )

        setAdvocates([])
      } finally {
        setLoading(false)
      }
    }

    loadAdvocates()
  }, [])

  // =====================================================
  // SEARCH + FILTER ADVOCATES
  //
  // Search is intentionally normalized so that:
  //   Rajesh Kumar
  //   rajesh kumar
  //   RAJESH KUMAR
  //   RaJeSh KuMaR
  // all return the same advocate.
  //
  // It also supports partial matches and searches name,
  // specialization, location, and biography.
  // =====================================================

  const normalizeText = (value: unknown) =>
    String(value ?? '')
      .normalize('NFKC')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')

  const filtered = advocates.filter((a) => {
    const searchText = normalizeText(search)

    const advocateName = normalizeText(a.name)
    const advocateSpecialization = normalizeText(
      Array.isArray(a.specializations)
        ? a.specializations.join(' ')
        : a.specialization
    )
    const advocateLocation = normalizeText(a.city)
    const advocateBio = normalizeText(a.about)

    const matchesSearch =
      !searchText ||
      advocateName.includes(searchText) ||
      advocateSpecialization.includes(searchText) ||
      advocateLocation.includes(searchText) ||
      advocateBio.includes(searchText)

    const selectedDistrictName =
      district === 'All Districts'
        ? ''
        : normalizeText(district.split(' (')[0])

    const matchesDistrict =
      district === 'All Districts' ||
      advocateLocation === selectedDistrictName ||
      advocateLocation.includes(selectedDistrictName)

    const selectedPracticeArea = normalizeText(practiceArea)

    const matchesPracticeArea =
      practiceArea === 'All Practice Areas' ||
      (Array.isArray(a.specializations) &&
        a.specializations.some(
          (item: string) =>
            normalizeText(item) === selectedPracticeArea
        ))

    const matchesRating =
      Number(a.rating || 0) >= minRating

    const matchesAvailability =
      availability === 'All' ||
      (availability === 'Available Now' && a.available) ||
      (availability === 'Busy' && !a.available)

    return (
      matchesSearch &&
      matchesDistrict &&
      matchesPracticeArea &&
      matchesRating &&
      matchesAvailability
    )
  })

  // =====================================================
  // CLEAR FILTERS
  // =====================================================

  const clearFilters = () => {
    setDistrict(
      'All Districts'
    )

    setPracticeArea(
      'All Practice Areas'
    )

    setDistrictSearch('')

    setPracticeAreaSearch('')

    setMinRating(0)

    setAvailability('All')
  }

  const hasActiveFilters =
    district !==
      'All Districts' ||
    practiceArea !==
      'All Practice Areas' ||
    minRating > 0 ||
    availability !==
      'All'

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="page-enter">

      {/* =================================================
          HEADER
      ================================================= */}

      <div
        style={{
          marginBottom: 24,
        }}
      >
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
            color:
              'var(--text-muted)',
            fontSize:
              '0.9rem',
          }}
        >
          {advocates.length}{' '}
          registered advocates
        </p>
      </div>

      {/* =================================================
          SEARCH + FILTERS
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

          {/* MAIN SEARCH */}

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
                position:
                  'absolute',
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
              placeholder="Search by advocate name, specialization, district, or bio..."
              value={search}
              onChange={e =>
                setSearch(
                  e.target.value
                )
              }
              style={{
                paddingLeft: 32,
              }}
            />
          </div>

          {/* DISTRICT */}

          <SearchableFilter
            label="District"
            value={district}
            options={[
              'All Districts',
              ...indiaDistricts,
            ]}
            search={
              districtSearch
            }
            setSearch={
              setDistrictSearch
            }
            onChange={
              setDistrict
            }
          />

          {/* PRACTICE AREA */}

          <SearchableFilter
            label="Practice Area"
            value={
              practiceArea
            }
            options={[
              'All Practice Areas',
              ...practiceAreas,
            ]}
            search={
              practiceAreaSearch
            }
            setSearch={
              setPracticeAreaSearch
            }
            onChange={
              setPracticeArea
            }
          />

          {/* MORE FILTERS */}

          <button
            type="button"
            onClick={() =>
              setShowFilters(
                s => !s
              )
            }
            style={{
              padding:
                '8px 14px',
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
              cursor:
                'pointer',
              display: 'flex',
              alignItems:
                'center',
              gap: 6,
              fontSize:
                '0.875rem',
              fontWeight: 500,
            }}
          >
            <Filter
              size={14}
            />

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
                  fontSize:
                    '0.78rem',
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
                {[
                  0,
                  4,
                  4.5,
                  4.8,
                ].map(r => (
                  <button
                    type="button"
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
                      cursor:
                        'pointer',
                      background:
                        minRating ===
                        r
                          ? 'var(--blue-subtle)'
                          : 'var(--bg-secondary)',
                      color:
                        minRating ===
                        r
                          ? 'var(--blue)'
                          : 'var(--text-muted)',
                    }}
                  >
                    {r === 0
                      ? 'Any'
                      : `${r}+`} ⭐
                  </button>
                ))}
              </div>
            </div>

            {/* AVAILABILITY */}

            <div>
              <label
                style={{
                  fontSize:
                    '0.78rem',
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
                ).map(option => (
                  <button
                    type="button"
                    key={option}
                    onClick={() =>
                      setAvailability(
                        option
                      )
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
                      cursor:
                        'pointer',
                      background:
                        availability ===
                        option
                          ? 'var(--blue-subtle)'
                          : 'var(--bg-secondary)',
                      color:
                        availability ===
                        option
                          ? 'var(--blue)'
                          : 'var(--text-muted)',
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* CLEAR */}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                style={{
                  padding:
                    '7px 12px',
                  borderRadius: 7,
                  border:
                    '1px solid var(--border)',
                  background:
                    'var(--bg-secondary)',
                  color:
                    'var(--blue)',
                  cursor:
                    'pointer',
                  fontSize:
                    '0.78rem',
                  fontWeight: 600,
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* =================================================
          LOADING
      ================================================= */}

      {loading && (
        <div
          style={{
            padding: 60,
            textAlign: 'center',
            color:
              'var(--text-muted)',
          }}
        >
          Loading advocates...
        </div>
      )}

      {/* =================================================
          ERROR
      ================================================= */}

      {!loading &&
        error && (
          <div
            className="card"
            style={{
              padding: 30,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '2rem',
                marginBottom: 10,
              }}
            >
              ⚠️
            </div>

            <div
              style={{
                fontWeight: 700,
                color:
                  'var(--text)',
                marginBottom: 6,
              }}
            >
              Unable to load advocates
            </div>

            <div
              style={{
                color:
                  'var(--text-muted)',
                fontSize:
                  '0.9rem',
              }}
            >
              {error}
            </div>
          </div>
        )}

      {/* =================================================
          RESULTS COUNT
      ================================================= */}

      {!loading &&
        !error && (
          <div
            style={{
              marginBottom: 16,
              display: 'flex',
              alignItems:
                'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize:
                  '0.875rem',
                color:
                  'var(--text-muted)',
              }}
            >
              Showing{' '}

              <strong
                style={{
                  color:
                    'var(--text)',
                }}
              >
                {filtered.length}
              </strong>{' '}

              advocates
            </span>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={
                  clearFilters
                }
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
        )}

      {/* =================================================
          ADVOCATE CARDS
      ================================================= */}

      {!loading &&
        !error &&
        filtered.length > 0 && (
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

                {/* TOP */}

                <div
                  style={{
                    display: 'flex',
                    gap: 14,
                    marginBottom: 14,
                  }}
                >

                  {/* AVATAR */}

                  <div
                    className="avatar"
                    style={{
                      width: 56,
                      height: 56,
                      fontSize:
                        '1rem',
                      background:
                        `linear-gradient(135deg, ${a.color}, ${a.color}88)`,
                    }}
                  >
                    {a.initials}
                  </div>

                  {/* NAME */}

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
                            a.available
                              ? 'var(--emerald-subtle)'
                              : 'var(--bg-secondary)',
                          color:
                            a.available
                              ? 'var(--emerald)'
                              : 'var(--text-muted)',
                        }}
                      >
                        {a.available
                          ? '● Available'
                          : '○ Busy'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SPECIALIZATIONS */}

                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                    marginBottom: 12,
                  }}
                >
                  {a.specializations.map(
                    (s: string) => (
                      <span
                        key={s}
                        className="badge"
                        style={{
                          background:
                            `color-mix(in srgb, ${a.color} 10%, transparent)`,
                          color:
                            a.color,
                        }}
                      >
                        {s}
                      </span>
                    )
                  )}
                </div>

                {/* BIO */}

                <p
                  style={{
                    fontSize:
                      '0.8rem',
                    color:
                      'var(--text-muted)',
                    lineHeight: 1.5,
                    marginBottom: 14,
                  }}
                >
                  {a.about}
                </p>

                {/* META */}

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(4, 1fr)',
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <MetaStat
                    icon={Star}
                    val={
                      a.rating
                        ? `${a.rating}`
                        : 'New'
                    }
                    sub={
                      a.reviews
                        ? `${a.reviews} reviews`
                        : 'No reviews'
                    }
                    iconColor="#F59E0B"
                    fill
                  />

                  <MetaStat
                    icon={Briefcase}
                    val={
                      a.experience
                        ? `${a.experience}yr`
                        : '—'
                    }
                    sub="experience"
                  />

                  <MetaStat
                    icon={MapPin}
                    val={a.city}
                    sub={a.court}
                  />

                  <MetaStat
                    icon={Globe}
                    val={
                      a.languages.length
                        .toString()
                    }
                    sub="languages"
                  />
                </div>

                {/* LANGUAGES */}

                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                    marginBottom: 16,
                  }}
                >
                  {a.languages.map(
                    (language: string) => (
                      <span
                        key={language}
                        style={{
                          padding:
                            '2px 8px',
                          borderRadius: 6,
                          fontSize:
                            '0.68rem',
                          fontWeight: 500,
                          background:
                            'var(--bg-secondary)',
                          color:
                            'var(--text-muted)',
                          border:
                            '1px solid var(--border)',
                        }}
                      >
                        {language}
                      </span>
                    )
                  )}
                </div>

                {/* FOOTER */}

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
                    gap: 12,
                  }}
                >

                  {/* FEE DISPLAY */}

                  <div>
                    <div
                      style={{
                        fontSize:
                          '1.2rem',
                        fontWeight: 800,
                        color:
                          'var(--text)',
                      }}
                    >
                      {a.fee > 0
                        ? `₹${a.fee.toLocaleString()}`
                        : 'Contact'}
                    </div>

                    <div
                      style={{
                        fontSize:
                          '0.7rem',
                        color:
                          'var(--text-muted)',
                      }}
                    >
                      consultation
                    </div>
                  </div>

                  {/* BUTTONS */}

                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      flexWrap:
                        'wrap',
                      justifyContent:
                        'flex-end',
                    }}
                  >

                    {/* VIEW PROFILE */}

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedAdvocate(
                          a
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
                          'var(--bg-secondary)',
                        color:
                          'var(--text-muted)',
                        cursor:
                          'pointer',
                      }}
                    >
                      View Profile
                    </button>

                    {/* BOOK */}

                    <Link
                      to={`/dashboard/booking?advocateId=${a.id}`}
                      className={
                        a.available
                          ? 'btn-primary'
                          : ''
                      }
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
                        ...(a.available
                          ? {}
                          : {
                              background:
                                'var(--bg-secondary)',
                              color:
                                'var(--text-subtle)',
                              border:
                                '1px solid var(--border)',
                              cursor:
                                'not-allowed',
                              opacity: 0.6,
                            }),
                      }}
                    >
                      <Clock
                        size={13}
                      />

                      {a.available
                        ? 'Book Consultation'
                        : 'Unavailable'}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* =================================================
          NO ADVOCATES
      ================================================= */}

      {!loading &&
        !error &&
        filtered.length === 0 && (
          <div
            style={{
              padding:
                '60px 20px',
              textAlign: 'center',
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
                marginBottom: 14,
              }}
            >
              No registered advocates
              match your filters.
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                style={{
                  padding:
                    '8px 14px',
                  borderRadius: 8,
                  border:
                    '1px solid var(--border)',
                  background:
                    'var(--bg-secondary)',
                  color:
                    'var(--blue)',
                  cursor:
                    'pointer',
                  fontWeight: 600,
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

      {/* =====================================================
          ADVOCATE PROFILE MODAL
      ===================================================== */}

      {selectedAdvocate && (
        <div
          onClick={() =>
            setSelectedAdvocate(null)
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background:
              'rgba(0, 0, 0, 0.68)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            backdropFilter:
              'blur(5px)',
          }}
        >
          <div
            onClick={e =>
              e.stopPropagation()
            }
            style={{
              width: '100%',
              maxWidth: 700,
              maxHeight: '90vh',
              overflowY: 'auto',
              background:
                'var(--bg)',
              border:
                '1px solid var(--border)',
              borderRadius: 18,
              boxShadow:
                '0 25px 80px rgba(0,0,0,0.4)',
            }}
          >

            {/* MODAL HEADER */}

            <div
              style={{
                padding: 24,
                borderBottom:
                  '1px solid var(--border)',
                display: 'flex',
                alignItems:
                  'flex-start',
                justifyContent:
                  'space-between',
                gap: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  alignItems:
                    'center',
                  minWidth: 0,
                }}
              >
                <div
                  className="avatar"
                  style={{
                    width: 68,
                    height: 68,
                    fontSize:
                      '1.15rem',
                    flexShrink: 0,
                    background:
                      `linear-gradient(135deg, ${selectedAdvocate.color}, ${selectedAdvocate.color}88)`,
                  }}
                >
                  {
                    selectedAdvocate.initials
                  }
                </div>

                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems:
                        'center',
                      gap: 8,
                      flexWrap:
                        'wrap',
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize:
                          '1.25rem',
                        fontWeight: 800,
                        color:
                          'var(--text)',
                      }}
                    >
                      {
                        selectedAdvocate.name
                      }
                    </h2>

                    {selectedAdvocate.verified && (
                      <span
                        style={{
                          padding:
                            '3px 8px',
                          borderRadius:
                            999,
                          fontSize:
                            '0.68rem',
                          fontWeight: 700,
                          background:
                            'var(--emerald-subtle)',
                          color:
                            'var(--emerald)',
                        }}
                      >
                        ✓ Verified
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize:
                        '0.78rem',
                      color:
                        'var(--emerald)',
                      fontWeight: 600,
                    }}
                  >
                    Registered Advocate
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedAdvocate(
                    null
                  )
                }
                aria-label="Close profile"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  border:
                    '1px solid var(--border)',
                  background:
                    'var(--bg-secondary)',
                  color:
                    'var(--text-muted)',
                  cursor:
                    'pointer',
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  flexShrink: 0,
                }}
              >
                <X size={17} />
              </button>
            </div>

            {/* MODAL CONTENT */}

            <div
              style={{
                padding: 24,
              }}
            >

              {/* CONTACT */}

              <div
                style={{
                  marginBottom: 24,
                }}
              >
                <h3
                  style={{
                    margin:
                      '0 0 12px',
                    fontSize:
                      '0.9rem',
                    fontWeight: 800,
                    color:
                      'var(--text)',
                  }}
                >
                  Contact Information
                </h3>

                <div
                  className="advocate-profile-details"
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(2, minmax(0, 1fr))',
                    gap: 12,
                  }}
                >
                  <ProfileDetail
                    label="Email"
                    value={
                      selectedAdvocate.email ||
                      'Not provided'
                    }
                  />

                  <ProfileDetail
                    label="Phone"
                    value={
                      selectedAdvocate.phone
                        ? `******${String(
                            selectedAdvocate.phone
                          ).slice(-4)}`
                        : 'Not provided'
                    }
                  />

                  <ProfileDetail
                    label="District / Location"
                    value={
                      selectedAdvocate.city ||
                      'Not provided'
                    }
                  />

                  <ProfileDetail
                    label="Court"
                    value={
                      selectedAdvocate.court ||
                      'Not provided'
                    }
                  />
                </div>
              </div>

              {/* PROFESSIONAL */}

              <div
                style={{
                  marginBottom: 24,
                }}
              >
                <h3
                  style={{
                    margin:
                      '0 0 12px',
                    fontSize:
                      '0.9rem',
                    fontWeight: 800,
                    color:
                      'var(--text)',
                  }}
                >
                  Professional Information
                </h3>

                <div
                  className="advocate-profile-details"
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(2, minmax(0, 1fr))',
                    gap: 12,
                  }}
                >
                  <ProfileDetail
                    label="Experience"
                    value={
                      selectedAdvocate.experience
                        ? `${selectedAdvocate.experience} years`
                        : 'Not provided'
                    }
                  />

                  <ProfileDetail
                    label="Enrollment Year"
                    value={
                      selectedAdvocate.enrollmentYear ||
                      'Not provided'
                    }
                  />
                </div>

                {/* PRACTICE AREAS */}

                <div
                  style={{
                    marginTop: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        '0.72rem',
                      color:
                        'var(--text-muted)',
                      marginBottom: 7,
                      fontWeight: 600,
                    }}
                  >
                    Practice Areas
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 7,
                      flexWrap:
                        'wrap',
                    }}
                  >
                    {selectedAdvocate
                      .specializations
                      .map(
                        (
                          specialization: string
                        ) => (
                          <span
                            key={
                              specialization
                            }
                            className="badge"
                            style={{
                              background:
                                'var(--blue-subtle)',
                              color:
                                'var(--blue)',
                            }}
                          >
                            {
                              specialization
                            }
                          </span>
                        )
                      )}
                  </div>
                </div>
              </div>

              {/* ABOUT */}

              <div>
                <h3
                  style={{
                    margin:
                      '0 0 10px',
                    fontSize:
                      '0.9rem',
                    fontWeight: 800,
                    color:
                      'var(--text)',
                  }}
                >
                  About
                </h3>

                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background:
                      'var(--bg-secondary)',
                    border:
                      '1px solid var(--border)',
                    color:
                      'var(--text-muted)',
                    fontSize:
                      '0.85rem',
                    lineHeight: 1.65,
                    whiteSpace:
                      'pre-wrap',
                  }}
                >
                  {
                    selectedAdvocate.about ||
                    'No biography provided.'
                  }
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}

            <div
              style={{
                padding:
                  '16px 24px',
                borderTop:
                  '1px solid var(--border)',
                display: 'flex',
                justifyContent:
                  'flex-end',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setSelectedAdvocate(
                    null
                  )
                }
                style={{
                  padding:
                    '9px 16px',
                  borderRadius: 8,
                  border:
                    '1px solid var(--border)',
                  background:
                    'var(--bg-secondary)',
                  color:
                    'var(--text-muted)',
                  cursor:
                    'pointer',
                  fontWeight: 600,
                }}
              >
                Close
              </button>

              <Link
                to={`/dashboard/booking?advocateId=${selectedAdvocate.id}`}
                onClick={() =>
                  setSelectedAdvocate(
                    null
                  )
                }
                className="btn-primary"
                style={{
                  padding:
                    '9px 16px',
                  borderRadius: 8,
                  textDecoration:
                    'none',
                  fontWeight: 700,
                }}
              >
                Book Consultation
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          RESPONSIVE
      ================================================= */}

      <style>{`

        @media (max-width: 900px) {

          .advocates-grid {
            grid-template-columns:
              1fr !important;
          }

        }

        @media (max-width: 600px) {

          .advocate-profile-details {
            grid-template-columns:
              1fr !important;
          }

        }

      `}</style>

    </div>
  )
}


// =====================================================
// SEARCHABLE FILTER
// =====================================================

function SearchableFilter({
  label,
  value,
  options,
  search,
  setSearch,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  search: string
  setSearch: (value: string) => void
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)

  // Normalize ONLY the dropdown search text.
  // This makes District and Practice Area searches:
  //   Amritsar
  //   amritsar
  //   AMRITSAR
  //   AmRiTsAr
  // behave identically.
  const normalizeFilterText = (value: unknown) =>
    String(value ?? '')
      .normalize('NFKC')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')

  const normalizedSearch = normalizeFilterText(search)

  // Search the COMPLETE option label.
  // Examples:
  // "amrit" -> "Amritsar (Punjab)"
  // "punjab" -> "Amritsar (Punjab)"
  // "criminal" -> "Criminal Law"
  // "CRIM" -> "Criminal Law"
  const filteredOptions = options.filter((option) =>
    normalizeFilterText(option).includes(normalizedSearch)
  )

  const allOption = options[0]
  const matchingOptions = filteredOptions.filter(
    (option) => option !== allOption
  )

  const handleSelect = (option: string) => {
    onChange(option)
    setSearch('')
    setOpen(false)
  }

  return (
    <div
      style={{
        position: 'relative',
        minWidth: 190,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: '100%',
          minWidth: 190,
          padding: '8px 32px 8px 12px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          color: 'var(--text)',
          fontSize: '0.875rem',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
          position: 'relative',
        }}
      >
        <span
          style={{
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </span>

        <ChevronDown
          size={14}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}
        />
      </button>

      {open && (
        <>
          {/* BACKDROP */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999,
            }}
          />

          {/* DROPDOWN */}
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              width: 300,
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: 380,
              overflowY: 'auto',
              zIndex: 1000,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              boxShadow: '0 15px 40px rgba(0,0,0,0.25)',
              padding: 8,
            }}
          >
            {/* SEARCH INPUT */}
            <div
              style={{
                position: 'relative',
                marginBottom: 8,
              }}
            >
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />

              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearch('')
                    setOpen(false)
                  }

                  if (e.key === 'Enter' && matchingOptions.length === 1) {
                    e.preventDefault()
                    handleSelect(matchingOptions[0])
                  }
                }}
                placeholder={`Search ${label.toLowerCase()}...`}
                className="input"
                style={{
                  width: '100%',
                  paddingLeft: 30,
                  paddingRight: search ? 30 : 10,
                }}
              />

              {search && (
                <button
                  type="button"
                  aria-label={`Clear ${label} search`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSearch('')
                  }}
                  style={{
                    position: 'absolute',
                    right: 7,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 24,
                    height: 24,
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* ALL OPTION */}
            {!normalizedSearch && (
              <button
                type="button"
                onClick={() => handleSelect(allOption)}
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  border: 'none',
                  borderRadius: 7,
                  background:
                    value === allOption
                      ? 'var(--blue-subtle)'
                      : 'transparent',
                  color:
                    value === allOption
                      ? 'var(--blue)'
                      : 'var(--text)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                }}
              >
                {allOption}
              </button>
            )}

            {/* SEARCH RESULTS */}
            {matchingOptions.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => handleSelect(option)}
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  border: 'none',
                  borderRadius: 7,
                  background:
                    value === option
                      ? 'var(--blue-subtle)'
                      : 'transparent',
                  color:
                    value === option
                      ? 'var(--blue)'
                      : 'var(--text)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                }}
              >
                {option}
              </button>
            ))}

            {/* NO RESULT */}
            {matchingOptions.length === 0 && (
              <div
                style={{
                  padding: 14,
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                }}
              >
                No {label.toLowerCase()} found
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}


// =====================================================
// PROFILE DETAIL
// =====================================================

function ProfileDetail({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        background:
          'var(--bg-secondary)',
        border:
          '1px solid var(--border)',
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize:
            '0.7rem',
          color:
            'var(--text-muted)',
          marginBottom: 4,
          fontWeight: 600,
        }}
      >
        {label}
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
        {value}
      </div>
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
        textAlign:
          'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems:
            'center',
          justifyContent:
            'center',
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
              ? iconColor ||
                'currentColor'
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