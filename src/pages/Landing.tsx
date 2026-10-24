import { Link, useNavigate } from 'react-router'

import { useEffect, useRef, useState } from 'react'

import { motion } from 'motion/react'

import { isLoggedIn } from '../lib/auth'

import {

  Scale, ArrowRight, CheckCircle, Shield, Globe, Lock,

  MessageSquare, Users, FileSearch, MapPin, Mic, ChevronRight,

  Award, Clock, TrendingUp, BookOpen, Crown, Code2, Database,

  Lightbulb, Target, ShieldCheck, BarChart3,Bot,Languages

} from 'lucide-react'

const stats = [
  { value: 'Multi-Agent', label: 'Legal AI Engine', icon: Bot },
  { value: '24/7', label: 'AI Assistance', icon: Clock },
  { value: 'Multiple', label: 'Indian Languages', icon: Languages },
  { value: 'Private', label: 'Your Data, Your Control', icon: ShieldCheck },
];

const steps = [

  {

    step: '01', title: 'Describe Your Issue',

    desc: 'Simply type or speak your legal problem in any language — no legal jargon needed.',

    color: '#C27635',

  },

  {

    step: '02', title: 'AI Analyzes Your Case',

    desc: 'Our legal AI retrieves relevant provisions from Indian legal sources and analyzes them against your case.',

    color: '#8F5428',

  },

  {

    step: '03', title: 'Receive Legal Guidance',

    desc: 'Get a structured report with relevant laws, recommended actions, required documents, and timelines.',

    color: '#C27635',

  },

  {

    step: '04', title: 'Hire an Advocate',

    desc: 'Browse verified advocates matched to your case type, read reviews, and book consultations.',

    color: '#8F5428',

  },

]

