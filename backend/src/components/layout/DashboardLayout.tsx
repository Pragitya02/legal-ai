import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router'
import {
  Scale,
  LayoutDashboard,
  MessageSquare,
  FolderOpen,
  Users,
  Calendar,
  Bell,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Search,
  FileText,
  BarChart2,
  DollarSign,
  BookOpen,
  ChevronRight,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const isCitizenPath = (p: string) =>
  p.startsWith('/dashboard')

const isAdvocatePath = (p: string) =>
  p.startsWith('/advocate')

const citizenNav = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    href: '/dashboard',
  },
  {
    icon: MessageSquare,
    label: 'AI Assistant',
    href: '/dashboard/ai-assistant',
  },
  {
    icon: FolderOpen,
    label: 'My Cases',
    href: '/dashboard/cases',
  },
  {
    icon: FileText,
    label: 'Documents',
    href: '/dashboard/documents',
  },
  {
    icon: Users,
    label: 'Find Advocates',
    href: '/dashboard/advocates',
  },
  {
    icon: Calendar,
    label: 'Appointments',
    href: '/dashboard/booking',
  },
  {
    icon: Bell,
    label: 'Notifications',
    href: '/dashboard/notifications',
    badge: 3 as number,
  },
  {
    icon: Settings,
    label: 'Settings',
    href: '/dashboard/settings',
  },
]

const advocateNav = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    href: '/advocate',
  },
  {
    icon: Calendar,
    label: 'Appointments',
    href: '/advocate/appointments',
  },
  {
    icon: Users,
    label: 'Clients',
    href: '/advocate/clients',
  },
  {
    icon: BookOpen,
    label: 'AI Research',
    href: '/advocate/ai-research',
  },
  {
    icon: FileText,
    label: 'Documents',
    href: '/advocate/documents',
  },
  {
    icon: DollarSign,
    label: 'Earnings',
    href: '/advocate/earnings',
  },
  {
    icon: BarChart2,
    label: 'Analytics',
    href: '/advocate/analytics',
  },
  {
    icon: Settings,
    label: 'Settings',
    href: '/advocate/settings',
  },
]

