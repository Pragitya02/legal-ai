import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  ArrowLeft,
  FileText,
  History,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  CalendarDays,
  Briefcase,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

type UserData = {
  id: number
  fullName: string
  email: string
  phone: string
  role: string
  createdAt: string
  statistics?: {
    documents: number
    cases: number
    appointments: number
  }
  security?: {
    passwordConfigured: boolean
    googleConnected: boolean
    documentSecurityConfigured: boolean
  }
}

type DocumentData = {
  id: number
  fileName: string
  fileType: string
  uploadedAt: string
  documentHash?: string | null
  blockchainTxHash?: string | null
  blockchainStatus?: string | null
}

type AuditEntry = {
  id: number
  entityType: string
  entityId: number | null
  action: string
  description: string
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: unknown
  createdAt: string
}

type Tab =
  | 'overview'
  | 'profile'
  | 'documents'
  | 'activity'
  | 'security'
  | 'audit'

export default function AdminUserDetail() {
  const navigate = useNavigate()
  const { userId } = useParams()

  const [user, setUser] = useState<UserData | null>(null)
  const [documents, setDocuments] = useState<DocumentData[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [tabLoading, setTabLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) {
      setError('Invalid user ID.')
      setLoading(false)
      return
    }

    loadUser()
  }, [userId])

  useEffect(() => {
    if (!userId) return

    if (activeTab === 'documents') {
      loadDocuments()
    }

    if (activeTab === 'audit' || activeTab === 'activity') {
      loadAudit()
    }
  }, [activeTab, userId])

  async function loadUser() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(
        `${API_URL}/api/admin/users/${userId}`,
        {
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Unable to load user.'
        )
      }

      setUser(data.user)
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load user.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadDocuments() {
    try {
      setTabLoading(true)

      const response = await fetch(
        `${API_URL}/api/admin/users/${userId}/documents`,
        {
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Unable to load documents.'
        )
      }

      setDocuments(data.documents || [])
    } catch (err) {
      console.error(err)
      setDocuments([])
    } finally {
      setTabLoading(false)
    }
  }

  async function loadAudit() {
    try {
      setTabLoading(true)

      const response = await fetch(
        `${API_URL}/api/admin/users/${userId}/audit`,
        {
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Unable to load audit history.'
        )
      }

      setAudit(data.audit || [])
    } catch (err) {
      console.error(err)
      setAudit([])
    } finally {
      setTabLoading(false)
    }
  }

  function formatDate(value?: string) {
    if (!value) return '—'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return value
    }

    return date.toLocaleString()
  }

  function maskPhone(phone: string) {
    if (!phone) return 'Not provided'

    if (phone.length <= 4) {
      return phone
    }

    return `••••••${phone.slice(-4)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg,#000)] text-[var(--text,#fff)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/70">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading user...
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-[var(--bg,#000)] text-[var(--text,#fff)]">
        <div className="border-b border-[#D4AF37]/30">
          <div className="mx-auto max-w-7xl px-6 py-5">
            <button
              onClick={() => navigate('/admin/users')}
              className="flex items-center gap-2 text-white/70 hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Users
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-red-300">
            {error || 'User not found.'}
          </div>
        </div>
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: User,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText,
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: History,
    },
    {
      id: 'security',
      label: 'Security',
      icon: Lock,
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: ShieldCheck,
    },
  ]

  return (
    <div className="min-h-screen bg-[var(--bg,#000)] text-[var(--text,#fff)]">
      {/* Header */}
      <header className="border-b border-[#D4AF37]/30">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
          <button
            onClick={() => navigate('/admin/users')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Users
          </button>

          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4 text-[#D4AF37]" />
            Administrator
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Profile heading */}
        <section className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 flex items-center justify-center">
                <User className="h-7 w-7 text-[#D4AF37]" />
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">
                  Citizen Account
                </p>

                <h1 className="mt-1 text-3xl font-semibold">
                  {user.fullName || 'Unnamed User'}
                </h1>

                <p className="mt-1 text-white/50">
                  User ID #{user.id}
                </p>
              </div>
            </div>

            <div className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70">
              {user.role}
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="mb-8 overflow-x-auto border-b border-white/10">
          <div className="flex min-w-max gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm transition ${
                    active
                      ? 'border-[#D4AF37] text-[#D4AF37]'
                      : 'border-transparent text-white/50 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                icon={FileText}
                label="Documents"
                value={
                  user.statistics?.documents ?? 0
                }
              />

              <StatCard
                icon={Briefcase}
                label="Cases"
                value={
                  user.statistics?.cases ?? 0
                }
              />

              <StatCard
                icon={CalendarDays}
                label="Appointments"
                value={
                  user.statistics?.appointments ?? 0
                }
              />
            </div>

            <InfoCard title="Account information">
              <InfoRow
                icon={User}
                label="Full name"
                value={user.fullName}
              />

              <InfoRow
                icon={Mail}
                label="Email"
                value={user.email}
              />

              <InfoRow
                icon={Phone}
                label="Phone"
                value={maskPhone(user.phone)}
              />

              <InfoRow
                icon={CalendarDays}
                label="Joined"
                value={formatDate(user.createdAt)}
              />
            </InfoCard>
          </div>
        )}

        {activeTab === 'profile' && (
          <InfoCard title="Profile information">
            <InfoRow
              icon={User}
              label="Full name"
              value={user.fullName}
            />

            <InfoRow
              icon={Mail}
              label="Email"
              value={user.email}
            />

            <InfoRow
              icon={Phone}
              label="Phone"
              value={maskPhone(user.phone)}
            />

            <InfoRow
              icon={Briefcase}
              label="Account role"
              value={user.role}
            />

            <InfoRow
              icon={CalendarDays}
              label="Account created"
              value={formatDate(user.createdAt)}
            />
          </InfoCard>
        )}

        {activeTab === 'documents' && (
          <SectionCard
            title="Documents"
            description="Documents associated with this citizen account."
          >
            {tabLoading ? (
              <LoadingState />
            ) : documents.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No documents"
                description="No documents are currently associated with this account."
              />
            ) : (
              <div className="divide-y divide-white/10">
                {documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {document.fileName || 'Unnamed document'}
                      </p>

                      <p className="mt-1 text-sm text-white/50">
                        {document.fileType || 'Unknown type'}
                        {' • '}
                        {formatDate(document.uploadedAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {document.blockchainStatus && (
                        <span className="rounded-full border border-[#D4AF37]/30 px-3 py-1 text-xs text-[#D4AF37]">
                          Blockchain:{' '}
                          {document.blockchainStatus}
                        </span>
                      )}

                      {document.documentHash && (
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">
                          SHA-256 recorded
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {activeTab === 'activity' && (
          <SectionCard
            title="Recent activity"
            description="Recent recorded activity associated with this account."
          >
            {tabLoading ? (
              <LoadingState />
            ) : audit.length === 0 ? (
              <EmptyState
                icon={History}
                title="No activity recorded"
                description="There are currently no audit events for this account."
              />
            ) : (
              <AuditList entries={audit} formatDate={formatDate} />
            )}
          </SectionCard>
        )}

        {activeTab === 'security' && (
          <SectionCard
            title="Security"
            description="Account-level security indicators."
          >
            <SecurityRow
              label="Password authentication"
              enabled={
                user.security?.passwordConfigured ?? false
              }
            />

            <SecurityRow
              label="Google account connection"
              enabled={
                user.security?.googleConnected ?? false
              }
            />

            <SecurityRow
              label="Document security configuration"
              enabled={
                user.security
                  ?.documentSecurityConfigured ?? false
              }
            />
          </SectionCard>
        )}

        {activeTab === 'audit' && (
          <SectionCard
            title="Audit Trail"
            description="Complete audit history currently recorded for this citizen account."
          >
            {tabLoading ? (
              <LoadingState />
            ) : audit.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="No audit events"
                description="No audit events are currently recorded for this account."
              />
            ) : (
              <AuditList entries={audit} formatDate={formatDate} />
            )}
          </SectionCard>
        )}
      </main>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/50">
          {label}
        </span>

        <Icon className="h-5 w-5 text-[#D4AF37]" />
      </div>

      <p className="mt-4 text-3xl font-semibold">
        {value}
      </p>
    </div>
  )
}

function InfoCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <h2 className="mb-5 text-lg font-semibold">
        {title}
      </h2>

      <div className="space-y-1">
        {children}
      </div>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-4 border-b border-white/5 py-4 last:border-0">
      <Icon className="h-4 w-4 shrink-0 text-[#D4AF37]" />

      <span className="w-36 shrink-0 text-sm text-white/45">
        {label}
      </span>

      <span className="text-sm text-white/85 break-all">
        {value || 'Not provided'}
      </span>
    </div>
  )
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <h2 className="text-lg font-semibold">
        {title}
      </h2>

      <p className="mt-1 text-sm text-white/45">
        {description}
      </p>

      <div className="mt-6">
        {children}
      </div>
    </div>
  )
}

function SecurityRow({
  label,
  enabled,
}: {
  label: string
  enabled: boolean
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-5 last:border-0">
      <div className="flex items-center gap-3">
        <Lock className="h-4 w-4 text-[#D4AF37]" />

        <span className="text-sm">
          {label}
        </span>
      </div>

      <span
        className={`rounded-full px-3 py-1 text-xs ${
          enabled
            ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : 'border border-white/10 bg-white/5 text-white/40'
        }`}
      >
        {enabled ? 'Configured' : 'Not configured'}
      </span>
    </div>
  )
}

function AuditList({
  entries,
  formatDate,
}: {
  entries: AuditEntry[]
  formatDate: (value?: string) => string
}) {
  return (
    <div className="divide-y divide-white/10">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="py-5"
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-medium">
                {entry.action}
              </p>

              <p className="mt-1 text-sm text-white/55">
                {entry.description}
              </p>
            </div>

            <span className="shrink-0 text-xs text-white/40">
              {formatDate(entry.createdAt)}
            </span>
          </div>

          {entry.entityType && (
            <p className="mt-3 text-xs text-white/35">
              Entity: {entry.entityType}
              {entry.entityId
                ? ` #${entry.entityId}`
                : ''}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16 text-white/50">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      Loading...
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileText
  title: string
  description: string
}) {
  return (
    <div className="py-16 text-center">
      <Icon className="mx-auto h-8 w-8 text-white/30" />

      <h3 className="mt-4 font-medium">
        {title}
      </h3>

      <p className="mt-1 text-sm text-white/40">
        {description}
      </p>
    </div>
  )
}