const features = [

  {

    icon: MessageSquare, title: 'AI Legal Assistant',

    desc: 'Understand Indian law with AI-powered guidance, legal research, and contextual answers.',

    color: '#C27635', bg: 'rgba(194,118,53,0.08)',

  },

  {

    icon: Users, title: 'Advocate Marketplace',

    desc: 'Discover advocates by practice area, location, court, language, and consultation preferences.',

    color: '#8F5428', bg: 'rgba(143,84,40,0.08)',

  },

  {

    icon: FileSearch, title: 'AI Document Analyzer',

    desc: 'Upload FIRs, contracts, court orders, and property papers. AI extracts key clauses and flags risks instantly.',

    color: '#C27635', bg: 'rgba(194,118,53,0.08)',

  },

  {

    icon: MapPin, title: 'Jurisdiction Finder',

    desc: 'Automatically identify the correct court, jurisdiction, and authority for your case type and location.',

    color: '#8F5428', bg: 'rgba(143,84,40,0.08)',

  },

  {

    icon: Lock, title: 'Secure Chat',

    desc: 'Your conversations stay private and are only shared with advocates you choose.',

    color: '#8B4A42', bg: 'rgba(139,74,66,0.07)',

  },

  {

    icon: Globe, title: 'Multilingual Support',

    desc: 'Get legal information in multiple Indian languages.',

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

const teamMembers = [
  {
    name: 'Gaurav Singh',
    role: 'Team Lead',
    image: '/team/gaurav.jpg',
    roleIcon: Crown,
    description:
      "Hi, I'm Gaurav Singh, the Team Lead of Nyaya AI. I coordinate the team, guide project direction, and help turn our ideas into practical solutions that make legal technology more accessible.",
    skills: [
      { icon: Lightbulb, lines: <>Team<br />Management</> },
      { icon: Users, lines: <>Project<br />Coordination</> },
      { icon: Target, lines: <>Strategy &amp;<br />Planning</> },
    ],
  },
  {
    name: 'Tarun Pokhariya',
    role: 'Backend & Frontend Developer',
    image: '/team/tarun.jpg',
    roleIcon: Code2,
    description:
      "Hi, I'm Tarun Pokhariya, the Backend and Frontend Developer of Nyaya AI. I build and maintain the platform, develop user-facing features, and connect the frontend with reliable backend services.",
    skills: [
      { icon: Code2, lines: <>Full-Stack<br />Development</> },
      { icon: Target, lines: <>Feature<br />Implementation</> },
      { icon: ShieldCheck, lines: <>System<br />Integration</> },
    ],
  },
  {
    name: 'Pragitya Ghosh',
    role: 'Database Manager',
    image: '/team/pragitya.jpg',
    roleIcon: Database,
    description:
      "Hi, I'm Pragitya Ghosh, the Database Manager of Nyaya AI. I design and manage our data systems, focus on data integrity and security, and help ensure that our platform's information remains organized and reliable.",
    skills: [
      { icon: Database, lines: <>Database<br />Design</> },
      { icon: ShieldCheck, lines: <>Data Security<br />&amp; Integrity</> },
      { icon: BarChart3, lines: <>Performance<br />Optimization</> },
    ],
  },
]

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

      {/* Fixed cinematic background video: the page content scrolls over it. */}
      <div className="landing-video-background" aria-hidden="true">
        <video
          src="/hero-scale.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
        <div className="landing-video-overlay" />
      </div>

      <style>{`

        /* =====================================================

           NYAYA AI LANDING PAGE ONLY

           BLACK BACKGROUND + MOVING WHITE SPARKLES + GOLD UI

           ===================================================== */

        .landing-page {

          --landing-gold: #C27635;

          --landing-gold-light: #E3A15F;

          --landing-gold-dark: #8F5428;

          background: #000 !important;

          color: #fff !important;

          min-height: 100vh;

          position: relative;

          overflow-x: hidden;

          isolation: isolate;

        }



        /* The video is fixed to the viewport, so it stays in one place while
           every landing-page section scrolls above it. */
        .landing-page .landing-video-background {
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 0 !important;
          pointer-events: none !important;
          overflow: hidden !important;
          background: #000;
        }

        .landing-page .landing-video-background video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
          opacity: 0.48;
          filter: saturate(0.95) contrast(1.08);
        }

        .landing-page .landing-video-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.38) 45%, rgba(0,0,0,0.68) 100%),
            radial-gradient(circle at 50% 35%, rgba(194,118,53,0.08), transparent 55%);
        }

        
.landing-page > *:not(.landing-video-background):not(.nyaya-disclaimer) {
  position: relative;
  z-index: 1;
}


        /* Keep the cinematic video permanently behind the page content. */
        .landing-page > .landing-video-background {
          position: fixed !important;
          inset: 0 !important;
          z-index: 0 !important;
        }

        /* Remove old hero/mesh blue backgrounds */

        .landing-page .hero-gradient,

        .landing-page .mesh-gradient {

          background: transparent !important;

        }

        /* All landing sections stay black */

        .landing-page section,

        .landing-page footer {

          background-color: transparent !important;

        }

        /* Keep content readable while allowing the fixed video to remain visible. */
        .landing-page section {
          position: relative;
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

          background: rgba(194,118,53,.08) !important;

          border: 1px solid rgba(194,118,53,.30) !important;

        }

        /* Landing eyebrow labels: plain gold text (scoped; Team tag untouched) */

        .landing-page .section-tag.eyebrow-plain {

          background: none !important;

          border: 0 !important;

          border-radius: 0 !important;

          padding: 0 !important;

        }

        /* Gold primary action */

        .landing-page .btn-primary {

          background: var(--landing-gold) !important;

          color: #000 !important;

          border: 1px solid var(--landing-gold-light) !important;

          box-shadow: 0 8px 28px rgba(194,118,53,.18) !important;

        }

        .landing-page .btn-primary svg {

          color: #000 !important;

          stroke: #000 !important;

        }

        /* Black/transparent secondary action */

        .landing-page .btn-ghost {

          background: rgba(255,255,255,.025) !important;

          color: #fff !important;

          border: 1px solid rgba(194,118,53,.35) !important;

        }

        .landing-page .btn-ghost svg {

          color: var(--landing-gold) !important;

          stroke: var(--landing-gold) !important;

        }

        /* Stats strip */

        .landing-page .stat-number {

          color: var(--landing-gold) !important;
          background: none !important;
          -webkit-text-fill-color: var(--landing-gold) !important;
          font-size: clamp(1.4rem, 5vw, 2.5rem);
          white-space: nowrap;

        }

        /* Cards */

        .landing-page .card,

        .landing-page .feature-card {

          background: rgba(255,255,255,.025) !important;

          border: 1px solid rgba(194,118,53,.16) !important;

          box-shadow: 0 12px 35px rgba(0,0,0,.35);

        }

        .landing-page .card:hover,

        .landing-page .feature-card:hover {

          border-color: rgba(194,118,53,.42) !important;

        }

        /* Gold feature/step number backgrounds */

        .landing-page .badge {

          background: rgba(194,118,53,.10) !important;

          color: var(--landing-gold) !important;

        }

        /* Team cards */

        .landing-page .team-card:hover {

          transform: translateY(-8px);

          border-color: rgba(194,118,53,.55) !important;

          box-shadow: 0 24px 55px rgba(0,0,0,.50) !important;

        }

        /* Static team-card row — no infinite loop */
        .landing-page .team-marquee {
          width: 100%;
          overflow: hidden;
          position: relative;
          mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent);
          cursor: default;
          user-select: none;
          -webkit-user-select: none;
        }

        .landing-page .team-track {
          display: flex;
          width: max-content;
          gap: 28px;
          animation: none !important;
          will-change: auto;
        }

        .landing-page .team-set {
          display: flex;
          gap: 28px;
          flex: 0 0 auto;
        }

        @media (max-width: 900px) {
          .landing-page .team-card {
            flex-basis: min(380px, 82vw) !important;
          }
        }

        @media (max-width: 700px) {

          .landing-page .landing-video-background video {
            object-position: center center;
            opacity: 0.30;
          }

        }

        @media (prefers-reduced-motion: reduce) {

          .landing-page .landing-video-background video {
            display: none;
          }

        }

        /* Footer */

        .landing-page footer {

          border-top-color: rgba(194,118,53,.18) !important;

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

          border-bottom: 1px solid rgba(194,118,53,.18) !important;

        }

        body:has(.landing-page) nav svg {

          color: var(--landing-gold) !important;

          stroke: var(--landing-gold) !important;

        }



        /* =====================================================
           DESKTOP TYPOGRAPHY (>=1024px) - font-size / line-height only.
           !important is required because the page uses inline styles.
           ===================================================== */
        @media (min-width: 1024px) {
          .landing-page section h1 { font-size: 60px !important; line-height: 1.1 !important; }
          .landing-page section h2 { font-size: 40px !important; line-height: 1.2 !important; }
          .landing-page section h3 { font-size: 20px !important; line-height: 1.3 !important; }

          /* Hero subtitle */
          .landing-page section h1 + p { font-size: 18px !important; line-height: 1.65 !important; }
          /* Section subtitles and card descriptions */
          .landing-page section h2 + p,
          .landing-page section h3 + p { font-size: 16px !important; line-height: 1.65 !important; }

          /* Buttons (hero, cards, CTA banner) */
          .landing-page .btn-primary,
          .landing-page .btn-ghost,
          .landing-page section [style*="justify-content: center"][style*="flex-wrap: wrap"] > :is(a, button) { font-size: 15px !important; }

          /* Trust badges */
          .landing-page section h1 ~ div > div > span { font-size: 13px !important; }

          /* Statistics numbers */
          .landing-page .stat-number { font-size: clamp(26px, 2.4vw, 32px) !important; }

          /* Team role badge and skill labels */
          .landing-page .team-card div:has(+ h3) { font-size: 13px !important; }
          .landing-page .team-card svg + div { font-size: 13px !important; }

          /* Footer headings, copyright and legal links */
          .landing-page footer h4 { font-size: 14px !important; }
          .landing-page footer > div > div:last-child > p,
          .landing-page footer > div > div:last-child a { font-size: 13px !important; }

          /* Navbar links and buttons (only while the landing page is mounted) */
          body:has(.landing-page) nav .hidden.lg\\:flex > a,
          body:has(.landing-page) nav .hidden.lg\\:flex > [data-contact-control] > button,
          body:has(.landing-page) nav a.hidden.sm\\:inline-flex { font-size: 15px !important; }
        }

      `}</style>

      {/* ── Hero ── */}

      <section className="hero-gradient" style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', position: 'relative' }}>

        {/* Decorative orbs */}

        <div style={{

          position: 'absolute', width: 600, height: 600, borderRadius: '50%',

          background: 'radial-gradient(circle, rgba(143,84,40,0.06) 0%, transparent 70%)',

          top: -100, left: -100, pointerEvents: 'none',

        }} />

        <div style={{

          position: 'absolute', width: 400, height: 400, borderRadius: '50%',

          background: 'radial-gradient(circle, rgba(36,52,71,0.05) 0%, transparent 70%)',

          bottom: 0, right: 100, pointerEvents: 'none',

        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px', width: '100%' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 60, alignItems: 'center' }}

            className="hero-grid">

            {/* Left */}

            <div style={{ maxWidth: 780, position: 'relative', zIndex: 2 }}>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>

                <span className="section-tag eyebrow-plain">

                  Agentic AI Platform

                </span>

              </div>

              <h1 style={{

                fontSize: 'clamp(2.4rem, 4.5vw, 3.6rem)', fontWeight: 600, fontFamily: 'var(--font-display)',

                lineHeight: 1.1, letterSpacing: '-0.01em', marginBottom: 20, color: 'var(--text)',

              }}>

                AI Legal Guidance for <span className="gradient-text">India</span><br />with Nyaya AI.

              </h1>

              <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 32, maxWidth: 480 }}>

                Nyaya AI provides AI-powered legal guidance in India, helps you understand your rights, analyze legal documents, find relevant legal information, and connect with advocates — all in your language.

              </p>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>

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

              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 480, marginBottom: 28 }}>
                Nyaya AI gives general legal information, not legal advice. For your specific case, consult a qualified advocate.
              </p>

              {/* Trust indicators */}

              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>

                {['Built on Indian legal sources', 'Private by design', 'Available in your language'].map(t => (

                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>

                    <CheckCircle size={14} style={{ color: '#C27635', flexShrink: 0 }} />

                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{t}</span>

                  </div>

                ))}

              </div>

            </div>

          </div>

        </div>

      </section>