export default function DashboardLayout() {
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const [sidebarOpen, setSidebarOpen] =
    useState(false)

  const [search, setSearch] =
    useState('')

  const isAdvocate =
    isAdvocatePath(location.pathname)

  const navItems =
    isAdvocate
      ? advocateNav
      : citizenNav

  const userLabel =
    isAdvocate
      ? 'Advocate'
      : 'Citizen'

  // =====================================================
  // GET LOGGED-IN USER
  // =====================================================

  let savedUser: any = {}

  try {
    savedUser = JSON.parse(
      localStorage.getItem('user') || '{}'
    )
  } catch (error) {
    console.error(
      'Failed to read logged-in user:',
      error
    )
  }

  // =====================================================
  // DYNAMIC USER NAME
  // =====================================================

  const loggedInName =
    savedUser.fullName ||
    savedUser.full_name ||
    ''

  const userName = isAdvocate
    ? loggedInName
      ? `Adv. ${loggedInName}`
      : 'Advocate'
    : loggedInName || 'Citizen'

  // =====================================================
  // DYNAMIC INITIALS
  // =====================================================

  const getInitials = (name: string) => {
    if (!name) return 'U'

    const cleanName =
      name
        .replace(/^Adv\.\s*/i, '')
        .trim()

    const parts =
      cleanName.split(/\s+/)

    if (parts.length === 1) {
      return parts[0]
        .substring(0, 2)
        .toUpperCase()
    }

    return (
      parts[0][0] +
      parts[parts.length - 1][0]
    ).toUpperCase()
  }

  const userInitials =
    getInitials(
      loggedInName
    )

  const profileHref =
    isAdvocate
      ? '/advocate/profile'
      : '/dashboard/profile'

  // =====================================================
  // SIDEBAR
  // =====================================================

  const Sidebar = () => (
    <aside
      className="sidebar"
      style={{
        zIndex: 40,
      }}
    >

      {/* =================================================
          BRAND
      ================================================= */}

      <div
        style={{
          padding:
            '20px 16px 16px',
          borderBottom:
            '1px solid var(--border)',
        }}
      >

        <Link
          to="/"
          style={{
            textDecoration:
              'none',
            display:
              'flex',
            alignItems:
              'center',
            gap: 8,
          }}
        >

          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background:
                'linear-gradient(135deg, var(--blue), #7C3AED)',
              display:
                'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
            }}
          >

            <Scale
              size={16}
              color="white"
              strokeWidth={2.5}
            />

          </div>

          <span
            style={{
              fontWeight: 800,
              fontSize: '1rem',
              color:
                'var(--text)',
              letterSpacing:
                '-0.02em',
            }}
          >
            Nyaya
            <span
              style={{
                color:
                  'var(--blue)',
              }}
            >
              AI
            </span>
          </span>

        </Link>

        {isAdvocate && (
          <div
            style={{
              marginTop: 8,
              display:
                'flex',
              alignItems:
                'center',
              gap: 6,
            }}
          >

            <div
              style={{
                padding:
                  '2px 8px',
                borderRadius: 6,
                fontSize:
                  '0.65rem',
                fontWeight: 700,
                background:
                  'var(--emerald-subtle)',
                color:
                  'var(--emerald)',
                border:
                  '1px solid var(--emerald-light)',
                letterSpacing:
                  '0.05em',
                textTransform:
                  'uppercase',
              }}
            >
              Verified Advocate
            </div>

          </div>
        )}

      </div>


      {/* =================================================
          NAVIGATION
      ================================================= */}

      <nav
        style={{
          padding:
            '12px 10px',
          flex: 1,
        }}
      >

        <div
          style={{
            marginBottom: 6,
            padding:
              '0 6px',
          }}
        >

          <span
            style={{
              fontSize:
                '0.65rem',
              fontWeight: 700,
              color:
                'var(--text-subtle)',
              letterSpacing:
                '0.08em',
              textTransform:
                'uppercase',
            }}
          >
            Navigation
          </span>

        </div>

        {navItems.map(item => {

          const active =
            location.pathname ===
            item.href

          return (
            <Link
              key={item.href}
              to={item.href}
              className={`nav-item ${
                active
                  ? 'active'
                  : ''
              }`}
            >

              <item.icon
                size={17}
                strokeWidth={
                  active
                    ? 2.5
                    : 2
                }
              />

              <span
                style={{
                  flex: 1,
                }}
              >
                {item.label}
              </span>

              {'badge' in item &&
              typeof item.badge ===
                'number' ? (

                <span
                  style={{
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    background:
                      'var(--blue)',
                    color:
                      'white',
                    fontSize:
                      '0.65rem',
                    fontWeight: 700,
                    display:
                      'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                    padding:
                      '0 5px',
                  }}
                >
                  {String(
                    item.badge
                  )}
                </span>

              ) : null}

            </Link>
          )
        })}

      </nav>


      {/* =================================================
          USER SECTION
      ================================================= */}

      <div
        style={{
          padding:
            '12px 10px',
          borderTop:
            '1px solid var(--border)',
        }}
      >

        <div
          style={{
            display:
              'flex',
            alignItems:
              'center',
            gap: 10,
            padding:
              '8px 10px',
          }}
        >

          <div
            className="avatar"
            style={{
              width: 36,
              height: 36,
              fontSize:
                '0.8rem',
            }}
          >
            {userInitials}
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >

            <div
              style={{
                fontSize:
                  '0.8rem',
                fontWeight: 600,
                color:
                  'var(--text)',
                whiteSpace:
                  'nowrap',
                overflow:
                  'hidden',
                textOverflow:
                  'ellipsis',
              }}
            >
              {userName}
            </div>

            <div
              style={{
                fontSize:
                  '0.68rem',
                color:
                  'var(--text-muted)',
              }}
            >
              {userLabel}
            </div>

          </div>

        </div>


        {/* =================================================
            USER ACTIONS
        ================================================= */}

        <div
          style={{
            display:
              'flex',
            gap: 6,
            padding:
              '6px 4px 0',
          }}
        >

          {/* THEME */}

          <button
            onClick={toggle}
            style={{
              flex: 1,
              padding: '7px',
              borderRadius: 8,
              border:
                '1px solid var(--border)',
              background:
                'var(--bg-secondary)',
              cursor:
                'pointer',
              color:
                'var(--text-muted)',
              display:
                'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
            }}
          >

            {theme === 'dark'
              ? <Sun size={14} />
              : <Moon size={14} />}

          </button>


          {/* LOGOUT */}

          <button
            onClick={() =>
              navigate('/')
            }
            style={{
              flex: 1,
              padding: '7px',
              borderRadius: 8,
              border:
                '1px solid var(--border)',
              background:
                'var(--bg-secondary)',
              cursor:
                'pointer',
              color:
                'var(--text-muted)',
              display:
                'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
            }}
            title="Logout"
          >
            <LogOut
              size={14}
            />
          </button>


          {/* PROFILE */}

          <Link
            to={profileHref}
            style={{
              flex: 2,
              padding: '7px',
              borderRadius: 8,
              border:
                '1px solid var(--border)',
              background:
                'var(--bg-secondary)',
              cursor:
                'pointer',
              color:
                'var(--text-muted)',
              display:
                'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
              gap: 4,
              textDecoration:
                'none',
              fontSize:
                '0.75rem',
              fontWeight: 500,
            }}
          >
            Profile
            <ChevronRight
              size={12}
            />
          </Link>

        </div>

      </div>

    </aside>
  )


  return (

    <div
      style={{
        display:
          'flex',
        minHeight:
          '100vh',
        background:
          'var(--bg)',
      }}
    >

      {/* =================================================
          DESKTOP SIDEBAR
      ================================================= */}

      <div
        className="hidden lg:block"
      >
        <Sidebar />
      </div>


      {/* =================================================
          MOBILE SIDEBAR
      ================================================= */}

      {sidebarOpen && (

        <div
          style={{
            position:
              'fixed',
            inset: 0,
            zIndex: 50,
            display:
              'flex',
          }}
        >

          <div
            style={{
              position:
                'absolute',
              inset: 0,
              background:
                'rgba(0,0,0,0.5)',
              backdropFilter:
                'blur(4px)',
            }}
            onClick={() =>
              setSidebarOpen(false)
            }
          />

          <div
            style={{
              position:
                'relative',
              zIndex: 1,
            }}
          >
            <Sidebar />
          </div>

          <button
            onClick={() =>
              setSidebarOpen(false)
            }
            style={{
              position:
                'absolute',
              top: 16,
              right: 16,
              width: 36,
              height: 36,
              borderRadius: 8,
              border:
                '1px solid var(--border)',
              background:
                'var(--bg-card)',
              display:
                'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
              cursor:
                'pointer',
              color:
                'var(--text)',
            }}
          >
            <X size={18} />
          </button>

        </div>

      )}


      {/* =================================================
          MAIN
      ================================================= */}

      <div
        style={{
          flex: 1,
          display:
            'flex',
          flexDirection:
            'column',
          minWidth: 0,
          overflow:
            'hidden',
        }}
      >

        {/* =================================================
            TOP BAR
        ================================================= */}

        <header
          style={{
            height: 60,
            display:
              'flex',
            alignItems:
              'center',
            gap: 12,
            padding:
              '0 24px',
            borderBottom:
              '1px solid var(--border)',
            background:
              'var(--bg-glass)',
            backdropFilter:
              'blur(20px)',
            WebkitBackdropFilter:
              'blur(20px)',
            position:
              'sticky',
            top: 0,
            zIndex: 30,
          }}
        >

          {/* MOBILE MENU */}

          <button
            onClick={() =>
              setSidebarOpen(true)
            }
            className="lg:hidden"
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border:
                '1px solid var(--border)',
              background:
                'var(--bg-card)',
              display:
                'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
              cursor:
                'pointer',
              color:
                'var(--text)',
            }}
          >
            <Menu size={17} />
          </button>


          {/* SEARCH */}

          <div
            style={{
              flex: 1,
              maxWidth: 400,
              position:
                'relative',
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
              value={search}
              onChange={e =>
                setSearch(
                  e.target.value
                )
              }
              placeholder={
                isAdvocate
                  ? 'Search clients, cases, laws...'
                  : 'Search cases, advocates, laws...'
              }
              style={{
                paddingLeft: 32,
                fontSize:
                  '0.875rem',
                height: 36,
                borderRadius: 8,
              }}
            />

          </div>


          <div
            style={{
              flex: 1,
            }}
          />


          {/* =================================================
              NOTIFICATIONS
          ================================================= */}

          <Link
            to={
              isAdvocate
                ? '/advocate/notifications'
                : '/dashboard/notifications'
            }
            style={{
              position:
                'relative',
              width: 36,
              height: 36,
              borderRadius: 8,
              border:
                '1px solid var(--border)',
              background:
                'var(--bg-card)',
              display:
                'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
              cursor:
                'pointer',
              color:
                'var(--text-muted)',
              textDecoration:
                'none',
              flexShrink: 0,
            }}
          >

            <Bell size={17} />

            <span
              style={{
                position:
                  'absolute',
                top: 6,
                right: 6,
                width: 8,
                height: 8,
                borderRadius:
                  '50%',
                background:
                  'var(--blue)',
                border:
                  '2px solid var(--bg-card)',
              }}
            />

          </Link>


          {/* =================================================
              ROLE SWITCH
          ================================================= */}

          <div
            style={{
              display:
                'flex',
              gap: 6,
            }}
          >

            <Link
              to="/dashboard"
              style={{
                padding:
                  '5px 12px',
                borderRadius: 7,
                fontSize:
                  '0.75rem',
                fontWeight: 600,
                textDecoration:
                  'none',
                transition:
                  'all 0.15s',
                background:
                  isCitizenPath(
                    location.pathname
                  )
                    ? 'var(--blue)'
                    : 'var(--bg-secondary)',
                color:
                  isCitizenPath(
                    location.pathname
                  )
                    ? 'white'
                    : 'var(--text-muted)',
                border:
                  '1px solid var(--border)',
              }}
            >
              Citizen
            </Link>

            <Link
              to="/advocate"
              style={{
                padding:
                  '5px 12px',
                borderRadius: 7,
                fontSize:
                  '0.75rem',
                fontWeight: 600,
                textDecoration:
                  'none',
                transition:
                  'all 0.15s',
                background:
                  isAdvocatePath(
                    location.pathname
                  )
                    ? 'var(--emerald)'
                    : 'var(--bg-secondary)',
                color:
                  isAdvocatePath(
                    location.pathname
                  )
                    ? 'white'
                    : 'var(--text-muted)',
                border:
                  '1px solid var(--border)',
              }}
            >
              Advocate
            </Link>

          </div>

        </header>


        {/* =================================================
            CONTENT
        ================================================= */}

        <main
          style={{
            flex: 1,
            overflowY:
              'auto',
            padding:
              '28px 24px',
          }}
          className="page-enter"
        >
          <Outlet />
        </main>

      </div>

    </div>
  )
}