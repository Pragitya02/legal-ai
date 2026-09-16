import { Link, useNavigate } from 'react-router'
import { useEffect, useRef, useState } from 'react'
import { isLoggedIn } from '../lib/auth'
import {
  Scale, ArrowRight, CheckCircle, Shield, Zap, Globe, Lock,
  MessageSquare, Users, FileSearch, MapPin, Mic, ChevronRight,
  Award, Clock, TrendingUp, BookOpen, Crown, Code2, Database,
  Lightbulb, Target, ShieldCheck, BarChart3,Bot,Languages
} from 'lucide-react'

const stats = [
  { value: '5+', label: 'AI Agents', icon: Bot },
  { value: '24/7', label: 'AI Assistance', icon: Clock },
  { value: '8+', label: 'Languages Supported', icon: Languages },
  { value: 'Secure', label: 'User Data Protection', icon: ShieldCheck },
];

const steps = [
  {
    step: '01', title: 'Describe Your Issue',
    desc: 'Simply type or speak your legal problem in any language — no legal jargon needed.',
    color: '#D4AF37',
  },
  {
    step: '02', title: 'AI Analyzes Your Case',
    desc: 'Our Agentic AI cross-references thousands of statutes, IPC sections, and precedents instantly.',
    color: '#8A6A24',
  },
  {
    step: '03', title: 'Receive Legal Guidance',
    desc: 'Get a structured report with relevant laws, recommended actions, required documents, and timelines.',
    color: '#D4AF37',
  },
  {
    step: '04', title: 'Hire an Advocate',
    desc: 'Browse verified advocates matched to your case type, read reviews, and book consultations.',
    color: '#A27B2C',
  },
]

const features = [
  {
    icon: MessageSquare, title: 'AI Legal Assistant',
    desc: 'ChatGPT-style interface trained on Indian law. Ask anything about your rights and get instant, accurate guidance.',
    color: '#D4AF37', bg: 'rgba(212,175,55,0.08)',
  },
  {
    icon: Users, title: 'Advocate Marketplace',
    desc: 'Connect with 1,840+ verified advocates filtered by specialization, city, language, and consultation fee.',
    color: '#8A6A24', bg: 'rgba(162,123,44,0.08)',
  },
  {
    icon: FileSearch, title: 'AI Document Analyzer',
    desc: 'Upload FIRs, contracts, court orders, and property papers. AI extracts key clauses and flags risks instantly.',
    color: '#D4AF37', bg: 'rgba(212,175,55,0.08)',
  },
  {
    icon: MapPin, title: 'Jurisdiction Finder',
    desc: 'Automatically identify the correct court, jurisdiction, and authority for your case type and location.',
    color: '#A27B2C', bg: 'rgba(162,123,44,0.08)',
  },
  {
    icon: Lock, title: 'Secure Chat',
    desc: 'End-to-end encrypted communication with advocates. Your legal matters stay strictly confidential.',
    color: '#8B4A42', bg: 'rgba(139,74,66,0.07)',
  },
  {
    icon: Globe, title: 'Multilingual Support',
    desc: 'Available in Hindi, English, Tamil, Bengali, Marathi, Telugu, Kannada, and 14 more Indian languages.',
    color: '#527B83', bg: 'rgba(82,123,131,0.08)',
  },
]


const teamProfileLinkStyle: React.CSSProperties = {
  display: 'block',
  padding: '8px 10px',
  borderRadius: 5,
  color: 'rgba(255,255,255,0.78)',
  textDecoration: 'none',
  fontSize: '0.75rem',
  whiteSpace: 'nowrap',
}