{/* ── Stats ── */}

<section style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>

  <motion.div

    initial={{ opacity: 0, y: 24 }}

    whileInView={{ opacity: 1, y: 0 }}

    viewport={{ once: false, amount: 0.2 }}

    transition={{ duration: 0.8, ease: 'easeOut' }}

  >

    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }} className="stats-grid">

            {stats.map(s => (

              <div key={s.label} style={{ textAlign: 'center' }}>

                <div className="stat-number">{s.value}</div>

                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: 4 }}>

                  {s.label}

                </div>

              </div>

            ))}

          </div>

        </div>

         </motion.div>

      </section>

      {/* ── How It Works ── */}

      <motion.section
        id="how-it-works"
        style={{ padding: '100px 24px' }}
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.12 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >

        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

          <motion.div
            style={{ textAlign: 'center', marginBottom: 64 }}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >

            <span className="section-tag eyebrow-plain" style={{ marginBottom: 16, display: 'inline-flex' }}>

              How It Works

            </span>

            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--text)', letterSpacing: '-0.01em', marginTop: 12 }}>

              Justice in four steps

            </h2>

            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: 12, maxWidth: 500, margin: '12px auto 0' }}>

              From describing your problem to hiring an advocate — NyayaAI guides you every step of the way.

            </p>

          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }} className="steps-grid">

            {steps.map((s, i) => (

              <motion.div
                key={s.step}
                className="card"
                style={{ padding: 28, position: 'relative' }}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ duration: 0.55, delay: i * 0.12, ease: 'easeOut' }}
              >

                <div style={{

                  width: 48, height: 48, borderRadius: 14, marginBottom: 16,

                  background: `color-mix(in srgb, ${s.color} 12%, transparent)`,

                  display: 'flex', alignItems: 'center', justifyContent: 'center',

                }}>

                  <span style={{ fontSize: '1.2rem', fontWeight: 900, color: s.color }}>

                    {s.step}

                  </span>

                </div>

                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>

                  {s.title}

                </h3>

                <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>

                  {s.desc}

                </p>

                {i < steps.length - 1 && (

                  <ChevronRight size={18} style={{

                    position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)',

                    color: 'var(--text-subtle)', zIndex: 1,

                  }} />

                )}

              </motion.div>

            ))}

          </div>

        </div>

      </motion.section>

      {/* ── Features ── */}

      <motion.section
        id="features"
        className="mesh-gradient"
        style={{ padding: '100px 24px', borderTop: '1px solid var(--border)' }}
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >

        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

          <motion.div
            style={{ textAlign: 'center', marginBottom: 64 }}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >

            <span className="section-tag eyebrow-plain" style={{ marginBottom: 16, display: 'inline-flex' }}>

              Platform Features

            </span>

            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--text)', letterSpacing: '-0.01em', marginTop: 12 }}>

              Everything you need for legal clarity

            </h2>

          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="features-grid">

            {features.map((f, i) => (

              <motion.div
                key={f.title}
                className="feature-card"
                style={{ padding: 28 }}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.18 }}
                transition={{ duration: 0.55, delay: i * 0.09, ease: 'easeOut' }}
              >

                <div style={{

                  width: 48, height: 48, borderRadius: 14, background: f.bg,

                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,

                }}>

                  <f.icon size={22} style={{ color: f.color }} strokeWidth={2} />

                </div>

                <h3 style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 8, fontSize: '1rem' }}>

                  {f.title}

                </h3>

                <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>

                  {f.desc}

                </p>

              </motion.div>

            ))}

          </div>

        </div>

      </motion.section>

      {/* ── Our Team ── */}

      <motion.section id="about" style={{

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

          background: 'radial-gradient(circle, rgba(194,118,53,0.07) 0%, transparent 70%)',

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

          {/* Team cards — static horizontal row, no looping */}
          <motion.div
            className="team-marquee"
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.12 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            aria-label="Nyaya AI team members"
          >
            <div className="team-track">
              <div className="team-set">
                {teamMembers.map(member => {
                    const RoleIcon = member.roleIcon

                    return (
                      <div
                        className="team-card"
                        key={member.name}
                        style={{
                          background: 'rgba(255,255,255,0.025)',
                          border: '1px solid rgba(194,118,53,0.22)',
                          borderRadius: 20,
                          padding: 24,
                          textAlign: 'center',
                          boxShadow: '0 18px 45px rgba(0,0,0,0.35)',
                          transition: 'transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
                          flex: '0 0 380px',
                          boxSizing: 'border-box',
} as React.CSSProperties}
                      >
                        <div style={{
                          width: 190,
                          height: 190,
                          margin: '0 auto 22px',
                          borderRadius: '50%',
                          padding: 4,
                          background: 'linear-gradient(135deg, #C27635, #E3A15F, #8F5428)',
                          boxShadow: '0 0 35px rgba(194,118,53,0.18)',
                        }}>
                          <img
                            src={member.image}
                            alt={`${member.name} - ${member.role} at Nyaya AI`}
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
                          border: '1px solid rgba(194,118,53,0.55)',
                          background: 'rgba(194,118,53,0.06)',
                          color: '#C27635',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          marginBottom: 16,
                        }}>
                          <RoleIcon size={15} /> {member.role}
                        </div>

                        <h3 style={{
                          color: 'var(--text)',
                          fontSize: '1.55rem',
                          fontWeight: 800,
                          margin: '0 0 12px',
                          letterSpacing: '-0.02em',
                        }}>
                          {member.name}
                        </h3>

                        <p style={{
                          color: 'var(--text-muted)',
                          fontSize: '0.94rem',
                          lineHeight: 1.7,
                          margin: '0 0 24px',
                          minHeight: 130,
                        }}>
                          {member.description}
                        </p>

                        <div style={{
                          height: 1,
                          background: 'rgba(194,118,53,0.18)',
                          marginBottom: 22,
                        }} />

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: 10,
                          textAlign: 'left',
                        }}>
                          {member.skills.map((skill, skillIndex) => {
                            const SkillIcon = skill.icon

                            return (
                              <div key={`${member.name}-skill-${skillIndex}`}>
                                <SkillIcon size={22} style={{ color: '#C27635', marginBottom: 8 }} />
                                <div style={{
                                  color: 'var(--text-muted)',
                                  fontSize: '0.76rem',
                                  lineHeight: 1.4,
                                }}>
                                  {skill.lines}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </motion.div>

        </div>

      </motion.section>

      {/* ── CTA Banner ── */}

      <motion.section
        id="pricing"
        style={{ padding: '80px 24px', background: '#000000' }}
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.2 }}
        transition={{ duration: 0.75, ease: 'easeOut' }}
      >

        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>

          <Shield size={40} style={{ color: 'rgba(255,255,255,0.6)', margin: '0 auto 20px' }} />

          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 600, fontFamily: 'var(--font-display)', color: 'white', letterSpacing: '-0.01em', marginBottom: 16 }}>

            Your rights. Our mission.

          </h2>

          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1rem', marginBottom: 32, lineHeight: 1.6 }}>

            Every Indian deserves access to quality legal help. NyayaAI makes that possible — free, fast, and in your language.

          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>

            <Link to="/signup" className="btn-primary" style={{
              padding: '14px 32px', borderRadius: 12, fontWeight: 700, fontSize: '1rem',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
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

        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem', marginTop: 20 }}>
            Free to start.
          </p>
          </div>

      </motion.section>

      {/* ── Footer ── */}

      <motion.footer id="contact" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', padding: '64px 24px 32px' }}>

        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }} className="footer-grid">

            <div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>

                <span style={{

                  fontWeight: 900,

                  fontSize: '1.25rem',

                  letterSpacing: '4px',

                  color: '#C27635',

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

                      border: '1px solid rgba(194,118,53,0.35)',

                      fontSize: '0.75rem',

                      color: '#C27635',

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

                        border: '1px solid rgba(194,118,53,0.35)',

                        boxShadow: '0 12px 30px rgba(0,0,0,0.55)',

                        zIndex: 100,

                      }}

                    >

                      <a

                        href="https\://www.linkedin.com/in/tarun-pokhariya-9971433a6"

                        target="_blank"

                        rel="noopener noreferrer"

                        style={teamProfileLinkStyle}

                      >

                        Tarun Pokhariya

                      </a>

                      <a

                        href="https\://www.linkedin.com/in/pragitya-ghosh-33ba5a381/"

                        target="_blank"

                        rel="noopener noreferrer"

                        style={teamProfileLinkStyle}

                      >

                        Pragitya Ghosh

                      </a>

                      <a

                        href="https\://www.linkedin.com/in/gaurav-singh-aa6a19376"

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

                      border: '1px solid rgba(194,118,53,0.35)',

                      fontSize: '0.75rem',

                      color: '#C27635',

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

                        border: '1px solid rgba(194,118,53,0.35)',

                        boxShadow: '0 12px 30px rgba(0,0,0,0.55)',

                        zIndex: 100,

                      }}

                    >

                      <a

                        href="https\://github.com/tarunpokhariya2007-svg"

                        target="_blank"

                        rel="noopener noreferrer"

                        style={teamProfileLinkStyle}

                      >

                        Tarun Pokhariya

                      </a>

                      <a

                        href="https\://github.com/gaurav8469"

                        target="_blank"

                        rel="noopener noreferrer"

                        style={teamProfileLinkStyle}

                      >

                        Gaurav Singh

                      </a>

                      <a

                        href="https\://github.com/Pragitya02"

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
              { heading: 'Platform', links: [
                { label: 'AI Assistant', to: '/dashboard/ai-assistant', protect: true },
                { label: 'Find Advocates', to: '/dashboard/advocates', protect: true },
                { label: 'Document Analyzer', to: '/dashboard/documents', protect: true },
              ] },
              { heading: 'For Advocates', links: [
                { label: 'Join as Advocate', to: '/signup' },
              ] },
              { heading: 'Company', links: [
                { label: 'About Us', to: '#about', anchor: true },
              ] },
            ].map(col => (
              <div key={col.heading}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: 16, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {col.heading}
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {col.links.map(l => (
                    <li key={l.label}>
                      {'anchor' in l && l.anchor ? (
                        <a href={l.to} style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textDecoration: 'none' }}>{l.label}</a>
                      ) : 'protect' in l && l.protect ? (
                        <Link
                          to={l.to}
                          onClick={(e) => { e.preventDefault(); handleProtectedNavigation(l.to) }}
                          style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textDecoration: 'none' }}
                        >{l.label}</Link>
                      ) : (
                        <Link to={l.to} style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textDecoration: 'none' }}>{l.label}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>

            <p style={{ fontSize: '0.8rem', color: '#C4C4C4' }}>
              © 2026 NyayaAI · Not a substitute for professional legal advice.
            </p>

            <div style={{ display: 'flex', gap: 16 }}>

              {[
                { label: 'Terms', to: '/terms' },
                { label: 'Privacy', to: '/privacy' },
                { label: 'Disclaimer', to: '/disclaimer' },
                { label: 'Grievance', to: '/grievance' },
              ].map(l => (
                <Link key={l.label} to={l.to} style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', textDecoration: 'none' }}>{l.label}</Link>
              ))}

            </div>

          </div>

        </div>

      </motion.footer>

      <style>{`
        .landing-page > .nyaya-disclaimer {
          position: fixed !important;
          right: 20px !important;
          bottom: 20px !important;
          left: auto !important;
          width: min(360px, calc(100vw - 32px));
          max-width: calc(100vw - 32px);
          max-height: min(220px, calc(100vh - 32px));
          box-sizing: border-box;
          overflow-y: auto;
          padding: 14px 42px 14px 16px;
          background: rgba(8, 8, 8, 0.96);
          border: 1px solid rgba(194, 118, 53, 0.65);
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
          background: rgba(194, 118, 53, 0.65);
          border-radius: 10px;
        }

        .nyaya-disclaimer-title {
          margin: 0 0 7px;
          color: #C27635;
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
          border: 1px solid rgba(194, 118, 53, 0.35);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.04);
          color: #C27635;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          padding: 0;
        }

        .nyaya-disclaimer-close:hover {
          background: rgba(194, 118, 53, 0.12);
        }

        @media (max-width: 600px) {
          .landing-page > .nyaya-disclaimer {
            right: 12px !important;
            bottom: 12px !important;
            left: auto !important;
            width: calc(100vw - 24px);
            max-width: calc(100vw - 24px);
            max-height: min(170px, calc(100vh - 24px));
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
