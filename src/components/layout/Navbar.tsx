import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { isLoggedIn } from '../../lib/auth'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Features', href: '/#features' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Find Advocates', href: '/dashboard/advocates' },
  { label: 'About', href: '/#about' },
  { label: 'Contact', href: '/#contact' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Close the Contact popup whenever the user clicks anywhere
  // outside the Contact button/popup itself.
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null

      if (target?.closest('[data-contact-control="true"]')) {
        return
      }

      setContactOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  const handleProtectedNavigation = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (href !== '/dashboard/advocates') return

    e.preventDefault()

    if (isLoggedIn()) {
      navigate(href)
    } else {
      navigate('/login', {
        state: { from: href },
      })
    }

    setMobileOpen(false)
  }

  return (
<nav
  className="site-navbar"
  style={{
    position: 'sticky',
    top: 0,
    zIndex: 100,
    width: '100%',
    background: 'rgba(255, 255, 255, 0.58)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.48)',
    boxShadow: '0 8px 32px rgba(30, 20, 10, 0.10)',
  }}
>
      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '0 24px',
        }}
      >
        {/* =====================================================
            NAVBAR
            ===================================================== */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: 72,
            gap: 28,
          }}
        >

          {/* =====================================================
              NYAYA AI LOGO
              ===================================================== */}

          <Link
            to="/"
            aria-label="Nyaya AI Home"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '24px',
                fontWeight: 900,
                letterSpacing: '1px',
                lineHeight: 1,
                whiteSpace: 'nowrap',
                textShadow: '0 0 12px rgba(194,118,53,0.18)',
              }}
            >
              <span style={{ color: '#FFFFFF' }}>Nyaya</span><span style={{ color: '#C27635' }}>AI</span>
            </span>
          </Link>


          {/* =====================================================
              DESKTOP NAVIGATION
              ===================================================== */}

          <div
            className="hidden lg:flex"
            style={{
              alignItems: 'center',
              gap: 4,
              flex: 1,
            }}
          >
            {navLinks.map((link) => {

              const active =
                link.href === '/'
                  ? location.pathname === '/'
                  : location.pathname === link.href

              if (link.label === 'Contact') {
                return (
                  <div
                    key={link.label}
                    data-contact-control="true"
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setContactOpen((value) => !value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: contactOpen ? '#C27635' : '#E2E2E2',
                        textDecoration: 'none',
                        background: contactOpen
                          ? 'rgba(194,118,53,0.08)'
                          : 'transparent',
                        border: contactOpen
                          ? '1px solid rgba(194,118,53,0.22)'
                          : '1px solid transparent',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                      }}
                    >
                      Contact
                    </button>

                    {contactOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 10px)',
                          right: 0,
                          minWidth: 250,
                          padding: 10,
                          borderRadius: 10,
                          background: '#080808',
                          border: '1px solid rgba(194,118,53,0.45)',
                          boxShadow: '0 14px 35px rgba(0,0,0,0.6)',
                          zIndex: 1000,
                        }}
                      >
                        <a
                          href="mailto:nyaya.ai2007@gmail.com"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 12px',
                            borderRadius: 7,
                            color: '#E2E2E2',
                            textDecoration: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span style={{ color: '#C27635', fontSize: 17 }}>✉</span>
                          nyaya.ai2007@gmail.com
                        </a>
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) =>
                    handleProtectedNavigation(e, link.href)
                  }
                  style={{
                    padding: '8px 12px',

                    borderRadius: 8,

                    fontSize: '0.9rem',

                    fontWeight: 600,

                    color: active
                      ? '#C27635'
                      : '#E2E2E2',

                    textDecoration: 'none',

                    background: active
                      ? 'rgba(194,118,53,0.08)'
                      : 'transparent',

                    border: active
                      ? '1px solid rgba(194,118,53,0.22)'
                      : '1px solid transparent',

                    transition:
                      'all 0.2s ease',

                    whiteSpace: 'nowrap',
                  }}

                  onMouseEnter={(e) => {
                    e.currentTarget.style.color =
                      '#C27635'

                    e.currentTarget.style.background =
                      'rgba(194,118,53,0.08)'

                    e.currentTarget.style.borderColor =
                      'rgba(194,118,53,0.22)'
                  }}

                  onMouseLeave={(e) => {
                    e.currentTarget.style.color =
                      active
                        ? '#C27635'
                        : '#E2E2E2'

                    e.currentTarget.style.background =
                      active
                        ? 'rgba(194,118,53,0.08)'
                        : 'transparent'

                    e.currentTarget.style.borderColor =
                      active
                        ? 'rgba(194,118,53,0.22)'
                        : 'transparent'
                  }}
                >
                  {link.label}
                </a>
              )
            })}
          </div>


          {/* =====================================================
              RIGHT SIDE
              ===================================================== */}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginLeft: 'auto',
              flexShrink: 0,
            }}
          >

            {/* =================================================
                LOGIN
                ================================================= */}

            <Link
              to="/login"
              className="hidden sm:inline-flex"
              style={{
                height: 44,

                padding: '0 18px',

                borderRadius: 9,

                border:
                  '1px solid rgba(194,118,53,0.55)',

                background: '#050505',

                color: '#FFFFFF',

                textDecoration: 'none',

                fontSize: '0.9rem',

                fontWeight: 600,

                alignItems: 'center',

                justifyContent: 'center',

                transition:
                  'all 0.2s ease',
              }}

              onMouseEnter={(e) => {
                e.currentTarget.style.color =
                  '#C27635'

                e.currentTarget.style.borderColor =
                  '#C27635'

                e.currentTarget.style.background =
                  'rgba(194,118,53,0.08)'
              }}

              onMouseLeave={(e) => {
                e.currentTarget.style.color =
                  '#FFFFFF'

                e.currentTarget.style.borderColor =
                  'rgba(194,118,53,0.55)'

                e.currentTarget.style.background =
                  '#050505'
              }}
            >
              Login
            </Link>


            {/* =================================================
                GET STARTED
                ================================================= */}

            <Link
              to="/signup"
              className="hidden sm:inline-flex"
              style={{
                height: 44,

                padding: '0 22px',

                borderRadius: 9,

                background:
                  'linear-gradient(135deg, #E3A15F, #C27635)',

                border:
                  '1px solid #E3A15F',

                color: '#000000',

                textDecoration: 'none',

                fontSize: '0.9rem',

                fontWeight: 600,

                alignItems: 'center',

                justifyContent: 'center',

                gap: 8,

                boxShadow:
                  '0 5px 20px rgba(194,118,53,0.18)',

                transition:
                  'all 0.2s ease',
              }}

              onMouseEnter={(e) => {
                e.currentTarget.style.transform =
                  'translateY(-1px)'

                e.currentTarget.style.boxShadow =
                  '0 8px 25px rgba(194,118,53,0.28)'
              }}

              onMouseLeave={(e) => {
                e.currentTarget.style.transform =
                  'translateY(0)'

                e.currentTarget.style.boxShadow =
                  '0 5px 20px rgba(194,118,53,0.18)'
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  lineHeight: 1,
                  color: '#000000',
                  fontWeight: 900,
                }}
              >
                ✦
              </span>

              Get Started
            </Link>


            {/* =================================================
                GOLD THREE-LINE MENU
                ================================================= */}

            <button
              type="button"

              aria-label={
                mobileOpen
                  ? 'Close navigation menu'
                  : 'Open navigation menu'
              }

              onClick={() =>
                setMobileOpen(
                  (value) => !value
                )
              }

              className="lg:hidden"

              style={{
                width: 44,
                height: 44,

                padding: 0,

                borderRadius: 9,

                border:
                  '1.5px solid #C27635',

                background: '#050505',

                display: 'flex',

                flexDirection: 'column',

                alignItems: 'center',

                justifyContent: 'center',

                gap: 5,

                cursor: 'pointer',

                boxShadow:
                  '0 0 15px rgba(194,118,53,0.18)',
              }}
            >

              {mobileOpen ? (

                <>
                  <span
                    style={{
                      width: 23,
                      height: 2.5,
                      background: '#C27635',
                      borderRadius: 3,
                      display: 'block',
                      transform:
                        'rotate(45deg) translateY(5px)',
                    }}
                  />

                  <span
                    style={{
                      width: 23,
                      height: 2.5,
                      background: '#C27635',
                      borderRadius: 3,
                      display: 'block',
                      transform:
                        'rotate(-45deg) translateY(-5px)',
                    }}
                  />
                </>

              ) : (

                <>
                  <span
                    style={{
                      width: 23,
                      height: 2.5,
                      background: '#C27635',
                      borderRadius: 3,
                      display: 'block',
                    }}
                  />

                  <span
                    style={{
                      width: 23,
                      height: 2.5,
                      background: '#C27635',
                      borderRadius: 3,
                      display: 'block',
                    }}
                  />

                  <span
                    style={{
                      width: 23,
                      height: 2.5,
                      background: '#C27635',
                      borderRadius: 3,
                      display: 'block',
                    }}
                  />
                </>
              )}

            </button>

          </div>
        </div>


        {/* =====================================================
            MOBILE MENU
            ===================================================== */}

        {mobileOpen && (
          <div
            style={{
              borderTop:
                '1px solid rgba(194,118,53,0.20)',

              padding:
                '14px 0 18px',

              display: 'flex',

              flexDirection: 'column',

              gap: 5,

              background: '#000000',
            }}
          >

            {navLinks.map((link) => {

              const active =
                link.href === '/'
                  ? location.pathname === '/'
                  : location.pathname === link.href

              if (link.label === 'Contact') {
                return (
                  <div
                    key={link.label}
                    data-contact-control="true"
                    style={{ position: 'relative' }}
                  >
                    <button
                      type="button"
                      onClick={() => setContactOpen((value) => !value)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '11px 13px',
                        borderRadius: 8,
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: contactOpen ? '#C27635' : '#E2E2E2',
                        background: contactOpen
                          ? 'rgba(194,118,53,0.08)'
                          : 'transparent',
                        border: contactOpen
                          ? '1px solid rgba(194,118,53,0.18)'
                          : '1px solid transparent',
                        cursor: 'pointer',
                      }}
                    >
                      Contact
                    </button>

                    {contactOpen && (
                      <div
                        style={{
                          marginTop: 5,
                          padding: 8,
                          borderRadius: 8,
                          background: '#080808',
                          border: '1px solid rgba(194,118,53,0.35)',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                        }}
                      >
                        <a
                          href="mailto:nyaya.ai2007@gmail.com"
                          onClick={() => {
                            setContactOpen(false)
                            setMobileOpen(false)
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 9,
                            padding: '9px 10px',
                            borderRadius: 7,
                            color: '#E2E2E2',
                            textDecoration: 'none',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            wordBreak: 'break-word',
                          }}
                        >
                          <span style={{ color: '#C27635', fontSize: 17 }}>✉</span>
                          nyaya.ai2007@gmail.com
                        </a>
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <a
                  key={link.label}

                  href={link.href}

                  onClick={(e) =>
                    handleProtectedNavigation(e, link.href)
                  }

                  style={{
                    padding:
                      '11px 13px',

                    borderRadius: 8,

                    fontSize:
                      '0.9rem',

                    fontWeight: 600,

                    color: active
                      ? '#C27635'
                      : '#E2E2E2',

                    textDecoration:
                      'none',

                    background:
                      active
                        ? 'rgba(194,118,53,0.08)'
                        : 'transparent',

                    border:
                      active
                        ? '1px solid rgba(194,118,53,0.18)'
                        : '1px solid transparent',
                  }}
                >
                  {link.label}
                </a>
              )
            })}


            {/* MOBILE LOGIN + GET STARTED */}

            <div
              style={{
                display: 'flex',
                gap: 10,
                paddingTop: 10,
              }}
            >

              <Link
                to="/login"
                onClick={() =>
                  setMobileOpen(false)
                }
                style={{
                  flex: 1,

                  padding: 11,

                  borderRadius: 8,

                  textAlign: 'center',

                  border:
                    '1px solid rgba(194,118,53,0.55)',

                  color: '#FFFFFF',

                  background: '#050505',

                  textDecoration: 'none',

                  fontSize:
                    '0.875rem',

                  fontWeight: 600,
                }}
              >
                Login
              </Link>


              <Link
                to="/signup"
                onClick={() =>
                  setMobileOpen(false)
                }
                style={{
                  flex: 1,

                  padding: 11,

                  borderRadius: 8,

                  textAlign: 'center',

                  color: '#000000',

                  background:
                    'linear-gradient(135deg, #E3A15F, #C27635)',

                  textDecoration: 'none',

                  fontSize:
                    '0.875rem',

                  fontWeight: 700,
                }}
              >
                Get Started
              </Link>

            </div>

          </div>
        )}

      </div>
    </nav>
  )
}