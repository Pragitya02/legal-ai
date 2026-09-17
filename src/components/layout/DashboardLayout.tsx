import { useEffect, useRef, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router'
import {
  LayoutDashboard,
  MessageSquare,
  FolderOpen,
  Users,
  Calendar,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  FileText,
  BarChart2,
  DollarSign,
  BookOpen,
  ClipboardList,
  Clock3,
  Video,
  ChevronRight,
  Loader2,
  FileSearch,
  MessageCircle,
  Briefcase,
  UserRound,
} from 'lucide-react'

import BackButton from './BackButton'
import { getStoredUser, logout } from '../../lib/auth'

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5001'

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const isAdvocatePath = (p: string) =>
  p.startsWith('/advocate')

function escapeRegExp(value: string) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  )
}

/*
|--------------------------------------------------------------------------
| NAVIGATION
|--------------------------------------------------------------------------
*/

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
    label: 'Your Bookings',
    href: '/dashboard/bookings',
  },
  {
    icon: Video,
    label: 'Meetings',
    href: '/dashboard/meetings',
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
    icon: ClipboardList,
    label: 'Consultation Requests',
    href: '/advocate/consultation-requests',
  },
  {
    icon: Video,
    label: 'Meetings',
    href: '/advocate/meetings',
  },
  {
    icon: Clock3,
    label: 'Availability & Timetable',
    href: '/advocate/availability',
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

/*
|--------------------------------------------------------------------------
| SEARCH RESULT TYPE
|--------------------------------------------------------------------------
*/

type SearchResult = {
  id: string
  type: string
  title: string
  content: string
  fullContent?: string
  date?: string | null
  url?: string
  field?: string
  query?: string
}

/*
|--------------------------------------------------------------------------
| COMPONENT
|--------------------------------------------------------------------------
*/

export default function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  /*
  |--------------------------------------------------------------------------
  | SIDEBAR
  |--------------------------------------------------------------------------
  */

  const [sidebarOpen, setSidebarOpen] =
    useState(false)

  /*
  |--------------------------------------------------------------------------
  | SEARCH STATE
  |--------------------------------------------------------------------------
  */

  const [search, setSearch] = useState('')

  // Keep the search field read-only until the user explicitly focuses it.
  // This prevents Chrome/password-manager autofill from injecting an
  // email address into the global search field.
  const [searchFocused, setSearchFocused] = useState(false)

  const [searchResults, setSearchResults] =
    useState<SearchResult[]>([])

  const [searchLoading, setSearchLoading] =
    useState(false)

  const [searchOpen, setSearchOpen] =
    useState(false)

  const [selectedSearchIndex, setSelectedSearchIndex] =
    useState(-1)

  const searchContainerRef =
    useRef<HTMLDivElement | null>(null)

  const searchInputRef =
    useRef<HTMLInputElement | null>(null)

  /*
  |--------------------------------------------------------------------------
  | USER / ROLE
  |--------------------------------------------------------------------------
  */

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

  const homeHref =
    isAdvocate
      ? '/advocate'
      : '/dashboard'

  const savedUser: any =
    getStoredUser() || {}

  const userName =
    savedUser?.fullName ||
    savedUser?.full_name ||
    savedUser?.name ||
    'User'

  const userInitials =
    userName
      .split(' ')
      .map(
        (word: string) =>
          word[0],
      )
      .join('')
      .slice(0, 2)
      .toUpperCase()

  const profileHref =
    isAdvocate
      ? '/advocate/profile'
      : '/dashboard/profile'

  /*
  |--------------------------------------------------------------------------
  | GLOBAL SEARCH API
  |--------------------------------------------------------------------------
  |
  | Searches the backend database instead of only the currently
  | visible page.
  |
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const query =
      search.trim()

    /*
    |--------------------------------------------------------------------------
    | EMPTY / SHORT QUERY
    |--------------------------------------------------------------------------
    */

    if (
      !query ||
      query.length < 2
    ) {
      setSearchResults([])
      setSearchLoading(false)
      setSearchOpen(false)
      setSelectedSearchIndex(-1)

      return
    }

    /*
    |--------------------------------------------------------------------------
    | OPEN SEARCH
    |--------------------------------------------------------------------------
    */

    setSearchOpen(true)
    setSearchLoading(true)
    setSelectedSearchIndex(-1)

    /*
    |--------------------------------------------------------------------------
    | ABORT PREVIOUS REQUEST
    |--------------------------------------------------------------------------
    */

    const controller =
      new AbortController()

    /*
    |--------------------------------------------------------------------------
    | DEBOUNCE
    |--------------------------------------------------------------------------
    */

    const timer =
      window.setTimeout(
        async () => {
          try {
            /*
            |--------------------------------------------------------------------------
            | CLEAN API BASE URL
            |--------------------------------------------------------------------------
            */

            const baseUrl =
              API_BASE_URL.replace(
                /\/+$/,
                '',
              )

            /*
            |--------------------------------------------------------------------------
            | SEARCH URL
            |--------------------------------------------------------------------------
            */

            const url =
              `${baseUrl}/api/search?q=${encodeURIComponent(
                query,
              )}`

            console.log(
              '[GLOBAL SEARCH] Request:',
              url,
            )

            /*
            |--------------------------------------------------------------------------
            | FETCH
            |--------------------------------------------------------------------------
            */

            const response =
              await fetch(
                url,
                {
                  method: 'GET',

                  /*
                  |--------------------------------------------------------------------------
                  | IMPORTANT
                  | Sends authentication cookies.
                  |--------------------------------------------------------------------------
                  */

                  credentials:
                    'include',

                  headers: {
                    Accept:
                      'application/json',
                  },

                  signal:
                    controller.signal,
                },
              )

            /*
            |--------------------------------------------------------------------------
            | HTTP ERROR
            |--------------------------------------------------------------------------
            */

            if (!response.ok) {
              const errorText =
                await response.text()

              console.error(
                '[GLOBAL SEARCH] HTTP ERROR:',
                response.status,
                errorText,
              )

              throw new Error(
                `Search request failed: ${response.status}`,
              )
            }

            /*
            |--------------------------------------------------------------------------
            | JSON
            |--------------------------------------------------------------------------
            */

            const data =
              await response.json()

            console.log(
              '[GLOBAL SEARCH] Response:',
              data,
            )

            /*
            |--------------------------------------------------------------------------
            | VALID RESPONSE
            |--------------------------------------------------------------------------
            */

            if (
              data?.success === true &&
              Array.isArray(
                data.results,
              )
            ) {
              setSearchResults(
                data.results,
              )
            } else {
              console.warn(
                '[GLOBAL SEARCH] Invalid response:',
                data,
              )

              setSearchResults([])
            }
          } catch (
            error: any
          ) {
            /*
            |--------------------------------------------------------------------------
            | ABORTED REQUEST
            |--------------------------------------------------------------------------
            */

            if (
              error?.name ===
              'AbortError'
            ) {
              return
            }

            console.error(
              '[GLOBAL SEARCH] ERROR:',
              error,
            )

            setSearchResults([])
          } finally {
            if (
              !controller.signal
                .aborted
            ) {
              setSearchLoading(
                false,
              )
            }
          }
        },
        300,
      )

    /*
    |--------------------------------------------------------------------------
    | CLEANUP
    |--------------------------------------------------------------------------
    */

    return () => {
      window.clearTimeout(
        timer,
      )

      controller.abort()
    }
  }, [search])

  /*
  |--------------------------------------------------------------------------
  | CLOSE SEARCH WHEN CLICKING OUTSIDE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleOutsideClick =
      (event: MouseEvent) => {
        if (
          searchContainerRef.current &&
          !searchContainerRef.current.contains(
            event.target as Node,
          )
        ) {
          setSearchOpen(false)
          setSelectedSearchIndex(-1)
        }
      }

    document.addEventListener(
      'mousedown',
      handleOutsideClick,
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick,
      )
    }
  }, [])

  /*
  |--------------------------------------------------------------------------
  | CTRL/CMD + K
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleKeyDown =
      (event: KeyboardEvent) => {
        if (
          (event.ctrlKey ||
            event.metaKey) &&
          event.key.toLowerCase() ===
            'k'
        ) {
          event.preventDefault()

          searchInputRef.current?.focus()

          setSearchOpen(true)

          return
        }

        /*
        |--------------------------------------------------------------------------
        | ESCAPE
        |--------------------------------------------------------------------------
        */

        if (
          event.key ===
          'Escape'
        ) {
          setSearchOpen(false)

          setSelectedSearchIndex(
            -1,
          )

          searchInputRef.current?.blur()
        }
      }

    document.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [])

  /*
  |--------------------------------------------------------------------------
  | OPEN SEARCH RESULT
  |--------------------------------------------------------------------------
  */

  const openSearchResult =
    (
      result: SearchResult,
    ) => {
      if (!result?.url) {
        return
      }

      setSearchOpen(false)

      setSelectedSearchIndex(
        -1,
      )

      /*
      |--------------------------------------------------------------------------
      | Keep search text visible until navigation occurs.
      |--------------------------------------------------------------------------
      */

      navigate(result.url)
    }

  /*
  |--------------------------------------------------------------------------
  | KEYBOARD NAVIGATION
  |--------------------------------------------------------------------------
  */

  const handleSearchKeyDown =
    (
      event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
      /*
      |--------------------------------------------------------------------------
      | ESC
      |--------------------------------------------------------------------------
      */

      if (
        event.key ===
        'Escape'
      ) {
        event.preventDefault()

        setSearchOpen(false)

        setSelectedSearchIndex(
          -1,
        )

        return
      }

      /*
      |--------------------------------------------------------------------------
      | OPEN DROPDOWN
      |--------------------------------------------------------------------------
      */

      if (!searchOpen) {
        if (
          event.key ===
            'ArrowDown' ||
          event.key ===
            'ArrowUp'
        ) {
          setSearchOpen(true)
        }

        return
      }

      /*
      |--------------------------------------------------------------------------
      | ARROW DOWN
      |--------------------------------------------------------------------------
      */

      if (
        event.key ===
        'ArrowDown'
      ) {
        event.preventDefault()

        if (
          searchResults.length ===
          0
        ) {
          return
        }

        setSelectedSearchIndex(
          (
            previous,
          ) =>
            previous >=
            searchResults.length -
              1
              ? 0
              : previous + 1,
        )

        return
      }

      /*
      |--------------------------------------------------------------------------
      | ARROW UP
      |--------------------------------------------------------------------------
      */

      if (
        event.key ===
        'ArrowUp'
      ) {
        event.preventDefault()

        if (
          searchResults.length ===
          0
        ) {
          return
        }

        setSelectedSearchIndex(
          (
            previous,
          ) =>
            previous <= 0
              ? searchResults.length -
                1
              : previous - 1,
        )

        return
      }

      /*
      |--------------------------------------------------------------------------
      | ENTER
      |--------------------------------------------------------------------------
      */

      if (
        event.key ===
        'Enter'
      ) {
        event.preventDefault()

        /*
        |--------------------------------------------------------------------------
        | Selected result
        |--------------------------------------------------------------------------
        */

        if (
          selectedSearchIndex >=
            0 &&
          searchResults[
            selectedSearchIndex
          ]
        ) {
          openSearchResult(
            searchResults[
              selectedSearchIndex
            ],
          )

          return
        }

        /*
        |--------------------------------------------------------------------------
        | First result
        |--------------------------------------------------------------------------
        */

        if (
          searchResults.length >
          0
        ) {
          openSearchResult(
            searchResults[0],
          )
        }

        return
      }
    }

  /*
  |--------------------------------------------------------------------------
  | RESULT ICON
  |--------------------------------------------------------------------------
  */

  const getResultIcon =
    (
      type: string,
    ) => {
      const normalized =
        type.toLowerCase()

      if (
        normalized.includes(
          'assistant',
        )
      ) {
        return MessageCircle
      }

      if (
        normalized.includes(
          'research',
        )
      ) {
        return BookOpen
      }

      if (
        normalized.includes(
          'document',
        )
      ) {
        return FileSearch
      }

      if (
        normalized.includes(
          'case',
        )
      ) {
        return Briefcase
      }

      if (
        normalized.includes(
          'client',
        )
      ) {
        return UserRound
      }

      return FileText
    }

  /*
  |--------------------------------------------------------------------------
  | HIGHLIGHT SEARCH TERM
  |--------------------------------------------------------------------------
  */

  const renderHighlightedText =
    (
      text: string,
    ) => {
      if (!text) {
        return null
      }

      const query =
        search.trim()

      if (!query) {
        return text
      }

      const parts =
        text.split(
          new RegExp(
            `(${escapeRegExp(
              query,
            )})`,
            'gi',
          ),
        )

      return parts.map(
        (
          part,
          index,
        ) => {
          const isMatch =
            part.toLowerCase() ===
            query.toLowerCase()

          if (isMatch) {
            return (
              <mark
                key={index}
                style={{
                  background:
                    'rgba(234, 179, 8, 0.28)',
                  color:
                    'inherit',
                  borderRadius: 3,
                  padding:
                    '1px 2px',
                  fontWeight: 700,
                }}
              >
                {part}
              </mark>
            )
          }

          return (
            <span key={index}>
              {part}
            </span>
          )
        },
      )
    }

  /*
  |--------------------------------------------------------------------------
  | SIDEBAR
  |--------------------------------------------------------------------------
  */

  const Sidebar =
    () => (
      <aside
        className="sidebar"
        style={{
          zIndex: 40,
        }}
      >
        {/* LOGO */}

        <div
          style={{
            padding:
              '20px 16px 16px',
            borderBottom:
              '1px solid var(--border)',
          }}
        >
          <Link
            to={homeHref}
            style={{
              textDecoration:
                'none',
              display: 'flex',
              alignItems:
                'center',
              gap: 10,
            }}
          >
            <img
              src="/nyaya-logo.jpeg"
              alt="Nyaya AI"
              style={{
                width: 42,
                height: 42,
                borderRadius:
                  '50%',
                objectFit:
                  'cover',
                display: 'block',
                flexShrink: 0,
              }}
            />

            <span
              style={{
                fontWeight: 800,
                fontSize:
                  '1rem',
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
                display: 'flex',
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

        {/* NAVIGATION */}

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

          {navItems.map(
            (item) => {
              const active =
                location.pathname ===
                item.href

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() =>
                    setSidebarOpen(
                      false,
                    )
                  }
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

                  {'badge' in
                    item &&
                  typeof item.badge ===
                    'number' ? (
                    <span
                      style={{
                        minWidth: 18,
                        height: 18,
                        borderRadius:
                          9,
                        background:
                          'var(--blue)',
                        color:
                          'white',
                        fontSize:
                          '0.65rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                        padding:
                          '0 5px',
                      }}
                    >
                      {String(
                        item.badge,
                      )}
                    </span>
                  ) : null}
                </Link>
              )
            },
          )}
        </nav>

        {/* USER */}

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
              display: 'flex',
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

          <div
            style={{
              display: 'flex',
              gap: 6,
              padding:
                '6px 4px 0',
            }}
          >
            <button
              onClick={() => {
                logout(
                  API_BASE_URL,
                ).finally(() => {
                  navigate('/')
                })
              }}
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
                display: 'flex',
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
                display: 'flex',
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

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background:
          'var(--bg)',
      }}
    >
      {/* DESKTOP SIDEBAR */}

      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* MOBILE SIDEBAR */}

      {sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
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
              setSidebarOpen(
                false,
              )
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
              setSidebarOpen(
                false,
              )
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
              display: 'flex',
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

      {/* MAIN */}

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection:
            'column',
          minWidth: 0,
          overflow:
            'hidden',
        }}
      >
        {/* TOP BAR */}

        <header
          style={{
            height: 60,
            display: 'flex',
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
              setSidebarOpen(
                true,
              )
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
              display: 'flex',
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

          {/* =====================================================
              GLOBAL SEARCH
          ===================================================== */}

          <div
            ref={
              searchContainerRef
            }
            style={{
              flex: 1,
              maxWidth: 520,
              position:
                'relative',
            }}
          >
            {/* SEARCH ICON */}

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
                pointerEvents:
                  'none',
                zIndex: 2,
              }}
            />

            {/* INPUT */}

            <input
              ref={
                searchInputRef
              }
              className="input"
              type="search"
              autoComplete="off"
              readOnly={!searchFocused}
              value={search}
              onChange={(
                event,
              ) => {
                setSearch(
                  event.target.value,
                )

                setSearchOpen(
                  true,
                )
              }}
              onFocus={(event) => {
                // Clear any value that the browser may have injected
                // before React received focus.
                if (
                  !search &&
                  event.currentTarget.value
                ) {
                  event.currentTarget.value = ''
                  setSearch('')
                }

                setSearchFocused(true)

                if (
                  search.trim()
                    .length >= 2
                ) {
                  setSearchOpen(
                    true,
                  )
                }
              }}
              onBlur={() => {
                // Return to read-only mode when the user leaves the field.
                setSearchFocused(false)
              }}
              onKeyDown={
                handleSearchKeyDown
              }
              placeholder={
                isAdvocate
                  ? 'Search clients, cases, research...'
                  : 'Search cases, AI Assistant, documents...'
              }
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-form-type="other"
              data-lpignore="true"
              data-1p-ignore="true"
              aria-label="Global search"
              style={{
                paddingLeft: 32,
                paddingRight: 34,
                fontSize:
                  '0.875rem',
                height: 36,
                borderRadius: 8,
              }}
            />

            {/* LOADING */}

            {searchLoading && (
              <Loader2
                size={15}
                style={{
                  position:
                    'absolute',
                  right: 10,
                  top: '50%',
                  transform:
                    'translateY(-50%)',
                  animation:
                    'spin 1s linear infinite',
                  color:
                    'var(--text-muted)',
                }}
              />
            )}

            {/* =====================================================
                SEARCH RESULTS
            ===================================================== */}

            {searchOpen &&
              search.trim()
                .length >= 2 && (
                <div
                  style={{
                    position:
                      'absolute',
                    top: 44,
                    left: 0,
                    right: 0,
                    maxHeight: 520,
                    overflowY:
                      'auto',
                    background:
                      'var(--bg-card)',
                    border:
                      '1px solid var(--border)',
                    borderRadius: 12,
                    boxShadow:
                      '0 18px 45px rgba(0,0,0,0.28)',
                    zIndex: 100,
                  }}
                >
                  {/* SEARCH HEADER */}

                  <div
                    style={{
                      padding:
                        '10px 14px',
                      borderBottom:
                        '1px solid var(--border)',
                      display: 'flex',
                      alignItems:
                        'center',
                      justifyContent:
                        'space-between',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          '0.72rem',
                        fontWeight: 700,
                        color:
                          'var(--text-muted)',
                      }}
                    >
                      {searchLoading
                        ? 'Searching...'
                        : searchResults.length >
                            0
                          ? `${searchResults.length} result${
                              searchResults.length ===
                              1
                                ? ''
                                : 's'
                            }`
                          : 'No results'}
                    </div>

                    <div
                      style={{
                        fontSize:
                          '0.65rem',
                        color:
                          'var(--text-subtle)',
                      }}
                    >
                      ↑ ↓ navigate · Enter
                      open · Esc close
                    </div>
                  </div>

                  {/* LOADING */}

                  {searchLoading &&
                    searchResults.length ===
                      0 && (
                      <div
                        style={{
                          padding:
                            '28px 16px',
                          textAlign:
                            'center',
                          color:
                            'var(--text-muted)',
                        }}
                      >
                        <Loader2
                          size={22}
                          style={{
                            animation:
                              'spin 1s linear infinite',
                            marginBottom:
                              8,
                          }}
                        />

                        <div
                          style={{
                            fontSize:
                              '0.8rem',
                          }}
                        >
                          Searching your
                          content...
                        </div>
                      </div>
                    )}

                  {/* NO RESULTS */}

                  {!searchLoading &&
                    searchResults.length ===
                      0 && (
                      <div
                        style={{
                          padding:
                            '28px 16px',
                          textAlign:
                            'center',
                        }}
                      >
                        <Search
                          size={22}
                          style={{
                            color:
                              'var(--text-subtle)',
                            marginBottom:
                              8,
                          }}
                        />

                        <div
                          style={{
                            fontSize:
                              '0.85rem',
                            fontWeight: 600,
                            color:
                              'var(--text)',
                          }}
                        >
                          No matching content
                        </div>

                        <div
                          style={{
                            marginTop: 4,
                            fontSize:
                              '0.72rem',
                            color:
                              'var(--text-muted)',
                          }}
                        >
                          Try another word
                          or phrase.
                        </div>
                      </div>
                    )}

                  {/* RESULTS */}

                  {searchResults.map(
                    (
                      result,
                      index,
                    ) => {
                      const Icon =
                        getResultIcon(
                          result.type,
                        )

                      const selected =
                        index ===
                        selectedSearchIndex

                      return (
                        <button
                          key={
                            result.id
                          }
                          type="button"
                          onClick={() =>
                            openSearchResult(
                              result,
                            )
                          }
                          onMouseEnter={() =>
                            setSelectedSearchIndex(
                              index,
                            )
                          }
                          style={{
                            width:
                              '100%',
                            textAlign:
                              'left',
                            border: 'none',
                            borderBottom:
                              index <
                              searchResults.length -
                                1
                                ? '1px solid var(--border)'
                                : 'none',
                            background:
                              selected
                                ? 'var(--bg-secondary)'
                                : 'transparent',
                            cursor:
                              'pointer',
                            padding:
                              '12px 14px',
                            display:
                              'flex',
                            alignItems:
                              'flex-start',
                            gap: 11,
                            color:
                              'var(--text)',
                          }}
                        >
                          {/* ICON */}

                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius:
                                8,
                              background:
                                'var(--bg-secondary)',
                              display:
                                'flex',
                              alignItems:
                                'center',
                              justifyContent:
                                'center',
                              flexShrink: 0,
                            }}
                          >
                            <Icon
                              size={16}
                              color="var(--blue)"
                            />
                          </div>

                          {/* CONTENT */}

                          <div
                            style={{
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            {/* SOURCE */}

                            <div
                              style={{
                                display:
                                  'flex',
                                alignItems:
                                  'center',
                                gap: 7,
                                marginBottom:
                                  3,
                              }}
                            >
                              <span
                                style={{
                                  fontSize:
                                    '0.65rem',
                                  fontWeight: 700,
                                  color:
                                    'var(--blue)',
                                  textTransform:
                                    'uppercase',
                                  letterSpacing:
                                    '0.04em',
                                }}
                              >
                                {
                                  result.type
                                }
                              </span>

                              {result.field && (
                                <span
                                  style={{
                                    fontSize:
                                      '0.6rem',
                                    color:
                                      'var(--text-subtle)',
                                    textTransform:
                                      'uppercase',
                                  }}
                                >
                                  {result.field}
                                </span>
                              )}
                            </div>

                            {/* TITLE */}

                            <div
                              style={{
                                fontSize:
                                  '0.82rem',
                                fontWeight:
                                  650,
                                color:
                                  'var(--text)',
                                marginBottom:
                                  4,
                                overflow:
                                  'hidden',
                                textOverflow:
                                  'ellipsis',
                                whiteSpace:
                                  'nowrap',
                              }}
                            >
                              {
                                result.title
                              }
                            </div>

                            {/* MATCHING SENTENCE */}

                            <div
                              style={{
                                fontSize:
                                  '0.73rem',
                                lineHeight:
                                  1.5,
                                color:
                                  'var(--text-muted)',
                                display:
                                  '-webkit-box',
                                WebkitLineClamp:
                                  3,
                                WebkitBoxOrient:
                                  'vertical',
                                overflow:
                                  'hidden',
                              }}
                            >
                              {renderHighlightedText(
                                result.content,
                              )}
                            </div>
                          </div>

                          {/* ARROW */}

                          <ChevronRight
                            size={15}
                            style={{
                              marginTop: 8,
                              flexShrink: 0,
                              color:
                                'var(--text-subtle)',
                            }}
                          />
                        </button>
                      )
                    },
                  )}

                  {/* FOOTER */}

                  {!searchLoading &&
                    searchResults.length >
                      0 && (
                      <div
                        style={{
                          padding:
                            '8px 14px',
                          borderTop:
                            '1px solid var(--border)',
                          fontSize:
                            '0.65rem',
                          color:
                            'var(--text-subtle)',
                          display: 'flex',
                          justifyContent:
                            'space-between',
                        }}
                      >
                        <span>
                          Searching your
                          accessible content
                        </span>

                        <span>
                          {
                            searchResults.length
                          }{' '}
                          matches
                        </span>
                      </div>
                    )}
                </div>
              )}
          </div>

          {/* SPACER */}

          <div
            style={{
              flex: 1,
            }}
          />

          {/* NOTIFICATIONS */}

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
              display: 'flex',
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
        </header>

        {/* CONTENT */}

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
          <div
            style={{
              marginBottom: 18,
            }}
          >
            <BackButton />
          </div>

          <Outlet />
        </main>
      </div>

      {/* SPIN ANIMATION */}

      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  )
}