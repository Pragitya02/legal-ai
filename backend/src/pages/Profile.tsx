import { useState } from 'react'
import { useLocation } from 'react-router'
import {
  Camera,
  Edit2,
  Save,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Award,
  FileText,
} from 'lucide-react'

export default function Profile() {
  const location = useLocation()
  const isAdvocate = location.pathname.startsWith('/advocate')

  /* =====================================================
     GET LOGGED-IN USER
     ===================================================== */

  let savedUser: any = {}

  try {
    const storedUser = localStorage.getItem('user')

    if (
      storedUser &&
      storedUser !== 'undefined' &&
      storedUser !== 'null'
    ) {
      savedUser = JSON.parse(storedUser)
    }
  } catch (error) {
    console.error(
      'ERROR READING USER FROM LOCALSTORAGE:',
      error
    )

    savedUser = {}
  }

  /* =====================================================
     USER NAME
     ===================================================== */

  const loggedInName =
    savedUser?.fullName ||
    savedUser?.full_name ||
    savedUser?.name ||
    savedUser?.advocateName ||
    savedUser?.displayName ||
    savedUser?.username ||
    (isAdvocate ? 'Advocate' : 'Citizen')

  /* =====================================================
     USER EMAIL
     ===================================================== */

  const loggedInEmail =
    savedUser?.email ||
    (isAdvocate
      ? ''
      : 'gaurav.mehta@gmail.com')

  /* =====================================================
     USER PHONE
     ===================================================== */

  const loggedInPhone =
    savedUser?.phone ||
    savedUser?.phoneNumber ||
    savedUser?.mobile ||
    (isAdvocate
      ? ''
      : '+91 91234 56789')

  /* =====================================================
     USER CITY
     ===================================================== */

  const loggedInCity =
    savedUser?.city ||
    savedUser?.location ||
    (isAdvocate
      ? 'New Delhi'
      : 'Noida, Uttar Pradesh')

  /* =====================================================
     CLEAN ADVOCATE NAME
     ===================================================== */

  const cleanName = String(loggedInName)
    .replace(/^Adv\.\s*/i, '')
    .trim()

  /* =====================================================
     INITIALS
     ===================================================== */

  const getInitials = (name: string) => {
    const words = name
      .split(/\s+/)
      .filter(Boolean)

    if (words.length >= 2) {
      return (
        words[0].charAt(0) +
        words[1].charAt(0)
      ).toUpperCase()
    }

    return name
      .slice(0, 2)
      .toUpperCase()
  }

  const userInitials = getInitials(cleanName)

  /* =====================================================
     STATE
     ===================================================== */

  const [editing, setEditing] = useState(false)

  const [name, setName] = useState(
    cleanName
  )

  const [email, setEmail] = useState(
    loggedInEmail
  )

  const [phone, setPhone] = useState(
    loggedInPhone
  )

  const [city, setCity] = useState(
    loggedInCity
  )

  const [bio, setBio] = useState(
    isAdvocate
      ? 'Senior advocate with experience in property law, real estate disputes, and tenancy matters.'
      : 'Tech professional seeking legal guidance on property and employment matters.'
  )

  /* =====================================================
     APPOINTMENTS
     ===================================================== */

  const appointments = [
    {
      with: isAdvocate
        ? 'Gaurav Mehta'
        : 'Adv. Kavita Srinivasan',
      date: '10 Aug 2026, 3:00 PM',
      type: 'Property Dispute',
      mode: 'Video',
      status: 'Upcoming',
    },
    {
      with: isAdvocate
        ? 'Sneha Patel'
        : 'Adv. Aman Joshi',
      date: '5 Jul 2026, 11:00 AM',
      type: 'Consumer Complaint',
      mode: 'In-Person',
      status: 'Completed',
    },
  ]

  /* =====================================================
     DOCUMENTS
     ===================================================== */

  const documents = [
    {
      name: 'Rental Agreement — Sector 45, Noida.pdf',
      size: '2.4 MB',
      date: '28 Jul 2026',
      type: 'Contract',
    },
    {
      name: 'Security Deposit Receipt — HDFC Bank.pdf',
      size: '180 KB',
      date: '15 Mar 2025',
      type: 'Receipt',
    },
    {
      name: 'AI Legal Report — Property Dispute.pdf',
      size: '1.1 MB',
      date: '30 Jul 2026',
      type: 'AI Report',
    },
  ]

  return (
    <div
      className="page-enter"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        maxWidth: 860,
      }}
    >

      {/* =====================================================
          PROFILE HEADER
          ===================================================== */}

      <div
        className="card"
        style={{ padding: 28 }}
      >
        <div
          style={{
            display: 'flex',
            gap: 24,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >

          {/* =================================================
              AVATAR
              ================================================= */}

          <div
            style={{
              position: 'relative',
            }}
          >
            <div
              className="avatar"
              style={{
                width: 88,
                height: 88,
                fontSize: '1.8rem',
                background: isAdvocate
                  ? 'linear-gradient(135deg, var(--emerald), #065F46)'
                  : 'linear-gradient(135deg, var(--blue), #7C3AED)',
              }}
            >
              {userInitials}
            </div>

            <button
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 28,
                height: 28,
                borderRadius: '50%',
                border:
                  '2px solid var(--bg-card)',
                background: 'var(--blue)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Camera
                size={13}
                color="white"
              />
            </button>
          </div>

          {/* =================================================
              USER INFORMATION
              ================================================= */}

          <div
            style={{
              flex: 1,
              minWidth: 200,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 4,
                flexWrap: 'wrap',
              }}
            >

              <h1
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: 'var(--text)',
                  letterSpacing:
                    '-0.02em',
                }}
              >
                {isAdvocate
                  ? `Adv. ${name}`
                  : name}
              </h1>

              {isAdvocate && (
                <span
                  style={{
                    display:
                      'inline-flex',
                    alignItems:
                      'center',
                    gap: 4,
                    padding:
                      '4px 10px',
                    borderRadius: 99,
                    fontSize:
                      '0.7rem',
                    fontWeight: 700,
                    background:
                      'var(--emerald-subtle)',
                    color:
                      'var(--emerald)',
                    border:
                      '1px solid var(--emerald-light)',
                  }}
                >
                  <Award size={11} />
                  Verified Advocate
                </span>
              )}
            </div>

            {/* CONTACT INFORMATION */}

            <div
              style={{
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              {(
                [
                  [Mail, email],
                  [Phone, phone],
                  [MapPin, city],
                ] as [
                  typeof Mail,
                  string
                ][]
              ).map(
                ([Icon, val], i) => (
                  <div
                    key={i}
                    style={{
                      display:
                        'flex',
                      alignItems:
                        'center',
                      gap: 5,
                      fontSize:
                        '0.82rem',
                      color:
                        'var(--text-muted)',
                    }}
                  >
                    <Icon
                      size={13}
                      style={{
                        color:
                          'var(--text-subtle)',
                        flexShrink: 0,
                      }}
                    />

                    {val || 'Not provided'}
                  </div>
                )
              )}
            </div>

            {/* ADVOCATE STATS */}

            {isAdvocate && (
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  marginTop: 12,
                  flexWrap: 'wrap',
                }}
              >
                {[
                  ['4.9 ⭐', '218 reviews'],
                  ['15yr', 'experience'],
                  ['312', 'cases'],
                  ['Delhi HC', 'court'],
                ].map(
                  ([v, l]) => (
                    <div key={l}>
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            'var(--text)',
                          fontSize:
                            '0.9rem',
                        }}
                      >
                        {v}
                      </span>

                      <span
                        style={{
                          color:
                            'var(--text-muted)',
                          fontSize:
                            '0.75rem',
                          marginLeft: 4,
                        }}
                      >
                        {l}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* =================================================
              EDIT BUTTON
              ================================================= */}

          <button
            onClick={() =>
              setEditing(!editing)
            }
            className={
              editing
                ? 'btn-emerald'
                : 'btn-ghost'
            }
            style={{
              padding:
                '9px 18px',
              borderRadius: 9,
              fontSize:
                '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: editing
                ? 'none'
                : '1px solid var(--border)',
              display: 'flex',
              alignItems:
                'center',
              gap: 6,
            }}
          >
            {editing ? (
              <>
                <Save size={14} />
                Save Changes
              </>
            ) : (
              <>
                <Edit2 size={14} />
                Edit Profile
              </>
            )}
          </button>
        </div>
      </div>

      {/* =====================================================
          PERSONAL INFORMATION
          ===================================================== */}

      <div
        className="card"
        style={{ padding: 24 }}
      >
        <h2
          style={{
            fontWeight: 700,
            color: 'var(--text)',
            fontSize: '0.95rem',
            marginBottom: 20,
          }}
        >
          Personal Information
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              '1fr 1fr',
            gap: 16,
          }}
          className="form-grid"
        >
          {[
            {
              label: 'Full Name',
              val: name,
              set: setName,
              type: 'text',
            },
            {
              label:
                'Email Address',
              val: email,
              set: setEmail,
              type: 'email',
            },
            {
              label:
                'Phone Number',
              val: phone,
              set: setPhone,
              type: 'tel',
            },
            {
              label:
                'City / Location',
              val: city,
              set: setCity,
              type: 'text',
            },
          ].map((f) => (
            <div key={f.label}>
              <label
                style={{
                  fontSize:
                    '0.78rem',
                  fontWeight: 600,
                  color:
                    'var(--text-muted)',
                  display:
                    'block',
                  marginBottom: 6,
                }}
              >
                {f.label}
              </label>

              <input
                type={f.type}
                className="input"
                value={f.val}
                onChange={(e) =>
                  f.set(
                    e.target.value
                  )
                }
                readOnly={!editing}
              />
            </div>
          ))}
        </div>

        {/* BIO */}

        <div
          style={{
            marginTop: 16,
          }}
        >
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
            Bio / About
          </label>

          <textarea
            className="input"
            rows={3}
            value={bio}
            onChange={(e) =>
              setBio(
                e.target.value
              )
            }
            readOnly={!editing}
            style={{
              resize: editing
                ? 'vertical'
                : 'none',
            }}
          />
        </div>

        {/* ADVOCATE INFORMATION */}

        {isAdvocate && (
          <div
            style={{
              marginTop: 16,
              display: 'grid',
              gridTemplateColumns:
                '1fr 1fr',
              gap: 16,
            }}
            className="form-grid"
          >
            {[
              [
                'Bar Council No.',
                'D/1624/2018',
              ],
              [
                'Practice Area',
                'Property & Real Estate Law',
              ],
              [
                'High Court',
                'Delhi High Court',
              ],
              [
                'Enrollment Year',
                '2009',
              ],
            ].map(
              ([l, v]) => (
                <div key={l}>
                  <label
                    style={{
                      fontSize:
                        '0.78rem',
                      fontWeight: 600,
                      color:
                        'var(--text-muted)',
                      display:
                        'block',
                      marginBottom: 6,
                    }}
                  >
                    {l}
                  </label>

                  <input
                    type="text"
                    className="input"
                    defaultValue={v}
                    readOnly={!editing}
                  />
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* =====================================================
          DOCUMENTS
          ===================================================== */}

      <div
        className="card"
        style={{ padding: 24 }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems:
              'center',
            marginBottom: 18,
          }}
        >
          <h2
            style={{
              fontWeight: 700,
              color:
                'var(--text)',
              fontSize:
                '0.95rem',
            }}
          >
            {isAdvocate
              ? 'Credentials & Documents'
              : 'Uploaded Documents'}
          </h2>

          <button
            className="btn-primary"
            style={{
              padding:
                '7px 14px',
              borderRadius: 8,
              fontSize:
                '0.78rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Upload +
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection:
              'column',
            gap: 10,
          }}
        >
          {documents.map(
            (d, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems:
                    'center',
                  gap: 12,
                  padding:
                    '12px 14px',
                  borderRadius: 10,
                  background:
                    'var(--bg-secondary)',
                  border:
                    '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    flexShrink: 0,
                    background:
                      'var(--blue-subtle)',
                    display:
                      'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                  }}
                >
                  <FileText
                    size={16}
                    style={{
                      color:
                        'var(--blue)',
                    }}
                  />
                </div>

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 500,
                      color:
                        'var(--text)',
                      fontSize:
                        '0.85rem',
                      overflow:
                        'hidden',
                      textOverflow:
                        'ellipsis',
                      whiteSpace:
                        'nowrap',
                    }}
                  >
                    {d.name}
                  </div>

                  <div
                    style={{
                      fontSize:
                        '0.7rem',
                      color:
                        'var(--text-muted)',
                      marginTop: 2,
                    }}
                  >
                    {d.size} · {d.date}
                  </div>
                </div>

                <span
                  className="badge"
                  style={{
                    background:
                      'var(--blue-subtle)',
                    color:
                      'var(--blue)',
                  }}
                >
                  {d.type}
                </span>

                <button
                  style={{
                    padding:
                      '5px 10px',
                    borderRadius: 6,
                    border:
                      '1px solid var(--border)',
                    background:
                      'var(--bg-card)',
                    fontSize:
                      '0.72rem',
                    color:
                      'var(--text-muted)',
                    cursor:
                      'pointer',
                  }}
                >
                  Download
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* =====================================================
          APPOINTMENTS
          ===================================================== */}

      <div
        className="card"
        style={{ padding: 24 }}
      >
        <h2
          style={{
            fontWeight: 700,
            color:
              'var(--text)',
            fontSize:
              '0.95rem',
            marginBottom: 18,
          }}
        >
          Appointments
        </h2>

        <div
          style={{
            display: 'flex',
            flexDirection:
              'column',
            gap: 12,
          }}
        >
          {appointments.map(
            (a, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding:
                    '14px 16px',
                  borderRadius: 10,
                  background:
                    'var(--bg-secondary)',
                  border:
                    '1px solid var(--border)',
                  flexWrap:
                    'wrap',
                }}
              >
                <div
                  className="avatar"
                  style={{
                    width: 36,
                    height: 36,
                    fontSize:
                      '0.75rem',
                  }}
                >
                  {a.with
                    .split(' ')
                    .map(
                      (w) =>
                        w[0]
                    )
                    .join('')
                    .slice(
                      0,
                      2
                    )
                    .toUpperCase()}
                </div>

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color:
                        'var(--text)',
                      fontSize:
                        '0.875rem',
                    }}
                  >
                    {isAdvocate
                      ? 'Client: '
                      : ''}
                    {a.with}
                  </div>

                  <div
                    style={{
                      fontSize:
                        '0.75rem',
                      color:
                        'var(--text-muted)',
                      marginTop: 3,
                      display:
                        'flex',
                      gap: 10,
                    }}
                  >
                    <span>
                      <Calendar
                        size={11}
                        style={{
                          verticalAlign:
                            'middle',
                          marginRight: 3,
                        }}
                      />
                      {a.date}
                    </span>

                    <span>
                      {a.type}
                    </span>

                    <span>
                      {a.mode}
                    </span>
                  </div>
                </div>

                <span
                  className="badge"
                  style={{
                    background:
                      a.status ===
                      'Upcoming'
                        ? 'var(--blue-subtle)'
                        : 'var(--emerald-subtle)',
                    color:
                      a.status ===
                      'Upcoming'
                        ? 'var(--blue)'
                        : 'var(--emerald)',
                  }}
                >
                  {a.status}
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* =====================================================
          RESPONSIVE
          ===================================================== */}

      <style>{`
        @media (max-width: 700px) {
          .form-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}