import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import {
  Bell,
  MessageSquare,
  Calendar,
  FileText,
  Users,
  CheckCircle,
  CreditCard,
  AlertCircle,
  Check,
  Trash2,
} from 'lucide-react'

interface ApiNotification {
  id: number
  type: string
  title: string
  message: string
  related_id: number | null
  is_read: number
  created_at: string
}

interface Notif {
  id: number
  icon: typeof Bell
  title: string
  desc: string
  time: string
  read: boolean
  color: string
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

function getNotificationStyle(type: string) {
  const normalized = String(type || '').toLowerCase()

  if (
    normalized.includes('ai') ||
    normalized.includes('chat') ||
    normalized.includes('response')
  ) {
    return {
      icon: MessageSquare,
      color: 'var(--blue)',
    }
  }

  if (
    normalized.includes('appointment') ||
    normalized.includes('booking') ||
    normalized.includes('reminder')
  ) {
    return {
      icon: Calendar,
      color: 'var(--emerald)',
    }
  }

  if (
    normalized.includes('document') ||
    normalized.includes('upload') ||
    normalized.includes('analysis')
  ) {
    return {
      icon: FileText,
      color: '#7C3AED',
    }
  }

  if (
    normalized.includes('payment')
  ) {
    return {
      icon: CreditCard,
      color: '#F59E0B',
    }
  }

  if (
    normalized.includes('request') ||
    normalized.includes('client') ||
    normalized.includes('advocate')
  ) {
    return {
      icon: Users,
      color: '#F59E0B',
    }
  }

  if (
    normalized.includes('error') ||
    normalized.includes('fail') ||
    normalized.includes('system')
  ) {
    return {
      icon: AlertCircle,
      color: '#EF4444',
    }
  }

  return {
    icon: CheckCircle,
    color: 'var(--blue)',
  }
}

function formatTime(dateString: string) {
  const date = new Date(dateString)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) {
    return 'Just now'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  }

  const diffDays = Math.floor(diffHours / 24)

  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function mapNotification(notification: ApiNotification): Notif {
  const style = getNotificationStyle(notification.type)

  return {
    id: notification.id,
    icon: style.icon,
    title: notification.title,
    desc: notification.message,
    time: formatTime(notification.created_at),
    read: Boolean(notification.is_read),
    color: style.color,
  }
}

export default function Notifications() {
  const location = useLocation()
  const isAdvocate = location.pathname.startsWith('/advocate')

  const [items, setItems] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchNotifications = async () => {
    try {
      setError('')

      const response = await fetch(`${API_URL}/api/notifications`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to load notifications (${response.status})`)
      }

      const data = await response.json()

      const notifications = Array.isArray(data.notifications)
        ? data.notifications
        : []

      setItems(notifications.map(mapNotification))
    } catch (err) {
      console.error('NOTIFICATIONS LOAD ERROR:', err)
      setError('Unable to load notifications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const markAllRead = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/notifications/read-all`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to mark notifications as read')
      }

      setItems(prev =>
        prev.map(notification => ({
          ...notification,
          read: true,
        }))
      )
    } catch (err) {
      console.error('MARK ALL READ ERROR:', err)
    }
  }

  const markRead = async (id: number) => {
    const notification = items.find(item => item.id === id)

    if (!notification || notification.read) {
      return
    }

    try {
      const response = await fetch(
        `${API_URL}/api/notifications/${id}/read`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to mark notification as read')
      }

      setItems(prev =>
        prev.map(item =>
          item.id === id
            ? {
                ...item,
                read: true,
              }
            : item
        )
      )
    } catch (err) {
      console.error('MARK READ ERROR:', err)
    }
  }

  const deleteNotification = async (
    event: React.MouseEvent,
    id: number
  ) => {
    event.stopPropagation()

    try {
      const response = await fetch(
        `${API_URL}/api/notifications/${id}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to delete notification')
      }

      setItems(prev => prev.filter(item => item.id !== id))
    } catch (err) {
      console.error('DELETE NOTIFICATION ERROR:', err)
    }
  }

  const unread = items.filter(n => !n.read).length

  return (
    <div className="page-enter" style={{ maxWidth: 700 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'var(--text)',
              letterSpacing: '-0.03em',
            }}
          >
            Notifications
          </h1>

          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              marginTop: 2,
            }}
          >
            {unread} unread
          </p>
        </div>

        {unread > 0 && (
          <button
            onClick={markAllRead}
            style={{
              fontSize: '0.8rem',
              color: 'var(--blue)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 8 }}>
        {loading ? (
          <div
            style={{
              padding: 30,
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}
          >
            Loading notifications...
          </div>
        ) : error ? (
          <div
            style={{
              padding: 30,
              textAlign: 'center',
              color: '#EF4444',
              fontSize: '0.85rem',
            }}
          >
            {error}
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <Bell
              size={32}
              style={{
                marginBottom: 10,
                opacity: 0.5,
              }}
            />

            <div
              style={{
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              No notifications
            </div>

            <div
              style={{
                fontSize: '0.8rem',
                marginTop: 4,
              }}
            >
              You’re all caught up.
            </div>
          </div>
        ) : (
          items.map((n, i) => (
            <div
              key={n.id}
              onClick={() => markRead(n.id)}
              style={{
                display: 'flex',
                gap: 12,
                padding: '14px',
                cursor: 'pointer',
                borderBottom:
                  i < items.length - 1
                    ? '1px solid var(--border)'
                    : 'none',
                background: n.read
                  ? 'transparent'
                  : 'var(--blue-subtle)',
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: `color-mix(in srgb, ${n.color} 12%, transparent)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <n.icon
                  size={16}
                  style={{
                    color: n.color,
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: 'var(--text)',
                      fontSize: '0.85rem',
                    }}
                  >
                    {n.title}
                  </div>

                  {!n.read && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--blue)',
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>

                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    marginTop: 2,
                  }}
                >
                  {n.desc}
                </div>

                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-subtle)',
                    marginTop: 4,
                  }}
                >
                  {n.time}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                {!n.read && (
                  <button
                    onClick={event => {
                      event.stopPropagation()
                      markRead(n.id)
                    }}
                    title="Mark as read"
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: 'var(--blue)',
                      padding: 5,
                    }}
                  >
                    <Check size={15} />
                  </button>
                )}

                <button
                  onClick={event =>
                    deleteNotification(event, n.id)
                  }
                  title="Delete notification"
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-subtle)',
                    padding: 5,
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}