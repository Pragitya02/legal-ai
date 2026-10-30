import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import {
  BriefcaseBusiness,
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  X,
  Menu,
} from 'lucide-react'
import AnimatedMarkdown from '../components/AnimatedMarkdown'
import { downloadPdf, pdfBlobUrl } from '../lib/workPdf'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5001'
const BRONZE = '#C27635'

type Msg = {
  id: number | string
  role: 'user' | 'assistant'
  kind?: string
  title?: string | null
  content: string
}
type Conv = { id: number; title: string; updated_at: string }
type Doc = { id: number; file_name: string }

const CITIZEN_TASKS = [
  { label: 'Write an Email', prompt: 'Write a professional email to ', icon: '✉️' },
  { label: 'Create a PDF', prompt: 'Create a PDF report about ', icon: '📄', pdf: true },
  { label: 'Draft an Application', prompt: 'Draft a formal application for ', icon: '📝' },
  { label: 'Write a Formal Letter', prompt: 'Write a formal letter to ', icon: '📬' },
  { label: 'Summarize a Document', prompt: 'Summarize the uploaded document', icon: '📚', upload: true },
  { label: 'Create a Resume', prompt: 'Create a professional resume for ', icon: '👤', pdf: true },
  { label: 'Ask Anything', prompt: '', icon: '💬' },
]
const ADVOCATE_TASKS = [
  { label: 'Draft Client Email', prompt: 'Draft a professional email to my client regarding ', icon: '✉️' },
  { label: 'Create an Invoice', prompt: 'Create a PDF invoice for legal services: client ', icon: '🧾', pdf: true },
  { label: 'Generate PDF Report', prompt: 'Create a PDF report about ', icon: '📄', pdf: true },
  { label: 'Draft Professional Letter', prompt: 'Draft a professional letter to ', icon: '📬' },
  { label: 'Summarize Documents', prompt: 'Summarize the uploaded document', icon: '📚', upload: true },
  { label: 'Prepare Meeting Agenda', prompt: 'Prepare a meeting agenda for ', icon: '🗓️', pdf: true },
  { label: 'Ask Anything', prompt: '', icon: '💬' },
]

