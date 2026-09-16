import { useState, useRef } from 'react'
import {
  BookOpen, Upload, FileText, Zap, Scale, Download, Send,
  ChevronRight, X, Gavel, ListChecks, MessageSquare, Sparkles,
} from 'lucide-react'

interface ResearchMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  type?: 'summary' | 'judgments' | 'arguments' | 'draft'
}

const sampleResult: ResearchMessage = {
  id: 'ai-res-1',
  role: 'ai',
  type: 'summary',
  content: 'I have analyzed the uploaded FIR and case materials. Here is the comprehensive research summary:',
}

const researchTools = [
  { icon: FileText, label: 'Upload Case File', sub: 'PDF, DOCX, images', color: 'var(--blue)' },
  { icon: FileText, label: 'Upload FIR', sub: 'First Information Report', color: '#7C3AED' },
  { icon: Gavel, label: 'Upload Court Order', sub: 'Any court / tribunal', color: '#F59E0B' },
  { icon: Scale, label: 'Upload Judgment', sub: 'HC / SC judgments', color: 'var(--emerald)' },
]

export default function AIResearch() {
  const [messages, setMessages] = useState<ResearchMessage[]>([
    {
      id: 'welcome',
      role: 'ai',
      content: 'Welcome to NyayaAI Research Assistant — built exclusively for advocates.\n\nUpload case files, FIRs, court orders, or any legal document. I\'ll provide:\n• Comprehensive case summaries\n• Relevant IPC / CrPC sections and acts\n• Similar judgments from High Courts and Supreme Court\n• Suggested arguments and counter-arguments\n• AI-generated draft petitions\n\nOr ask me to research any point of law directly.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [showResults, setShowResults] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const sendQuery = (text: string) => {
    if (!text.trim()) return
    const userMsg: ResearchMessage = { id: Date.now().toString(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setTimeout(() => {
      setMessages(prev => [...prev, { ...sampleResult, id: Date.now().toString() }])
      setLoading(false)
      setShowResults(true)
    }, 2000)
  }

  const handleUpload = (name: string) => {
    setUploadedFiles(prev => [...prev, name])
    setLoading(true)
    const analysisMsg: ResearchMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `📎 Uploaded document: ${name}`,
    }
    setMessages(prev => [...prev, analysisMsg])
    setTimeout(() => {
      setMessages(prev => [...prev, { ...sampleResult, id: Date.now().toString() }])
      setLoading(false)
      setShowResults(true)
    }, 2200)
  }

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 116px)' }} className="research-layout">
      {/* Left panel */}
      <div style={{
        width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14,
      }} className="research-left">
        {/* Upload tools */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.875rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Upload size={15} style={{ color: 'var(--blue)' }} /> Upload Documents
          </div>
          <input ref={fileRef} type="file" style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0].name)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {researchTools.map(t => (
              <button key={t.label} onClick={() => fileRef.current?.click()}
                style={{
                  padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
                }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: `color-mix(in srgb, ${t.color} 12%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <t.icon size={14} style={{ color: t.color }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}>{t.label}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{t.sub}</div>
                </div>
              </button>
            ))}
          </div>

          {uploadedFiles.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Uploaded Files
              </div>
              {uploadedFiles.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0' }}>
                  <FileText size={12} style={{ color: 'var(--blue)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
                  <button onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick research prompts */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.875rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} style={{ color: '#7C3AED' }} /> Quick Research
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              'Summarize uploaded documents',
              'Find similar SC/HC judgments',
              'Suggest arguments for defence',
              'Draft petition under Sec 482 CrPC',
              'Relevant IPC sections for this case',
              'Counter-arguments by prosecution',
            ].map(p => (
              <button key={p} onClick={() => sendQuery(p)}
                style={{
                  padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)', cursor: 'pointer', textAlign: 'left',
                  fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.15s',
                }}>
                <ChevronRight size={11} style={{ flexShrink: 0 }} /> {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat + results */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', gap: 10,
          backdropFilter: 'blur(20px)',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--blue), #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BookOpen size={15} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>NyayaAI Research Assistant</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Trained on 10M+ Indian court judgments · IPC · CrPC · IBC · All HCs & SC</div>
          </div>
          {showResults && (
            <button className="btn-primary"
              style={{
                marginLeft: 'auto', padding: '7px 14px', borderRadius: 8, fontSize: '0.78rem',
                fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}>
              <Download size={13} /> Export PDF
            </button>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {messages.map(msg => (
            <div key={msg.id} style={{
              display: 'flex', gap: 10, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: msg.role === 'ai'
                  ? 'linear-gradient(135deg, var(--blue), #7C3AED)'
                  : 'linear-gradient(135deg, #059669, #065F46)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
              }}>
                {msg.role === 'ai' ? <BookOpen size={13} /> : 'PS'}
              </div>
              <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className={msg.role === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user'}
                  style={{ padding: '12px 16px' }}>
                  <p style={{ fontSize: '0.875rem', lineHeight: 1.7, whiteSpace: 'pre-line', margin: 0 }}>
                    {msg.content}
                  </p>
                </div>

                {/* Research result cards */}
                {msg.role === 'ai' && msg.type === 'summary' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 680 }}>
                    {/* Case Summary */}
                    <ResultCard
                      icon={FileText} color="var(--blue)" title="AI Case Summary"
                      content="FIR No. 247/2026 — Section 498A IPC (Cruelty by husband/relatives) & Section 406 IPC (Criminal breach of trust) filed at Sadar Police Station, Delhi. The complainant alleges domestic violence and dowry-related harassment since March 2025. Key witnesses: 3 neighbours + 1 family member. Accused presented bail application on 29 July 2026."
                    />

                    {/* Relevant Acts */}
                    <ResultCard
                      icon={Scale} color="#7C3AED" title="Relevant Acts & Sections"
                      items={[
                        'Section 498A IPC — Husband/relatives subjecting woman to cruelty',
                        'Section 406 IPC — Criminal breach of trust (dowry articles)',
                        'Protection of Women from Domestic Violence Act, 2005 — Section 12',
                        'Dowry Prohibition Act, 1961 — Section 3 & 4',
                        'Section 125 CrPC — Maintenance proceedings (parallel remedy)',
                      ]}
                    />

                    {/* Similar Judgments */}
                    <ResultCard
                      icon={Gavel} color="#F59E0B" title="Similar Judgments"
                      judgments={[
                        { case: 'Rajesh Sharma v. State of UP (2022)', court: 'Supreme Court', ruling: 'Directions on misuse of Sec 498A; pre-arrest investigation mandatory.' },
                        { case: 'Lalita Kumari v. Govt. of UP (2014)', court: 'SC (5-bench)', ruling: 'FIR must be registered on cognizable offence; no preliminary inquiry.' },
                        { case: 'Arnesh Kumar v. State of Bihar (2014)', court: 'Supreme Court', ruling: 'Guidelines for arrest in Sec 498A — no automatic arrest; checklist required.' },
                      ]}
                    />

                    {/* Suggested Arguments */}
                    <ResultCard
                      icon={ListChecks} color="var(--emerald)" title="Suggested Defence Arguments"
                      items={[
                        'Seek bail citing Arnesh Kumar guidelines — automatic arrest impermissible under 498A',
                        'Challenge FIR delay — 18 months post-marriage; raise bonafide dispute vs. criminal intent',
                        'File application for joint investigation to identify ulterior motive (matrimonial dispute)',
                        'Seek quashing under Sec 482 CrPC citing abuse of process if evidence is weak',
                        'Gather evidence of marital discord pre-dating the FIR (WhatsApp messages, emails)',
                      ]}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--blue), #7C3AED)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BookOpen size={13} color="white" />
              </div>
              <div className="chat-bubble-ai" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: '50%', background: 'var(--blue)',
                      animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Analyzing case materials and searching judgments...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid var(--border)',
          background: 'var(--bg-glass)', backdropFilter: 'blur(20px)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 8,
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '8px 8px 8px 14px',
          }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuery(input) } }}
              placeholder="Ask about case law, request summaries, find judgments, or generate drafts..."
              rows={1}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none', resize: 'none',
                fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.6, fontFamily: 'inherit',
                maxHeight: 100, overflowY: 'auto', paddingTop: 4,
              }}
            />
            <button onClick={() => sendQuery(input)} disabled={!input.trim() || loading}
              className="btn-primary"
              style={{
                width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: (!input.trim() || loading) ? 0.5 : 1, flexShrink: 0,
              }}>
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        @media (max-width: 800px) {
          .research-layout { flex-direction: column !important; height: auto !important; }
          .research-left { width: 100% !important; }
        }
      `}</style>
    </div>
  )
}

function ResultCard({ icon: Icon, color, title, content, items, judgments }: {
  icon: typeof FileText; color: string; title: string
  content?: string; items?: string[]
  judgments?: { case: string; court: string; ruling: string }[]
}) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={14} style={{ color }} />
        </div>
        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)' }}>{title}</div>
      </div>
      {content && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>{content}</p>}
      {items && (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((item, i) => (
            <li key={i} style={{ display: 'flex', gap: 8, fontSize: '0.82rem', color: 'var(--text)', alignItems: 'flex-start' }}>
              <span style={{ color, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span> {item}
            </li>
          ))}
        </ul>
      )}
      {judgments && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {judgments.map((j, i) => (
            <div key={i} style={{ padding: 10, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text)' }}>{j.case}</div>
              <div style={{ fontSize: '0.7rem', color: '#F59E0B', fontWeight: 600, marginTop: 2 }}>{j.court}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{j.ruling}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
