import { useCallback, useEffect, useRef, useState } from 'react'
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

// Loaded on demand so jsPDF is not part of the main dashboard bundle.
const pdfLib = () => import('../lib/workPdf')
const MAX_PROMPT = 8000
const MAX_UPLOAD = 25 * 1024 * 1024
const ACTIVE_KEY = 'work:active'

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

// "Create a PDF report…" -> document mode; "summarize this PDF" -> normal chat.
const wantsPdf = (t: string) =>
  /\b(create|generate|make|prepare|build|produce|export|draft|write)\b\s+(me\s+)?(a|an|the)?\s*([\w-]+\s+){0,4}pdf\b/i.test(t) &&
  !/\b(this|the|uploaded|attached|my)\s+pdf\b/i.test(t)

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
  const [loadingConv, setLoadingConv] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pdfUrl, setPdfUrl] = useState('')
  const viewRef = useRef(0) // bumps whenever the visible conversation changes

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

  const openConv = useCallback(async (id: number, silent = false) => {
    const view = ++viewRef.current
    setError('')
    setSidebar(false)
    setPreview(null)
    setEditing(null)
    setBusy(false)
    setLoadingConv(true)
    try {
      const d = await api(`/conversations/${id}`)
      if (viewRef.current !== view) return
      setActiveId(id)
      sessionStorage.setItem(ACTIVE_KEY, String(id))
      setMessages(d.messages || [])
      setDocs(d.documents || [])
    } catch (e) {
      if (viewRef.current !== view) return
      if (silent) sessionStorage.removeItem(ACTIVE_KEY)
      else setError((e as Error).message)
    } finally {
      if (viewRef.current === view) setLoadingConv(false)
    }
  }, [])

  // Reopen the last conversation after a page refresh.
  useEffect(() => {
    try {
      const saved = Number(sessionStorage.getItem(ACTIVE_KEY))
      if (saved > 0) openConv(saved, true)
    } catch {
      /* storage unavailable */
    }
  }, [openConv])

  const newChat = () => {
    viewRef.current++
    sessionStorage.removeItem(ACTIVE_KEY)
    setBusy(false)
    setLoadingConv(false)
    setEditing(null)
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
    if (text.length > MAX_PROMPT) {
      setError(`Message is too long (max ${MAX_PROMPT} characters).`)
      return
    }
    setError('')
    setInput('')
    const asPdf = pdfMode || wantsPdf(text)
    const view = viewRef.current
    const tempId = `u${Date.now()}`
    setMessages((m) => [...m, { id: tempId, role: 'user', content: text }])
    setBusy(true)
    try {
      const d = await api(asPdf ? '/documents/generate' : '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          asPdf ? { conversationId: activeId, prompt: text } : { conversationId: activeId, message: text },
        ),
      })
      loadConvs(search.trim())
      if (viewRef.current !== view) return // user switched chats; the reply is saved and shows when reopened
      setActiveId(d.conversationId)
      sessionStorage.setItem(ACTIVE_KEY, String(d.conversationId))
      setMessages((m) => [...m, d.message])
      if (d.message.kind === 'document') setPreview(d.message)
      setPdfMode(false)
    } catch (e) {
      // Nothing was saved on the server: drop the optimistic bubble and give the text back.
      if (viewRef.current === view) {
        setMessages((m) => m.filter((x) => x.id !== tempId))
        setInput(text)
        setError((e as Error).message)
      }
    } finally {
      if (viewRef.current === view) setBusy(false)
    }
  }

  const upload = async (file?: File | null) => {
    if (!file) return
    if (file.size > MAX_UPLOAD) {
      setError('File is too large (max 25 MB).')
      if (fileRef.current) fileRef.current.value = ''
      return
    }
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

  const saveEdit = async () => {
    if (!editing || saving) return
    const text = editing.text.trim()
    if (!text) {
      setError('Content cannot be empty.')
      return
    }
    if (typeof editing.id !== 'number') {
      setEditing(null)
      return
    }
    setSaving(true)
    setError('')
    try {
      const d = await api(`/messages/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      const saved = d.message as { id: number; content: string; title: string | null }
      setMessages((ms) => ms.map((m) => (m.id === saved.id ? { ...m, content: saved.content, title: saved.title ?? m.title } : m)))
      setPreview((p) => (p && p.id === saved.id ? { ...p, content: saved.content, title: saved.title ?? p.title } : p))
      setEditing(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const getPdf = async (title: string, content: string) => {
    try {
      ;(await pdfLib()).downloadPdf(title, content)
    } catch (e) {
      setError(`Could not create the PDF: ${(e as Error).message}`)
    }
  }

  const pickTask = (t: (typeof tasks)[number]) => {
    if (t.upload) fileRef.current?.click()
    setPdfMode(!!t.pdf)
    setInput(t.prompt)
    setTimeout(() => textRef.current?.focus(), 0)
  }

  // Build the preview PDF in an effect so the blob URL is created/revoked safely (StrictMode-proof).
  useEffect(() => {
    if (!preview) {
      setPdfUrl('')
      return
    }
    let dead = false
    let url = ''
    pdfLib()
      .then((l) => {
        if (dead) return
        url = l.pdfBlobUrl(preview.title || 'Document', preview.content)
        setPdfUrl(url)
      })
      .catch((e) => !dead && setError(`Could not build the PDF preview: ${(e as Error).message}`))
    return () => {
      dead = true
      if (url) URL.revokeObjectURL(url)
      setPdfUrl('')
    }
  }, [preview?.id, preview?.content, preview?.title]) // eslint-disable-line react-hooks/exhaustive-deps

  const sidebarEl = (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-[#51402F] bg-[#1B1816]">
      <div className="space-y-3 p-3">
        <button
          onClick={newChat}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white"
          style={{ background: BRONZE }}
        >
          <Plus size={16} /> New Chat
        </button>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B9AEA3]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            className="w-full rounded-lg border border-[#51402F] bg-[#211D19] py-2 pl-8 pr-3 text-sm text-[#F5F1EB] placeholder:text-[#B9AEA3] outline-none focus:border-[#C27635]"
          />
        </div>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {convs.length === 0 && <p className="px-3 py-6 text-center text-xs text-[#B9AEA3]">No conversations yet</p>}
        {convs.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-1 rounded-lg px-3 py-2 text-sm ${
              c.id === activeId ? 'bg-[#C27635]/15 text-[#F5F1EB] ring-1 ring-[#C27635]/40' : 'text-[#B9AEA3] hover:bg-[#30251C] hover:text-[#F5F1EB]'
            }`}
          >
            <button onClick={() => openConv(c.id)} className="min-w-0 flex-1 truncate text-left">
              {c.title}
            </button>
            <button
              onClick={() => removeConv(c.id)}
              aria-label="Delete conversation"
              className="text-[#B9AEA3] opacity-0 hover:text-red-400 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </aside>
  )

  return (
    <div className="relative flex h-[calc(100dvh-13rem)] min-h-[480px] overflow-hidden rounded-xl border border-[#51402F] bg-[#151311]">
      <div className="hidden md:block">{sidebarEl}</div>
      {sidebar && (
        <div className="absolute inset-0 z-30 flex md:hidden">
          {sidebarEl}
          <div className="flex-1 bg-black/30" onClick={() => setSidebar(false)} />
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-[#51402F] bg-[#1B1816]/90 px-4 py-3 backdrop-blur-sm">
          <button className="text-[#F5F1EB] md:hidden" onClick={() => setSidebar(true)} aria-label="Conversations">
            <Menu size={20} />
          </button>
          <BriefcaseBusiness size={18} style={{ color: BRONZE }} />
          <h1 className="text-base font-semibold text-[#F5F1EB]">Work Through</h1>
          <span className="hidden text-xs text-[#B9AEA3] sm:inline">General-purpose AI workspace</span>
        </header>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <div
              className="flex-1 overflow-y-auto px-4 py-5"
              style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(194,118,53,0.10) 0%, rgba(194,118,53,0) 55%), #151311' }}
            >
              {loadingConv ? (
                <div className="flex items-center justify-center gap-2 pt-16 text-sm text-[#B9AEA3]">
                  <Loader2 size={16} className="animate-spin" /> Loading conversation…
                </div>
              ) : messages.length === 0 ? (
                <div className="mx-auto max-w-3xl pt-6 text-center">
                  <h2 className="text-2xl font-semibold text-[#F5F1EB]">What would you like to work on?</h2>
                  <p className="mt-1 text-sm text-[#B9AEA3]">Emails, letters, reports, PDFs, summaries and more.</p>
                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {tasks.map((t) => (
                      <button
                        key={t.label}
                        onClick={() => pickTask(t)}
                        className="rounded-xl border border-[#51402F] bg-[#211D19]/90 p-4 text-left shadow-[inset_0_1px_0_rgba(245,241,235,0.04)] backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#C27635]/70 hover:bg-[#30251C] hover:shadow-[0_0_0_1px_rgba(194,118,53,0.25),0_8px_24px_-8px_rgba(194,118,53,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C27635]/60"
                      >
                        <div className="text-xl">{t.icon}</div>
                        <div className="mt-2 text-sm font-medium text-[#F5F1EB]">{t.label}</div>
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
                              ? 'border border-[#C27635]/60 text-white shadow-sm'
                              : 'border border-[#51402F] bg-[#211D19] text-[#F5F1EB]'
                          }`}
                          style={m.role === 'user' ? { background: BRONZE } : undefined}
                        >
                          {m.role === 'user' ? (
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          ) : isEditing && !isDoc ? (
                            <div className="space-y-2">
                              <textarea
                                value={editing.text}
                                onChange={(e) => setEditing({ id: m.id, text: e.target.value })}
                                rows={12}
                                className="w-full rounded-lg border border-stone-300 bg-white p-2 font-mono text-stone-800 text-xs outline-none focus:border-[#C27635]"
                              />
                              <div className="flex gap-2">
                                <button onClick={saveEdit} disabled={saving} className="rounded-md px-3 py-1 text-xs text-white disabled:opacity-50" style={{ background: BRONZE }}>{saving ? 'Saving…' : 'Save'}</button>
                                <button onClick={() => setEditing(null)} className="rounded-md border border-stone-300 px-3 py-1 text-xs text-white">Cancel</button>
                              </div>
                            </div>
                          ) : isDoc ? (
                            <div className="flex items-center gap-3">
                              <FileText size={28} style={{ color: BRONZE }} />
                              <div className="min-w-0">
                                <div className="truncate font-medium">{m.title || 'Document'}</div>
                                <div className="text-xs text-stone-300">PDF document ready</div>
                              </div>
                            </div>
                          ) : (
                            <AnimatedMarkdown content={m.content} />
                          )}

                          {m.role === 'assistant' && !(isEditing && !isDoc) && (
                            <div className="mt-3 flex flex-wrap gap-2 border-t border-white/20 pt-2 text-xs text-stone-300">
                              {isDoc && (
                                <>
                                  <button onClick={() => setPreview(m)} className="flex items-center gap-1 hover:text-[#C27635]"><FileText size={13} /> Preview</button>
                                  <button onClick={() => getPdf(m.title || 'Document', m.content)} className="flex items-center gap-1 hover:text-[#C27635]"><Download size={13} /> Download PDF</button>
                                </>
                              )}
                              <button onClick={() => copy(m)} className="flex items-center gap-1 hover:text-[#C27635]">
                                {copied === m.id ? <Check size={13} /> : <Copy size={13} />} {copied === m.id ? 'Copied' : 'Copy'}
                              </button>
                              <button onClick={() => { if (isDoc) setPreview(m); setEditing({ id: m.id, text: m.content }) }} className="flex items-center gap-1 hover:text-[#C27635]"><Pencil size={13} /> Edit</button>
                              {!isDoc && (
                                <button onClick={() => getPdf(m.title || 'Nyaya Work', m.content)} className="flex items-center gap-1 hover:text-[#C27635]"><Download size={13} /> PDF</button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {busy && (
                    <div className="flex items-center gap-2 text-sm text-[#B9AEA3]">
                      <Loader2 size={16} className="animate-spin" /> {pdfMode || wantsPdf(messages[messages.length - 1]?.content || '') ? 'Generating document…' : 'Thinking…'}
                    </div>
                  )}
                  <div ref={endRef} />
                </div>
              )}
            </div>

            <div className="border-t border-[#51402F] bg-[#1B1816] p-3">
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
                      <span key={d.id} className="flex items-center gap-1 rounded-full border border-[#C27635]/40 bg-[#C27635]/15 px-3 py-1 text-xs text-[#F5F1EB]">
                        <FileText size={12} /> {d.file_name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2 rounded-xl border border-[#51402F] bg-[#211D19] p-2 text-[#F5F1EB] focus-within:border-[#C27635] focus-within:shadow-[0_0_0_3px_rgba(194,118,53,0.15)]">
                  <input ref={fileRef} type="file" hidden accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp" onChange={(e) => upload(e.target.files?.[0])} />
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Upload document" className="p-2 text-[#B9AEA3] hover:text-[#C27635]">
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
                  </button>
                  <button
                    onClick={() => setPdfMode((v) => !v)}
                    aria-pressed={pdfMode}
                    title="Generate as PDF document"
                    className={`rounded-md px-2 py-1 text-xs font-medium ${pdfMode ? 'text-white' : 'border border-[#51402F] text-[#B9AEA3] hover:bg-[#30251C]'}`}
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
                    className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-[#F5F1EB] placeholder:text-[#B9AEA3] outline-none"
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
                    onClick={() => getPdf(preview.title || 'Document', preview.content)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-white"
                    style={{ background: BRONZE }}
                  >
                    <Download size={14} /> PDF
                  </button>
                  <button onClick={() => setPreview(null)} className="p-1 text-stone-500" aria-label="Close preview"><X size={16} /></button>
                </div>
              </div>
              {editing?.id === preview.id ? (
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <textarea
                    value={editing.text}
                    onChange={(e) => setEditing({ id: preview.id, text: e.target.value })}
                    className="flex-1 resize-none rounded-lg border border-stone-300 p-2 font-mono text-xs outline-none focus:border-[#C27635]"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={saving} className="rounded-md px-3 py-1.5 text-xs text-white disabled:opacity-50" style={{ background: BRONZE }}>{saving ? 'Saving…' : 'Save & update PDF'}</button>
                    <button onClick={() => setEditing(null)} className="rounded-md border border-stone-300 px-3 py-1.5 text-xs">Cancel</button>
                  </div>
                </div>
              ) : pdfUrl ? (
                <iframe title="PDF preview" src={pdfUrl} className="w-full flex-1" />
              ) : (
                <div className="flex flex-1 items-center justify-center gap-2 text-sm text-stone-500">
                  <Loader2 size={16} className="animate-spin" /> Building preview…
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
