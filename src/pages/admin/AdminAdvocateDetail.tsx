import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  FileText,
  History,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Scale,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

type AdvocateData = {
  id: number
  fullName: string
  email: string
  phone: string
  role: string
  createdAt: string

  professional?: {
    lawyerId: number
    specialization: string
    experience: string
    location: string
    bio: string
    verified: boolean
    highCourt: string
    enrollmentYear: string
  }

  statistics?: {
    documents: number
    consultations: number
    clients: number
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

type ConsultationData = {
  id: number
  appointmentDate: string
  status: string
  notes: string
  createdAt: string

  citizen: {
    id: number
    name: string
    email: string
    phone: string
  }
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
  | 'professional'
  | 'documents'
  | 'consultations'
  | 'activity'
  | 'security'
  | 'audit'

export default function AdminAdvocateDetail() {
  const navigate = useNavigate()
  const { advocateId } = useParams()

  const [advocate, setAdvocate] =
    useState<AdvocateData | null>(null)

  const [documents, setDocuments] =
    useState<DocumentData[]>([])

  const [consultations, setConsultations] =
    useState<ConsultationData[]>([])

  const [audit, setAudit] =
    useState<AuditEntry[]>([])

  const [activeTab, setActiveTab] =
    useState<Tab>('overview')

  const [loading, setLoading] =
    useState(true)

  const [tabLoading, setTabLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  useEffect(() => {
    if (!advocateId) {
      setError('Invalid advocate ID.')
      setLoading(false)
      return
    }

    loadAdvocate()
  }, [advocateId])

  useEffect(() => {
    if (!advocateId) return

    if (activeTab === 'documents') {
      loadDocuments()
    }

    if (activeTab === 'consultations') {
      loadConsultations()
    }

    if (
      activeTab === 'activity' ||
      activeTab === 'audit'
    ) {
      loadAudit()
    }
  }, [activeTab, advocateId])

  async function loadAdvocate() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(
        `${API_URL}/api/admin/advocates/${advocateId}`,
        {
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            'Unable to load advocate.'
        )
      }

      setAdvocate(data.advocate)
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load advocate.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadDocuments() {
    try {
      setTabLoading(true)

      const response = await fetch(
        `${API_URL}/api/admin/advocates/${advocateId}/documents`,
        {
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            'Unable to load documents.'
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

  async function loadConsultations() {
    try {
      setTabLoading(true)

      const response = await fetch(
        `${API_URL}/api/admin/advocates/${advocateId}/consultations`,
        {
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            'Unable to load consultations.'
        )
      }

      setConsultations(
        data.consultations || []
      )
    } catch (err) {
      console.error(err)
      setConsultations([])
    } finally {
      setTabLoading(false)
    }
  }

  async function loadAudit() {
    try {
      setTabLoading(true)

      const response = await fetch(
        `${API_URL}/api/admin/advocates/${advocateId}/audit`,
        {
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            'Unable to load audit history.'
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
          Loading advocate...
        </div>
      </div>
    )
  }

  if (error || !advocate) {
    return (
      <div className="min-h-screen bg-[var(--bg,#000)] text-[var(--text,#fff)]">
        <div className="border-b border-[#D4AF37]/30">
          <div className="mx-auto max-w-7xl px-6 py-5">
            <button
              onClick={() =>
                navigate('/admin/advocates')
              }
              className="flex items-center gap-2 text-white/70 hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Advocates
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-red-300">
            {error || 'Advocate not found.'}
          </div>
        </div>
      </div>
    )
  }

  const professional =
    advocate.professional

  const tabs: {
    id: Tab
    label: string
    icon: typeof User
  }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: User,
    },
    {
      id: 'professional',
      label: 'Professional Profile',
      icon: Scale,
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText,
    },
    {
      id: 'consultations',
      label: 'Consultations',
      icon: CalendarDays,
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
            onClick={() =>
              navigate('/admin/advocates')
            }
            className="flex items-center gap-2 text-white/70 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Advocates
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
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 flex items-center justify-center">
                <Scale className="h-7 w-7 text-[#D4AF37]" />
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">
                  Advocate Account
                </p>

                <h1 className="mt-1 text-3xl font-semibold">
                  {advocate.fullName ||
                    'Unnamed Advocate'}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/50">
                  <span>
                    Advocate ID #{advocate.id}
                  </span>

                  {professional?.verified && (
                    <span className="inline-flex items-center gap-1 text-emerald-300">
                      <BadgeCheck className="h-4 w-4" />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70">
              {advocate.role}
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="mb-8 overflow-x-auto border-b border-white/10">
          <div className="flex min-w-max gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const active =
                activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() =>
                    setActiveTab(tab.id)
                  }
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

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                icon={FileText}
                label="Documents"
                value={
                  advocate.statistics
                    ?.documents ?? 0
                }
              />

              <StatCard
                icon={CalendarDays}
                label="Consultations"
                value={
                  advocate.statistics
                    ?.consultations ?? 0
                }
              />

              <StatCard
                icon={Users}
                label="Clients"
                value={
                  advocate.statistics
                    ?.clients ?? 0
                }
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <InfoCard title="Account information">
                <InfoRow
                  icon={User}
                  label="Full name"
                  value={advocate.fullName}
                />

                <InfoRow
                  icon={Mail}
                  label="Email"
                  value={advocate.email}
                />

                <InfoRow
                  icon={Phone}
                  label="Phone"
                  value={maskPhone(
                    advocate.phone
                  )}
                />

                <InfoRow
                  icon={CalendarDays}
                  label="Joined"
                  value={formatDate(
                    advocate.createdAt
                  )}
                />
              </InfoCard>

              <InfoCard title="Professional information">
                <InfoRow
                  icon={Scale}
                  label="Practice area"
                  value={
                    professional
                      ?.specialization ||
                    'Not provided'
                  }
                />

                <InfoRow
                  icon={MapPin}
                  label="Location"
                  value={
                    professional?.location ||
                    'Not provided'
                  }
                />

                <InfoRow
                  icon={Briefcase}
                  label="Experience"
                  value={
                    professional?.experience ||
                    'Not provided'
                  }
                />

                <InfoRow
                  icon={BadgeCheck}
                  label="Verification"
                  value={
                    professional?.verified
                      ? 'Verified'
                      : 'Unverified'
                  }
                />
              </InfoCard>
            </div>
          </div>
        )}

        {/* Professional Profile */}
        {activeTab === 'professional' && (
          <div className="space-y-6">
            <InfoCard title="Professional profile">
              <InfoRow
                icon={Scale}
                label="Practice area"
                value={
                  professional?.specialization ||
                  'Not provided'
                }
              />

              <InfoRow
                icon={Briefcase}
                label="Experience"
                value={
                  professional?.experience ||
                  'Not provided'
                }
              />

              <InfoRow
                icon={MapPin}
                label="Location"
                value={
                  professional?.location ||
                  'Not provided'
                }
              />

              <InfoRow
                icon={Scale}
                label="High Court"
                value={
                  professional?.highCourt ||
                  'Not provided'
                }
              />

              <InfoRow
                icon={CalendarDays}
                label="Enrollment year"
                value={
                  professional?.enrollmentYear ||
                  'Not provided'
                }
              />

              <InfoRow
                icon={BadgeCheck}
                label="Verification"
                value={
                  professional?.verified
                    ? 'Verified'
                    : 'Unverified'
                }
              />
            </InfoCard>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h2 className="text-lg font-semibold">
                Biography
              </h2>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/60">
                {professional?.bio ||
                  'No biography has been provided.'}
              </p>
            </div>
          </div>
        )}

        {/* Documents */}
        {activeTab === 'documents' && (
          <SectionCard
            title="Documents"
            description="Documents associated with this advocate account."
          >
            {tabLoading ? (
              <LoadingState />
            ) : documents.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No documents"
                description="No documents are currently associated with this advocate account."
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
                        {document.fileName ||
                          'Unnamed document'}
                      </p>

                      <p className="mt-1 text-sm text-white/50">
                        {document.fileType ||
                          'Unknown type'}
                        {' • '}
                        {formatDate(
                          document.uploadedAt
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {document.blockchainStatus && (
                        <span className="rounded-full border border-[#D4AF37]/30 px-3 py-1 text-xs text-[#D4AF37]">
                          Blockchain:{' '}
                          {
                            document.blockchainStatus
                          }
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

        {/* Consultations */}
        {activeTab === 'consultations' && (
          <SectionCard
            title="Consultations"
            description="Consultation appointments associated with this advocate."
          >
            {tabLoading ? (
              <LoadingState />
            ) : consultations.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No consultations"
                description="No consultation records are currently available."
              />
            ) : (
              <div className="divide-y divide-white/10">
                {consultations.map(
                  (consultation) => (
                    <div
                      key={consultation.id}
                      className="py-5"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-medium">
                            {consultation.citizen
                              ?.name ||
                              'Unknown citizen'}
                          </p>

                          <p className="mt-1 text-sm text-white/50">
                            {consultation.citizen
                              ?.email || ''}
                          </p>

                          <p className="mt-3 text-sm text-white/70">
                            Appointment:{' '}
                            {formatDate(
                              consultation.appointmentDate
                            )}
                          </p>
                        </div>

                        <span className="w-fit rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
                          {consultation.status ||
                            'Unknown'}
                        </span>
                      </div>

                      {consultation.notes && (
                        <p className="mt-4 text-sm leading-6 text-white/50">
                          {consultation.notes}
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </SectionCard>
        )}

        {/* Activity */}
        {activeTab === 'activity' && (
          <SectionCard
            title="Recent activity"
            description="Recent recorded activity associated with this advocate account."
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
              <AuditList
                entries={audit}
                formatDate={formatDate}
              />
            )}
          </SectionCard>
        )}

        {/* Security */}
        {activeTab === 'security' && (
          <SectionCard
            title="Security"
            description="Account-level security indicators."
          >
            <SecurityRow
              label="Password authentication"
              enabled={
                advocate.security
                  ?.passwordConfigured ??
                false
              }
            />

            <SecurityRow
              label="Google account connection"
              enabled={
                advocate.security
                  ?.googleConnected ??
                false
              }
            />

            <SecurityRow
              label="Document security configuration"
              enabled={
                advocate.security
                  ?.documentSecurityConfigured ??
                false
              }
            />
          </SectionCard>
        )}

        {/* Audit */}
        {activeTab === 'audit' && (
          <SectionCard
            title="Audit Trail"
            description="Complete audit history currently recorded for this advocate account."
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
              <AuditList
                entries={audit}
                formatDate={formatDate}
              />
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

      <span className="break-all text-sm text-white/85">
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
        {enabled
          ? 'Configured'
          : 'Not configured'}
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