export default function Landing() {
  const [openSocial, setOpenSocial] = useState<'linkedin' | 'github' | null>(null)
  const [showDisclaimer, setShowDisclaimer] = useState(true)
  const socialRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const handleProtectedNavigation = (path: string) => {
    if (isLoggedIn()) {
      navigate(path)
    } else {
      navigate('/login')
    }
  }

  // These landing-page feature buttons ALWAYS open the Login page first.
  // This is intentional: even an already-authenticated user must go through
  // the Login page when clicking one of the newly added Legal Help options.
  const requireLogin = (_path: string) => {
    navigate('/login')
  }

  useEffect(() => {
    const disclaimerTimer = window.setTimeout(() => {
      setShowDisclaimer(false)
    }, 10000)

    return () => window.clearTimeout(disclaimerTimer)
  }, [])

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (socialRef.current && !socialRef.current.contains(event.target as Node)) {
        setOpenSocial(null)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  return (
    <div className="landing-page" style={{ overflowX: 'hidden' }}>
      <style>{`
        /* =====================================================
           NYAYA AI LANDING PAGE ONLY
           BLACK BACKGROUND + MOVING WHITE SPARKLES + GOLD UI
           ===================================================== */

        .landing-page {
          --landing-gold: #D4AF37;
          --landing-gold-light: #F0D878;
          --landing-gold-dark: #A88624;
          background: #000 !important;
          color: #fff !important;
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          isolation: isolate;
        }

        /* Two subtle moving particle layers */
        .landing-page::before,
        .landing-page::after {
          content: "";
          position: absolute;
          inset: -120px;
          pointer-events: none;
          z-index: 0;
          background-repeat: repeat;
        }

        .landing-page::before {
          background-image:
            radial-gradient(circle, rgba(255,255,255,.90) 0 1px, transparent 1.6px),
            radial-gradient(circle, rgba(255,255,255,.50) 0 1px, transparent 1.6px);
          background-size: 125px 125px, 195px 195px;
          background-position: 0 0, 45px 80px;
          animation: nyayaStars 38s linear infinite;
        }

        .landing-page::after {
          background-image:
            radial-gradient(circle, rgba(255,255,255,.35) 0 1px, transparent 1.6px),
            radial-gradient(circle, rgba(255,255,255,.20) 0 1px, transparent 1.6px);
          background-size: 165px 165px, 270px 270px;
          background-position: 25px 35px, 120px 70px;
          animation: nyayaStarsReverse 55s linear infinite;
        }

        @keyframes nyayaStars {
          from { transform: translate3d(0,0,0); }
          to   { transform: translate3d(130px,170px,0); }
        }

        @keyframes nyayaStarsReverse {
          from { transform: translate3d(0,0,0); }
          to   { transform: translate3d(-150px,100px,0); }
        }

        /* Keep every real landing element above the particles */
        .landing-page > * {
          position: relative;
          z-index: 1;
        }

        /* Remove old hero/mesh blue backgrounds */
        .landing-page .hero-gradient,
        .landing-page .mesh-gradient {
          background: #000 !important;
        }

        /* All landing sections stay black */
        .landing-page section,
        .landing-page footer {
          background-color: #000 !important;
        }

        /* White typography */
        .landing-page h1,
        .landing-page h2,
        .landing-page h3,
        .landing-page h4 {
          color: #fff !important;
        }

        .landing-page p,
        .landing-page span,
        .landing-page li {
          color: rgba(255,255,255,.78);
        }

        /* Gold highlighted headline */
        .landing-page .gradient-text {
          background: none !important;
          color: var(--landing-gold) !important;
          -webkit-text-fill-color: var(--landing-gold) !important;
        }

        /* Gold symbols/icons */
        .landing-page svg {
          color: var(--landing-gold) !important;
          stroke: var(--landing-gold) !important;
        }

        .landing-page .section-tag {
          color: var(--landing-gold) !important;
          background: rgba(212,175,55,.08) !important;
          border: 1px solid rgba(212,175,55,.30) !important;
        }

        /* Gold primary action */
        .landing-page .btn-primary {
          background: var(--landing-gold) !important;
          color: #000 !important;
          border: 1px solid var(--landing-gold-light) !important;
          box-shadow: 0 8px 28px rgba(212,175,55,.18) !important;
        }

        .landing-page .btn-primary svg {
          color: #000 !important;
          stroke: #000 !important;
        }

        /* Black/transparent secondary action */
        .landing-page .btn-ghost {
          background: rgba(255,255,255,.025) !important;
          color: #fff !important;
          border: 1px solid rgba(212,175,55,.35) !important;
        }

        .landing-page .btn-ghost svg {
          color: var(--landing-gold) !important;
          stroke: var(--landing-gold) !important;
        }

        /* Stats strip */
        .landing-page .stat-number {
          color: var(--landing-gold) !important;
        }

        /* Cards */
        .landing-page .card,
        .landing-page .feature-card {
          background: rgba(255,255,255,.025) !important;
          border: 1px solid rgba(212,175,55,.16) !important;
          box-shadow: 0 12px 35px rgba(0,0,0,.35);
        }

        .landing-page .card:hover,
        .landing-page .feature-card:hover {
          border-color: rgba(212,175,55,.42) !important;
        }

        /* Gold feature/step number backgrounds */
        .landing-page .badge {
          background: rgba(212,175,55,.10) !important;
          color: var(--landing-gold) !important;
        }

        /* Team cards */
        .landing-page .team-card:hover {
          transform: translateY(-8px);
          border-color: rgba(212,175,55,.55) !important;
          box-shadow: 0 24px 55px rgba(0,0,0,.50) !important;
        }

        /* Footer */
        .landing-page footer {
          border-top-color: rgba(212,175,55,.18) !important;
        }

        /* Footer logo */
        .landing-page footer a:hover {
          color: var(--landing-gold) !important;
        }

        /* CTA banner links */
        .landing-page a {
          transition: border-color .2s ease, color .2s ease, background .2s ease;
        }

        /* If the navbar is outside Landing.tsx, style it ONLY while
           this landing page exists. This does not affect dashboard pages. */
        body:has(.landing-page) nav {
          background: rgba(0,0,0,.88) !important;
          border-bottom: 1px solid rgba(212,175,55,.18) !important;
        }

        body:has(.landing-page) nav svg {
          color: var(--landing-gold) !important;
          stroke: var(--landing-gold) !important;
        }

        /* Responsive particle performance */
        @media (prefers-reduced-motion: reduce) {
          .landing-page::before,
          .landing-page::after {
            animation: none;
          }
        }
      `}</style>

      {/* ── Hero ── */}
      <section className="hero-gradient" style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', position: 'relative' }}>
        {/* Decorative orbs */}
        <div style={{
          position: 'absolute', width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(162,123,44,0.06) 0%, transparent 70%)',
          top: -100, left: -100, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(36,52,71,0.05) 0%, transparent 70%)',
          bottom: 0, right: 100, pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px', width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}
            className="hero-grid">
            {/* Left */}
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
                <span className="section-tag">
                  <Zap size={12} /> Agentic AI Platform
                </span>
              </div>

              <h1 style={{
                fontSize: 'clamp(2.4rem, 4.5vw, 3.6rem)', fontWeight: 900,
                lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: 20, color: 'var(--text)',
              }}>
                AI Legal Guidance<br /><span className="gradient-text">for India</span><br />with Nyaya AI.
              </h1>

              <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 32, maxWidth: 480 }}>
                Nyaya AI provides AI-powered legal guidance in India, helps you understand your rights, analyze legal documents, find relevant legal information, and connect with advocates — all in your language.
              </p>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
                <button
                  type="button"
                  onClick={() => handleProtectedNavigation('/dashboard/ai-assistant')}
                  className="btn-primary"
                  style={{ padding: '14px 28px', borderRadius: 12, fontWeight: 700, fontSize: '1rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <MessageSquare size={18} />
                  Get Legal Help
                </button>
                <button
                  type="button"
                  onClick={() => handleProtectedNavigation('/dashboard/advocates')}
                  className="btn-ghost"
                  style={{ padding: '14px 28px', borderRadius: 12, fontWeight: 600, fontSize: '1rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <Users size={18} />
                  Find an Advocate
                  <ArrowRight size={16} />
                </button>
              </div>

              {/* Trust indicators */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                {['Bar Council Verified', 'ISO 27001 Certified', 'MeitY Recognized'].map(t => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CheckCircle size={14} style={{ color: '#D4AF37', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right – Illustration */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <HeroVideo />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }} className="stats-grid">
            {stats.map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div className="stat-number">{s.value}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: 4 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span className="section-tag" style={{ marginBottom: 16, display: 'inline-flex' }}>
              <Clock size={12} /> How It Works
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', marginTop: 12 }}>
              Justice in four steps
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: 12, maxWidth: 500, margin: '12px auto 0' }}>
              From describing your problem to hiring an advocate — NyayaAI guides you every step of the way.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }} className="steps-grid">
            {steps.map((s, i) => (
              <div key={s.step} className="card" style={{ padding: 28, position: 'relative' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, marginBottom: 16,
                  background: `color-mix(in srgb, ${s.color} 12%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900, color: s.color }}>
                    {s.step}
                  </span>
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {s.desc}
                </p>
                {i < steps.length - 1 && (
                  <ChevronRight size={18} style={{
                    position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-subtle)', zIndex: 1,
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="mesh-gradient" style={{ padding: '100px 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span className="section-tag" style={{ marginBottom: 16, display: 'inline-flex' }}>
              <Zap size={12} /> Platform Features
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', marginTop: 12 }}>
              Everything you need for legal clarity
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="features-grid">
            {features.map(f => (
              <div key={f.title} className="feature-card" style={{ padding: 28 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, background: f.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                }}>
                  <f.icon size={22} style={{ color: f.color }} strokeWidth={2} />
                </div>
                <h3 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8, fontSize: '1rem' }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Team ── */}
      <section id="about" style={{
        padding: '100px 24px',
        borderTop: '1px solid var(--border)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          width: 520,
          height: 520,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 70%)',
          top: -180,
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Section heading */}
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span className="section-tag" style={{
              marginBottom: 16,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
            }}>
              <Users size={14} /> Our Team
            </span>

            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3.2rem)',
              fontWeight: 850,
              lineHeight: 1.15,
              letterSpacing: '-0.04em',
              color: 'var(--text)',
              marginTop: 12,
              marginBottom: 16,
            }}>
              Meet the People Behind <span className="gradient-text">Nyaya AI</span>
            </h2>

            <p style={{
              maxWidth: 760,
              margin: '0 auto',
              color: 'var(--text-muted)',
              fontSize: '1rem',
              lineHeight: 1.7,
            }}>
              A passionate team combining leadership, software engineering, and
              database expertise to build accessible and technology-driven legal
              guidance for India.
            </p>
          </div>

          {/* Team cards */}
          <div
            className="team-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 28,
            }}
          >
            {/* Gaurav Singh — Team Lead */}
            <div className="team-card" style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(212,175,55,0.22)',
              borderRadius: 20,
              padding: 24,
              textAlign: 'center',
              boxShadow: '0 18px 45px rgba(0,0,0,0.35)',
              transition: 'transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
            }}>
              <div style={{
                width: 190,
                height: 190,
                margin: '0 auto 22px',
                borderRadius: '50%',
                padding: 4,
                background: 'linear-gradient(135deg, #D4AF37, #F5D76E, #A27B2C)',
                boxShadow: '0 0 35px rgba(212,175,55,0.18)',
              }}>
                <img
                  src="/team/gaurav.jpg"
                  alt="Gaurav Singh - Team Lead at Nyaya AI"
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    objectPosition: 'center top',
                    display: 'block',
                  }}
                />
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 16px',
                borderRadius: 999,
                border: '1px solid rgba(212,175,55,0.55)',
                background: 'rgba(212,175,55,0.06)',
                color: '#D4AF37',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: 16,
              }}>
                <Crown size={15} /> Team Lead
              </div>

              <h3 style={{
                color: 'var(--text)',
                fontSize: '1.55rem',
                fontWeight: 800,
                margin: '0 0 12px',
                letterSpacing: '-0.02em',
              }}>
                Gaurav Singh
              </h3>

              <p style={{
                color: 'var(--text-muted)',
                fontSize: '0.94rem',
                lineHeight: 1.7,
                margin: '0 0 24px',
                minHeight: 130,
              }}>
                Hi, I'm Gaurav Singh, the Team Lead of Nyaya AI. I coordinate the
                team, guide project direction, and help turn our ideas into practical
                solutions that make legal technology more accessible.
              </p>

              <div style={{
                height: 1,
                background: 'rgba(212,175,55,0.18)',
                marginBottom: 22,
              }} />

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                textAlign: 'left',
              }}>
                <div>
                  <Lightbulb size={22} style={{ color: '#D4AF37', marginBottom: 8 }} />
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', lineHeight: 1.4 }}>
                    Team<br />Management
                  </div>
                </div>
                <div>
                  <Users size={22} style={{ color: '#D4AF37', marginBottom: 8 }} />
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', lineHeight: 1.4 }}>
                    Project<br />Coordination
                  </div>
                </div>
                <div>
                  <Target size={22} style={{ color: '#D4AF37', marginBottom: 8 }} />
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', lineHeight: 1.4 }}>
                    Strategy &amp;<br />Planning
                  </div>
                </div>
              </div>
            </div>

            {/* Tarun Pokhariya — Backend & Frontend Developer */}
            <div className="team-card" style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(212,175,55,0.22)',
              borderRadius: 20,
              padding: 24,
              textAlign: 'center',
              boxShadow: '0 18px 45px rgba(0,0,0,0.35)',
              transition: 'transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
            }}>
              <div style={{
                width: 190,
                height: 190,
                margin: '0 auto 22px',
                borderRadius: '50%',
                padding: 4,
                background: 'linear-gradient(135deg, #D4AF37, #F5D76E, #A27B2C)',
                boxShadow: '0 0 35px rgba(212,175,55,0.18)',
              }}>
                <img
                  src="/team/tarun.jpg"
                  alt="Tarun Pokhariya - Backend and Frontend Developer at Nyaya AI"
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    objectPosition: 'center top',
                    display: 'block',
                  }}
                />
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 16px',
                borderRadius: 999,
                border: '1px solid rgba(212,175,55,0.55)',
                background: 'rgba(212,175,55,0.06)',
                color: '#D4AF37',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: 16,
              }}>
                <Code2 size={15} /> Backend &amp; Frontend Developer
              </div>

              <h3 style={{
                color: 'var(--text)',
                fontSize: '1.55rem',
                fontWeight: 800,
                margin: '0 0 12px',
                letterSpacing: '-0.02em',
              }}>
                Tarun Pokhariya
              </h3>

              <p style={{
                color: 'var(--text-muted)',
                fontSize: '0.94rem',
                lineHeight: 1.7,
                margin: '0 0 24px',
                minHeight: 130,
              }}>
                Hi, I'm Tarun Pokhariya, the Backend and Frontend Developer of
                Nyaya AI. I build and maintain the platform, develop user-facing
                features, and connect the frontend with reliable backend services.
              </p>

              <div style={{
                height: 1,
                background: 'rgba(212,175,55,0.18)',
                marginBottom: 22,
              }} />

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                textAlign: 'left',
              }}>
                <div>
                  <Code2 size={22} style={{ color: '#D4AF37', marginBottom: 8 }} />
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', lineHeight: 1.4 }}>
                    Full-Stack<br />Development
                  </div>
                </div>
                <div>
                  <Target size={22} style={{ color: '#D4AF37', marginBottom: 8 }} />
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', lineHeight: 1.4 }}>
                    Feature<br />Implementation
                  </div>
                </div>
                <div>
                  <ShieldCheck size={22} style={{ color: '#D4AF37', marginBottom: 8 }} />
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', lineHeight: 1.4 }}>
                    System<br />Integration
                  </div>
                </div>
              </div>
            </div>

            {/* Pragitya Ghosh — Database Manager */}
            <div className="team-card" style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(212,175,55,0.22)',
              borderRadius: 20,
              padding: 24,
              textAlign: 'center',
              boxShadow: '0 18px 45px rgba(0,0,0,0.35)',
              transition: 'transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
            }}>
              <div style={{
                width: 190,
                height: 190,
                margin: '0 auto 22px',
                borderRadius: '50%',
                padding: 4,
                background: 'linear-gradient(135deg, #D4AF37, #F5D76E, #A27B2C)',
                boxShadow: '0 0 35px rgba(212,175,55,0.18)',
              }}>
                <img
                  src="/team/pragitya.jpg"
                  alt="Pragitya Ghosh - Database Manager at Nyaya AI"
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    objectPosition: 'center top',
                    display: 'block',
                  }}
                />
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 16px',
                borderRadius: 999,
                border: '1px solid rgba(212,175,55,0.55)',
                background: 'rgba(212,175,55,0.06)',
                color: '#D4AF37',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: 16,
              }}>
                <Database size={15} /> Database Manager
              </div>

              <h3 style={{
                color: 'var(--text)',
                fontSize: '1.55rem',
                fontWeight: 800,
                margin: '0 0 12px',
                letterSpacing: '-0.02em',
              }}>
                Pragitya Ghosh
              </h3>

              <p style={{
                color: 'var(--text-muted)',
                fontSize: '0.94rem',
                lineHeight: 1.7,
                margin: '0 0 24px',
                minHeight: 130,
              }}>
                Hi, I'm Pragitya Ghosh, the Database Manager of Nyaya AI. I design
                and manage our data systems, focus on data integrity and security,
                and help ensure that our platform's information remains organized
                and reliable.
              </p>

              <div style={{
                height: 1,
                background: 'rgba(212,175,55,0.18)',
                marginBottom: 22,
              }} />

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                textAlign: 'left',
              }}>
                <div>
                  <Database size={22} style={{ color: '#D4AF37', marginBottom: 8 }} />
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', lineHeight: 1.4 }}>
                    Database<br />Design
                  </div>
                </div>
                <div>
                  <ShieldCheck size={22} style={{ color: '#D4AF37', marginBottom: 8 }} />
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', lineHeight: 1.4 }}>
                    Data Security<br />&amp; Integrity
                  </div>
                </div>
                <div>
                  <BarChart3 size={22} style={{ color: '#D4AF37', marginBottom: 8 }} />
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', lineHeight: 1.4 }}>
                    Performance<br />Optimization
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What You Can Do ── */}
      <section id="pricing" className="hero-gradient" style={{ padding: '100px 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span className="section-tag" style={{ marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Scale size={12} /> Legal Help Starts Here
            </span>

            <h2 style={{
              fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
              fontWeight: 800,
              color: 'var(--text)',
              letterSpacing: '-0.03em',
              marginTop: 12,
              marginBottom: 14,
            }}>
              Legal help that starts with you.
            </h2>

            <p style={{
              color: 'var(--text-muted)',
              fontSize: '1rem',
              lineHeight: 1.7,
              maxWidth: 650,
              margin: '0 auto',
            }}>
              Get AI-powered legal guidance, understand your rights, analyze documents,
              and connect with advocates — all from one platform.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 24,
            }}
            className="pricing-grid"
          >
            {[
              {
                icon: MessageSquare,
                title: 'AI Legal Guidance',
                desc: 'Describe your legal issue in simple language and get structured guidance based on your situation.',
                button: 'Get Legal Help',
                action: () => requireLogin('/dashboard/ai-assistant'),
              },
              {
                icon: FileSearch,
                title: 'Document Analysis',
                desc: 'Upload legal documents and use AI to identify important information, clauses, risks, and key points.',
                button: 'Analyze a Document',
                action: () => requireLogin('/dashboard/documents'),
              },
              {
                icon: Users,
                title: 'Find an Advocate',
                desc: 'Discover advocates based on your legal needs and connect with the right professional for your matter.',
                button: 'Find an Advocate',
                action: () => requireLogin('/dashboard/advocates'),
              },
            ].map(item => {
              const Icon = item.icon

              return (
                <div
                  key={item.title}
                  className="card"
                  style={{
                    padding: 30,
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 320,
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 15,
                      background: 'rgba(212,175,55,0.09)',
                      border: '1px solid rgba(212,175,55,0.20)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 20,
                    }}
                  >
                    <Icon size={23} />
                  </div>

                  <h3
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 750,
                      color: 'var(--text)',
                      marginBottom: 10,
                    }}
                  >
                    {item.title}
                  </h3>

                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.7,
                      margin: '0 0 24px',
                      flex: 1,
                    }}
                  >
                    {item.desc}
                  </p>

                  <button
                    type="button"
                    onClick={item.action}
                    className="btn-ghost"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: 'pointer',
                    }}
                  >
                    {item.button}
                    <ArrowRight size={16} />
                  </button>
                </div>
              )
            })}
          </div>

          <div
            style={{
              marginTop: 28,
              padding: '18px 22px',
              borderRadius: 14,
              border: '1px solid rgba(212,175,55,0.18)',
              background: 'rgba(212,175,55,0.035)',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                margin: 0,
                color: 'rgba(255,255,255,0.72)',
                fontSize: '0.86rem',
                lineHeight: 1.6,
              }}
            >
              Start exploring Nyaya AI today — no subscription purchase is required.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ padding: '80px 24px', background: '#000000' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <Shield size={40} style={{ color: 'rgba(255,255,255,0.6)', margin: '0 auto 20px' }} />
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, color: 'white', letterSpacing: '-0.03em', marginBottom: 16 }}>
            Your rights. Our mission.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1rem', marginBottom: 32, lineHeight: 1.6 }}>
            Every Indian deserves access to quality legal help. NyayaAI makes that possible — free, fast, and in your language.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" style={{
              padding: '14px 32px', borderRadius: 12, fontWeight: 700, fontSize: '1rem',
              background: '#F5F1E8', color: '#243447', textDecoration: 'none',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)', display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              Get Started Free <ArrowRight size={18} />
            </Link>
            <button
              type="button"
              onClick={() => handleProtectedNavigation('/dashboard/advocates')}
              style={{
                padding: '14px 32px', borderRadius: 12, fontWeight: 600, fontSize: '1rem',
                background: 'rgba(255,255,255,0.15)', color: 'white',
                border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer',
              }}>
              Find an Advocate
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="contact" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', padding: '64px 24px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }} className="footer-grid">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{
                  fontWeight: 900,
                  fontSize: '1.25rem',
                  letterSpacing: '4px',
                  color: '#D4AF37',
                }}>
                  ALPINE
                </span>
              </div>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 280 }}>
                AI-powered legal assistance platform, making legal guidance simple and accessible for everyone.
              </p>
              {/* Team social profiles */}
              <div
                ref={socialRef}
                style={{
                  display: 'flex',
                  gap: 8,
                  marginTop: 16,
                  flexWrap: 'wrap',
                }}
              >

                {/* LinkedIn */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSocial(
                        openSocial === 'linkedin' ? null : 'linkedin'
                      )
                    }
                    style={{
                      padding: '7px 12px',
                      borderRadius: 6,
                      background: 'var(--bg-card)',
                      border: '1px solid rgba(212,175,55,0.35)',
                      fontSize: '0.75rem',
                      color: '#D4AF37',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    LinkedIn
                  </button>

                  {openSocial === 'linkedin' && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 8px)',
                        left: 0,
                        minWidth: 190,
                        padding: 8,
                        borderRadius: 8,
                        background: '#080808',
                        border: '1px solid rgba(212,175,55,0.35)',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.55)',
                        zIndex: 100,
                      }}
                    >
                      <a
                        href="https://www.linkedin.com/in/tarun-pokhariya-9971433a6"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={teamProfileLinkStyle}
                      >
                        Tarun Pokhariya
                      </a>

                      <a
                        href="https://www.linkedin.com/in/pragitya-ghosh-33ba5a381/"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={teamProfileLinkStyle}
                      >
                        Pragitya Ghosh
                      </a>

                      <a
                        href="https://www.linkedin.com/in/gaurav-singh-aa6a19376"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={teamProfileLinkStyle}
                      >
                        Gaurav Singh
                      </a>
                    </div>
                  )}
                </div>

                {/* GitHub */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSocial(
                        openSocial === 'github' ? null : 'github'
                      )
                    }
                    style={{
                      padding: '7px 12px',
                      borderRadius: 6,
                      background: 'var(--bg-card)',
                      border: '1px solid rgba(212,175,55,0.35)',
                      fontSize: '0.75rem',
                      color: '#D4AF37',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    GitHub
                  </button>

                  {openSocial === 'github' && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 8px)',
                        left: 0,
                        minWidth: 190,
                        padding: 8,
                        borderRadius: 8,
                        background: '#080808',
                        border: '1px solid rgba(212,175,55,0.35)',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.55)',
                        zIndex: 100,
                      }}
                    >
                      <a
                        href="https://github.com/tarunpokhariya2007-svg"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={teamProfileLinkStyle}
                      >
                        Tarun Pokhariya
                      </a>

                      <a
                        href="https://github.com/gaurav8469"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={teamProfileLinkStyle}
                      >
                        Gaurav Singh
                      </a>

                      <a
                        href="https://github.com/Pragitya02"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={teamProfileLinkStyle}
                      >
                        Pragitya Ghosh
                      </a>
                    </div>
                  )}
                </div>

              </div>
            </div>
            {[
              { heading: 'Platform', links: ['AI Assistant', 'Find Advocates', 'Document Analyzer', 'Jurisdiction Finder', 'Legal Help'] },
              { heading: 'For Advocates', links: ['Join as Advocate', 'AI Research Tool', 'Client Management', 'Earnings Dashboard', 'Verification'] },
              { heading: 'Company', links: ['About Us', 'Careers', 'Blog', 'Press', 'Contact', 'Privacy Policy'] },
            ].map(col => (
              <div key={col.heading}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', marginBottom: 16, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {col.heading}
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {col.links.map(l => (
                    <li key={l}>
                      <a href="#" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textDecoration: 'none' }}>{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
              © 2026 NyayaAI Technologies Pvt. Ltd. · Not a substitute for professional legal advice. · CIN: U74140DL2024PTC000001
            </p>
            <div style={{ display: 'flex', gap: 16 }}>
              {['Terms', 'Privacy', 'Disclaimer', 'Grievance'].map(l => (
                <a key={l} href="#" style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', textDecoration: 'none' }}>{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        .nyaya-disclaimer {
          position: fixed;
          right: 20px;
          bottom: 20px;
          width: min(360px, calc(100vw - 32px));
          max-height: 190px;
          overflow-y: auto;
          padding: 14px 42px 14px 16px;
          background: rgba(8, 8, 8, 0.96);
          border: 1px solid rgba(212, 175, 55, 0.65);
          border-radius: 12px;
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 9999;
          scrollbar-width: thin;
        }

        .nyaya-disclaimer::-webkit-scrollbar {
          width: 6px;
        }

        .nyaya-disclaimer::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.65);
          border-radius: 10px;
        }

        .nyaya-disclaimer-title {
          margin: 0 0 7px;
          color: #D4AF37;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .nyaya-disclaimer-text {
          margin: 0;
          color: rgba(255, 255, 255, 0.78);
          font-size: 0.72rem;
          line-height: 1.55;
        }

        .nyaya-disclaimer-close {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          border: 1px solid rgba(212, 175, 55, 0.35);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.04);
          color: #D4AF37;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          padding: 0;
        }

        .nyaya-disclaimer-close:hover {
          background: rgba(212, 175, 55, 0.12);
        }

        @media (max-width: 600px) {
          .nyaya-disclaimer {
            right: 12px;
            bottom: 12px;
            width: calc(100vw - 24px);
            max-height: 170px;
            padding: 13px 40px 13px 14px;
          }

          .nyaya-disclaimer-text {
            font-size: 0.7rem;
          }
        }
      `}</style>

      {showDisclaimer && (
        <div
          className="nyaya-disclaimer"
          role="dialog"
          aria-label="Legal disclaimer"
        >
          <button
            type="button"
            className="nyaya-disclaimer-close"
            onClick={() => setShowDisclaimer(false)}
            aria-label="Close disclaimer"
            title="Close"
          >
            ×
          </button>

          <p className="nyaya-disclaimer-title">Disclaimer</p>
          <p className="nyaya-disclaimer-text">
            Nyaya AI provides general legal information and AI-assisted
            guidance. It is not a substitute for advice from a qualified
            advocate. Laws and procedures may change, so users should verify
            important matters with a legal professional.
          </p>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .steps-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .features-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .team-grid { grid-template-columns: 1fr 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .team-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .team-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function HeroVideo() {
  const videoARef = useRef<HTMLVideoElement>(null)
  const videoBRef = useRef<HTMLVideoElement>(null)
  const [activeVideo, setActiveVideo] = useState<'A' | 'B'>('A')

  useEffect(() => {
    const videoA = videoARef.current
    const videoB = videoBRef.current

    if (!videoA || !videoB) return

    let switching = false

    const handleTimeUpdate = () => {
      const currentVideo = activeVideo === 'A' ? videoA : videoB
      const nextVideo = activeVideo === 'A' ? videoB : videoA

      if (
        !switching &&
        Number.isFinite(currentVideo.duration) &&
        currentVideo.duration > 0 &&
        currentVideo.currentTime >= currentVideo.duration - 0.45
      ) {
        switching = true

        nextVideo.currentTime = 0
        nextVideo.play().catch(() => {})

        setActiveVideo(activeVideo === 'A' ? 'B' : 'A')

        window.setTimeout(() => {
          currentVideo.pause()
          currentVideo.currentTime = 0
          switching = false
        }, 450)
      }
    }

    const activeVideoElement = activeVideo === 'A' ? videoA : videoB
    activeVideoElement.addEventListener('timeupdate', handleTimeUpdate)

    return () => {
      activeVideoElement.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [activeVideo])

  return (
    <div
      className="legal-scale-video"
      style={{
        position: 'relative',
        width: 560,
        height: 460,
        maxWidth: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <video
        ref={videoARef}
        src="/hero-scale.mp4"
        muted
        autoPlay
        playsInline
        preload="auto"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          opacity: activeVideo === 'A' ? 1 : 0,
          transition: 'opacity 450ms ease-in-out',
          pointerEvents: 'none',
        }}
      />

      <video
        ref={videoBRef}
        src="/hero-scale.mp4"
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          opacity: activeVideo === 'B' ? 1 : 0,
          transition: 'opacity 450ms ease-in-out',
          pointerEvents: 'none',
        }}
      />

      <style>{`
        .legal-scale-video {
          overflow: visible;
        }

        @media (max-width: 700px) {
          .legal-scale-video {
            width: 100% !important;
            height: 420px !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .legal-scale-video video {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  )
}