const wantsPdf = (t: string) =>
  /\bpdf\b/i.test(t) && /(create|generate|make|prepare|write|draft|build|export|produce)/i.test(t)

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}/api/work${path}`, { ...init, credentials: 'include' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.success === false) throw new Error(data?.message || `Request failed (${res.status})`)
  return data
}

export default function Work() {
  const { pathname } = useLocation()
  const isAdvocate = pathname.startsWith('/advocate')
  const tasks = isAdvocate ? ADVOCATE_TASKS : CITIZEN_TASKS

  const [convs, setConvs] = useState<Conv[]>([])
  const [search, setSearch] = useState('')
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [input, setInput] = useState('')
  const [pdfMode, setPdfMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [sidebar, setSidebar] = useState(false)
  const [preview, setPreview] = useState<Msg | null>(null)
  const [editing, setEditing] = useState<{ id: Msg['id']; text: string } | null>(null)
  const [copied, setCopied] = useState<Msg['id'] | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const loadConvs = useCallback(async (q = '') => {
    try {
      const d = await api(`/conversations${q ? `?q=${encodeURIComponent(q)}` : ''}`)
      setConvs(d.conversations || [])
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => loadConvs(search.trim()), 250)
    return () => clearTimeout(t)
  }, [search, loadConvs])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  const openConv = async (id: number) => {
    setError('')
    setSidebar(false)
    setPreview(null)
    try {
      const d = await api(`/conversations/${id}`)
      setActiveId(id)
      setMessages(d.messages || [])
      setDocs(d.documents || [])
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const newChat = () => {
    setActiveId(null)
    setMessages([])
    setDocs([])
    setPreview(null)
    setInput('')
    setError('')
    setSidebar(false)
  }

  const removeConv = async (id: number) => {
    if (!window.confirm('Delete this conversation?')) return
    try {
      await api(`/conversations/${id}`, { method: 'DELETE' })
      if (id === activeId) newChat()
      loadConvs(search.trim())
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const send = async (override?: string) => {
    const text = (override ?? input).trim()
    if (!text || busy) return
    setError('')
    setInput('')
    const asPdf = pdfMode || wantsPdf(text)
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: 'user', content: text }])
    setBusy(true)
    try {
      const d = await api(asPdf ? '/documents/generate' : '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          asPdf
            ? { conversationId: activeId, prompt: text }
            : { conversationId: activeId, message: text },
        ),
      })
      setActiveId(d.conversationId)
      setMessages((m) => [...m, d.message])
      if (d.message.kind === 'document') setPreview(d.message)
      setPdfMode(false)
      loadConvs(search.trim())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const upload = async (file?: File | null) => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('document', file)
      if (activeId) fd.append('conversationId', String(activeId))
      const d = await api('/documents/upload', { method: 'POST', body: fd })
      setActiveId(d.conversationId)
      setDocs((x) => [...x, d.document])
      loadConvs(search.trim())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const copy = async (m: Msg) => {
    try {
      await navigator.clipboard.writeText(m.content)
      setCopied(m.id)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      setError('Copy failed. Please copy manually.')
    }
  }

  const saveEdit = () => {
    if (!editing) return
    setMessages((ms) => ms.map((m) => (m.id === editing.id ? { ...m, content: editing.text } : m)))
    setPreview((p) => (p && p.id === editing.id ? { ...p, content: editing.text } : p))
    setEditing(null)
  }

  const pickTask = (t: (typeof tasks)[number]) => {
    if (t.upload) fileRef.current?.click()
    setPdfMode(!!t.pdf)
    setInput(t.prompt)
    setTimeout(() => textRef.current?.focus(), 0)
  }

  const pdfUrl = useMemo(() => (preview ? pdfBlobUrl(preview.title || 'Document', preview.content) : ''), [preview])
  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl) }, [pdfUrl])

  const sidebarEl = (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-stone-200 bg-white">
      <div className="space-y-3 p-3">
        <button
          onClick={newChat}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white"
          style={{ background: BRONZE }}
        >
          <Plus size={16} /> New Chat
        </button>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            className="w-full rounded-lg border border-stone-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-[#C27635]"
          />
        </div>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {convs.length === 0 && <p className="px-3 py-6 text-center text-xs text-stone-400">No conversations yet</p>}
        {convs.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-1 rounded-lg px-3 py-2 text-sm ${
              c.id === activeId ? 'bg-[#C27635]/10 text-[#8a4f1f]' : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            <button onClick={() => openConv(c.id)} className="min-w-0 flex-1 truncate text-left">
              {c.title}
            </button>
            <button
              onClick={() => removeConv(c.id)}
              aria-label="Delete conversation"
              className="text-stone-400 opacity-0 hover:text-red-600 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </aside>
  )

  return (
    <div className="relative flex h-[calc(100vh-4rem)] min-h-[500px] overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
      <div className="hidden md:block">{sidebarEl}</div>
      {sidebar && (
        <div className="absolute inset-0 z-30 flex md:hidden">
          {sidebarEl}
          <div className="flex-1 bg-black/30" onClick={() => setSidebar(false)} />
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-stone-200 bg-white px-4 py-3">
          <button className="md:hidden" onClick={() => setSidebar(true)} aria-label="Conversations">
            <Menu size={20} />
          </button>
          <BriefcaseBusiness size={18} style={{ color: BRONZE }} />
          <h1 className="text-base font-semibold text-stone-800">Work</h1>
          <span className="hidden text-xs text-stone-400 sm:inline">General-purpose AI workspace</span>
        </header>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-5">
              {messages.length === 0 ? (
                <div className="mx-auto max-w-3xl pt-6 text-center">
                  <h2 className="text-2xl font-semibold text-stone-800">What would you like to work on?</h2>
                  <p className="mt-1 text-sm text-stone-500">Emails, letters, reports, PDFs, summaries and more.</p>
                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {tasks.map((t) => (
                      <button
                        key={t.label}
                        onClick={() => pickTask(t)}
                        className="rounded-xl border border-stone-200 bg-white p-4 text-left transition hover:border-[#C27635] hover:shadow-sm"
                      >
                        <div className="text-xl">{t.icon}</div>
                        <div className="mt-2 text-sm font-medium text-stone-800">{t.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-3xl space-y-4">
                  {messages.map((m) => {
                    const isDoc = m.kind === 'document'
                    const isEditing = editing?.id === m.id
                    return (
                      <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex'}>
                        <div
                          className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm ${
                            m.role === 'user'
                              ? 'text-white'
                              : 'border border-stone-200 bg-white text-stone-800'
                          }`}
                          style={m.role === 'user' ? { background: BRONZE } : undefined}
                        >
                          {m.role === 'user' ? (
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          ) : isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                value={editing.text}
                                onChange={(e) => setEditing({ id: m.id, text: e.target.value })}
                                rows={12}
                                className="w-full rounded-lg border border-stone-300 p-2 font-mono text-xs outline-none focus:border-[#C27635]"
                              />
                              <div className="flex gap-2">
                                <button onClick={saveEdit} className="rounded-md px-3 py-1 text-xs text-white" style={{ background: BRONZE }}>Save</button>
                                <button onClick={() => setEditing(null)} className="rounded-md border border-stone-300 px-3 py-1 text-xs">Cancel</button>
                              </div>
                            </div>
                          ) : isDoc ? (
                            <div className="flex items-center gap-3">
                              <FileText size={28} style={{ color: BRONZE }} />
                              <div className="min-w-0">
                                <div className="truncate font-medium">{m.title || 'Document'}</div>
                                <div className="text-xs text-stone-500">PDF document ready</div>
                              </div>
                            </div>
                          ) : (
                            <AnimatedMarkdown content={m.content} />
                          )}

                          {m.role === 'assistant' && !isEditing && (
                            <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-2 text-xs text-stone-500">
                              {isDoc && (
                                <>
                                  <button onClick={() => setPreview(m)} className="flex items-center gap-1 hover:text-[#C27635]"><FileText size={13} /> Preview</button>
                                  <button onClick={() => downloadPdf(m.title || 'Document', m.content)} className="flex items-center gap-1 hover:text-[#C27635]"><Download size={13} /> Download PDF</button>
                                </>
                              )}
                              <button onClick={() => copy(m)} className="flex items-center gap-1 hover:text-[#C27635]">
                                {copied === m.id ? <Check size={13} /> : <Copy size={13} />} {copied === m.id ? 'Copied' : 'Copy'}
                              </button>
                              <button onClick={() => setEditing({ id: m.id, text: m.content })} className="flex items-center gap-1 hover:text-[#C27635]"><Pencil size={13} /> Edit</button>
                              {!isDoc && (
                                <button onClick={() => downloadPdf(m.title || 'Nyaya Work', m.content)} className="flex items-center gap-1 hover:text-[#C27635]"><Download size={13} /> PDF</button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {busy && (
                    <div className="flex items-center gap-2 text-sm text-stone-500">
                      <Loader2 size={16} className="animate-spin" /> {pdfMode || wantsPdf(messages[messages.length - 1]?.content || '') ? 'Generating document…' : 'Thinking…'}
                    </div>
                  )}
                  <div ref={endRef} />
                </div>
              )}
            </div>

            <div className="border-t border-stone-200 bg-white p-3">
              <div className="mx-auto max-w-3xl">
                {error && (
                  <div className="mb-2 flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    {error}
                    <button onClick={() => setError('')}><X size={14} /></button>
                  </div>
                )}
                {docs.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {docs.map((d) => (
                      <span key={d.id} className="flex items-center gap-1 rounded-full bg-[#C27635]/10 px-3 py-1 text-xs text-[#8a4f1f]">
                        <FileText size={12} /> {d.file_name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2 rounded-xl border border-stone-300 bg-white p-2 focus-within:border-[#C27635]">
                  <input ref={fileRef} type="file" hidden accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp" onChange={(e) => upload(e.target.files?.[0])} />
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Upload document" className="p-2 text-stone-500 hover:text-[#C27635]">
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
                  </button>
                  <button
                    onClick={() => setPdfMode((v) => !v)}
                    aria-pressed={pdfMode}
                    title="Generate as PDF document"
                    className={`rounded-md px-2 py-1 text-xs font-medium ${pdfMode ? 'text-white' : 'border border-stone-300 text-stone-500'}`}
                    style={pdfMode ? { background: BRONZE } : undefined}
                  >
                    PDF
                  </button>
                  <textarea
                    ref={textRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        send()
                      }
                    }}
                    rows={1}
                    placeholder={pdfMode ? 'Describe the PDF document to create…' : 'Ask anything, draft an email, summarize a document…'}
                    className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
                  />
                  <button
                    onClick={() => send()}
                    disabled={busy || !input.trim()}
                    aria-label="Send"
                    className="rounded-lg p-2 text-white disabled:opacity-40"
                    style={{ background: BRONZE }}
                  >
                    {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {preview && (
            <section className="absolute inset-0 z-20 flex flex-col bg-white lg:static lg:inset-auto lg:w-[420px] lg:shrink-0 lg:border-l lg:border-stone-200">
              <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText size={16} style={{ color: BRONZE }} />
                  <span className="truncate text-sm font-medium">{preview.title || 'Document preview'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditing({ id: preview.id, text: preview.content })} className="p-1 text-stone-500 hover:text-[#C27635]" aria-label="Edit"><Pencil size={16} /></button>
                  <button onClick={() => copy(preview)} className="p-1 text-stone-500 hover:text-[#C27635]" aria-label="Copy"><Copy size={16} /></button>
                  <button
                    onClick={() => downloadPdf(preview.title || 'Document', preview.content)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-white"
                    style={{ background: BRONZE }}
                  >
                    <Download size={14} /> PDF
                  </button>
                  <button onClick={() => setPreview(null)} className="p-1 text-stone-500" aria-label="Close preview"><X size={16} /></button>
                </div>
              </div>
              <iframe title="PDF preview" src={pdfUrl} className="flex-1 w-full" />
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
