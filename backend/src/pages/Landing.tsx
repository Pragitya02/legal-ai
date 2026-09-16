import { Link } from 'react-router'
import {
  Scale, ArrowRight, Star, CheckCircle, Shield, Zap, Globe, Lock,
  MessageSquare, Users, FileSearch, MapPin, Mic, ChevronRight,
  Award, Clock, TrendingUp, BookOpen,
} from 'lucide-react'

const stats = [
  { value: '48,200+', label: 'Cases Guided', icon: BookOpen },
  { value: '1,840', label: 'Verified Advocates', icon: Award },
  { value: '97.4%', label: 'AI Accuracy', icon: TrendingUp },
  { value: '220+', label: 'Cities Covered', icon: MapPin },
]

const steps = [
  {
    step: '01', title: 'Describe Your Issue',
    desc: 'Simply type or speak your legal problem in any language — no legal jargon needed.',
    color: 'var(--blue)',
  },
  {
    step: '02', title: 'AI Analyzes Your Case',
    desc: 'Our Agentic AI cross-references thousands of statutes, IPC sections, and precedents instantly.',
    color: '#7C3AED',
  },
  {
    step: '03', title: 'Receive Legal Guidance',
    desc: 'Get a structured report with relevant laws, recommended actions, required documents, and timelines.',
    color: 'var(--emerald)',
  },
  {
    step: '04', title: 'Hire an Advocate',
    desc: 'Browse verified advocates matched to your case type, read reviews, and book consultations.',
    color: '#F59E0B',
  },
]

const features = [
  {
    icon: MessageSquare, title: 'AI Legal Assistant',
    desc: 'ChatGPT-style interface trained on Indian law. Ask anything about your rights and get instant, accurate guidance.',
    color: 'var(--blue)', bg: 'var(--blue-subtle)',
  },
  {
    icon: Users, title: 'Advocate Marketplace',
    desc: 'Connect with 1,840+ verified advocates filtered by specialization, city, language, and consultation fee.',
    color: '#7C3AED', bg: 'rgba(124,58,237,0.08)',
  },
  {
    icon: FileSearch, title: 'AI Document Analyzer',
    desc: 'Upload FIRs, contracts, court orders, and property papers. AI extracts key clauses and flags risks instantly.',
    color: 'var(--emerald)', bg: 'var(--emerald-subtle)',
  },
  {
    icon: MapPin, title: 'Jurisdiction Finder',
    desc: 'Automatically identify the correct court, jurisdiction, and authority for your case type and location.',
    color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',
  },
  {
    icon: Lock, title: 'Secure Chat',
    desc: 'End-to-end encrypted communication with advocates. Your legal matters stay strictly confidential.',
    color: '#EF4444', bg: 'rgba(239,68,68,0.08)',
  },
  {
    icon: Globe, title: 'Multilingual Support',
    desc: 'Available in Hindi, English, Tamil, Bengali, Marathi, Telugu, Kannada, and 14 more Indian languages.',
    color: '#06B6D4', bg: 'rgba(6,182,212,0.08)',
  },
]

const testimonials = [
  {
    name: 'Rajesh Kumar', city: 'New Delhi', initials: 'RK',
    role: 'Property Dispute Resolved',
    text: 'NyayaAI helped me understand my rights in a landlord dispute in 10 minutes. The AI cited the exact Rent Control Act provisions. The advocate I hired through the platform won the case.',
    rating: 5,
  },
  {
    name: 'Preethi Nair', city: 'Bangalore', initials: 'PN',
    role: 'Consumer Complaint',
    text: 'I had no idea how to file a consumer complaint after being defrauded online. NyayaAI walked me through every step, generated the complaint draft, and connected me with a consumer law specialist.',
    rating: 5,
  },
  {
    name: 'Mohan Das', city: 'Mumbai', initials: 'MD',
    role: 'Labour Law Dispute',
    text: 'My employer was withholding my gratuity. The AI identified it as a clear violation of the Payment of Gratuity Act 1972 and I got my dues within 3 weeks. Incredible platform.',
    rating: 5,
  },
]

const pricing = [
  {
    label: 'Citizen',
    price: '₹0',
    period: 'Forever Free',
    highlight: false,
    color: 'var(--blue)',
    features: [
      '5 AI consultations / month',
      'Basic document analysis',
      'Jurisdiction finder',
      'Browse advocate listings',
      'Multilingual support',
      'Community forum access',
    ],
    cta: 'Start Free',
    href: '/signup',
  },
  {
    label: 'Citizen Pro',
    price: '₹299',
    period: 'per month',
    highlight: true,
    color: 'var(--blue)',
    features: [
      'Unlimited AI consultations',
      'Advanced document analysis (50 docs)',
      'Priority advocate matching',
      'Secure encrypted chat',
      'Case timeline tracker',
      'Export reports as PDF',
      'Dedicated support',
    ],
    cta: 'Get Pro',
    href: '/signup',
  },
  {
    label: 'Advocate',
    price: '₹999',
    period: 'per month',
    highlight: false,
    color: 'var(--emerald)',
    features: [
      'AI Research Assistant',
      'Case file analysis & summaries',
      'Similar judgment finder',
      'Draft argument generator',
      'Client management portal',
      'Analytics & earnings dashboard',
      'Verified badge & profile boost',
    ],
    cta: 'Join as Advocate',
    href: '/advocate-login',
  },
]

export default function Landing() {
  return (
    <div style={{ overflowX: 'hidden' }}>
      {/* ── Hero ── */}
      <section className="hero-gradient" style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', position: 'relative' }}>
        {/* Decorative orbs */}
        <div style={{
          position: 'absolute', width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)',
          top: -100, left: -100, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(5,150,105,0.08) 0%, transparent 70%)',
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
                Your AI Legal<br />
                Assistant —{' '}
                <span className="gradient-text">Get Guidance</span>
                <br />in Minutes.
              </h1>

              <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 32, maxWidth: 480 }}>
                AI-powered legal guidance, document assistance, and verified advocate connections.
                Understand your rights. Navigate the justice system. All in your language.
              </p>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
                <Link to="/dashboard/ai-assistant" className="btn-primary"
                  style={{ padding: '14px 28px', borderRadius: 12, fontWeight: 700, fontSize: '1rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <MessageSquare size={18} />
                  Get Legal Help
                </Link>
                <Link to="/dashboard/advocates" className="btn-ghost"
                  style={{ padding: '14px 28px', borderRadius: 12, fontWeight: 600, fontSize: '1rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Users size={18} />
                  Find an Advocate
                  <ArrowRight size={16} />
                </Link>
              </div>

              {/* Trust indicators */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                {['Bar Council Verified', 'ISO 27001 Certified', 'MeitY Recognized'].map(t => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CheckCircle size={14} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right – Illustration */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <HeroIllustration />
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

      {/* ── Testimonials ── */}
      <section id="about" style={{ padding: '100px 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span className="section-tag" style={{ marginBottom: 16, display: 'inline-flex' }}>
              <Star size={12} /> Testimonials
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', marginTop: 12 }}>
              Trusted by thousands across India
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }} className="testimonials-grid">
            {testimonials.map(t => (
              <div key={t.name} className="card card-interactive" style={{ padding: 28 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 16 }} className="stars">
                  {Array.from({ length: t.rating }).map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' }}>
                  "{t.text}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="avatar" style={{ width: 40, height: 40 }}>{t.initials}</div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.875rem' }}>{t.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.role} · {t.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="hero-gradient" style={{ padding: '100px 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span className="section-tag" style={{ marginBottom: 16, display: 'inline-flex' }}>
              Simple Pricing
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', marginTop: 12 }}>
              Transparent. Affordable. Fair.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }} className="pricing-grid">
            {pricing.map(plan => (
              <div key={plan.label}
                className={plan.highlight ? 'card pricing-popular' : 'card'}
                style={{ padding: 32, position: 'relative' }}>
                {plan.highlight && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, var(--blue), #7C3AED)',
                    color: 'white', padding: '4px 16px', borderRadius: 99,
                    fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', whiteSpace: 'nowrap',
                  }}>
                    MOST POPULAR
                  </div>
                )}

                <div style={{ marginBottom: 8 }}>
                  <div className="badge" style={{ background: `color-mix(in srgb, ${plan.color} 12%, transparent)`, color: plan.color, marginBottom: 12 }}>
                    {plan.label}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: '2.8rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.04em' }}>
                      {plan.price}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>/{plan.period}</span>
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      <CheckCircle size={15} style={{ color: plan.color, marginTop: 1, flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link to={plan.href}
                  className={plan.highlight ? 'btn-primary' : (plan.color === 'var(--emerald)' ? 'btn-emerald' : 'btn-ghost')}
                  style={{
                    display: 'block', padding: '12px', borderRadius: 10, textAlign: 'center',
                    fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem',
                    ...((!plan.highlight && plan.color !== 'var(--emerald)') ? { border: '1px solid var(--border)' } : {}),
                  }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ padding: '80px 24px', background: 'linear-gradient(135deg, #1E40AF 0%, #7C3AED 50%, #059669 100%)' }}>
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
              background: 'white', color: '#1E40AF', textDecoration: 'none',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)', display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              Get Started Free <ArrowRight size={18} />
            </Link>
            <Link to="/dashboard/advocates" style={{
              padding: '14px 32px', borderRadius: 12, fontWeight: 600, fontSize: '1rem',
              background: 'rgba(255,255,255,0.15)', color: 'white', textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.3)',
            }}>
              Find an Advocate
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="contact" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', padding: '64px 24px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }} className="footer-grid">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'linear-gradient(135deg, var(--blue), #7C3AED)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Scale size={15} color="white" />
                </div>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>
                  Nyaya<span style={{ color: 'var(--blue)' }}>AI</span>
                </span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 280 }}>
                India's first Agentic AI-powered legal assistance platform, making justice accessible for every citizen.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                {['Twitter', 'LinkedIn', 'GitHub'].map(s => (
                  <div key={s} style={{
                    padding: '6px 12px', borderRadius: 6, background: 'var(--bg-card)',
                    border: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}>{s}</div>
                ))}
              </div>
            </div>
            {[
              { heading: 'Platform', links: ['AI Assistant', 'Find Advocates', 'Document Analyzer', 'Jurisdiction Finder', 'Pricing'] },
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
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .steps-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .features-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .testimonials-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function HeroIllustration() {
  return (
    <div style={{ position: 'relative', width: 440, height: 420 }} className="float-animation">
      <svg viewBox="0 0 440 420" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        {/* Background circle */}
        <circle cx="220" cy="210" r="180" fill="url(#bgGrad)" opacity="0.15" />

        {/* Main phone/chat window */}
        <rect x="80" y="60" width="200" height="300" rx="20" fill="url(#cardGrad)" stroke="#2563EB" strokeWidth="1.5" opacity="0.95" />

        {/* Chat messages */}
        <rect x="96" y="90" width="120" height="32" rx="8" fill="#EFF6FF" />
        <text x="156" y="110" fontSize="9" fill="#2563EB" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="600">How can I help you?</text>

        <rect x="116" y="134" width="148" height="40" rx="8" fill="#DBEAFE" opacity="0.9" />
        <text x="130" y="149" fontSize="8" fill="#1E40AF" fontFamily="Inter, sans-serif">My landlord isn't returning</text>
        <text x="130" y="162" fontSize="8" fill="#1E40AF" fontFamily="Inter, sans-serif">my ₹80,000 deposit...</text>

        <rect x="96" y="186" width="165" height="60" rx="8" fill="white" stroke="#E2E8F0" strokeWidth="1" />
        <text x="106" y="200" fontSize="7.5" fill="#2563EB" fontFamily="Inter, sans-serif" fontWeight="700">⚖ Analysis Complete</text>
        <text x="106" y="213" fontSize="7" fill="#475569" fontFamily="Inter, sans-serif">Relevant: Transfer of Property</text>
        <text x="106" y="224" fontSize="7" fill="#475569" fontFamily="Inter, sans-serif">Act, 1882 · Section 108</text>
        <text x="106" y="237" fontSize="7" fill="#059669" fontFamily="Inter, sans-serif" fontWeight="600">✓ Strong case — Act Now</text>

        {/* Balance scale */}
        <circle cx="200" cy="275" r="18" fill="url(#scaleGrad)" opacity="0.9" />
        <text x="200" y="280" fontSize="18" textAnchor="middle">⚖️</text>

        {/* Connecting line */}
        <line x1="190" y1="275" x2="290" y2="200" stroke="#2563EB" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.5" />

        {/* AI card - right */}
        <rect x="270" y="130" width="140" height="100" rx="14" fill="url(#aiCardGrad)" stroke="url(#borderGrad)" strokeWidth="1.5" />
        <circle cx="292" cy="158" r="14" fill="url(#avatarGrad)" />
        <text x="292" y="163" fontSize="12" textAnchor="middle">🤖</text>
        <text x="310" y="154" fontSize="8.5" fill="white" fontFamily="Inter, sans-serif" fontWeight="700">NyayaAI</text>
        <text x="310" y="165" fontSize="7" fill="rgba(255,255,255,0.7)" fontFamily="Inter, sans-serif">Legal Assistant</text>
        <rect x="282" y="178" width="118" height="6" rx="3" fill="rgba(255,255,255,0.2)" />
        <rect x="282" y="188" width="90" height="6" rx="3" fill="rgba(255,255,255,0.15)" />
        <rect x="282" y="198" width="106" height="6" rx="3" fill="rgba(255,255,255,0.12)" />
        <rect x="282" y="213" width="60" height="18" rx="6" fill="white" opacity="0.9" />
        <text x="312" y="225" fontSize="7.5" fill="#2563EB" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="700">Book Advocate</text>

        {/* Floating tags */}
        <rect x="290" y="60" width="100" height="28" rx="8" fill="white" stroke="#E2E8F0" strokeWidth="1" />
        <text x="295" y="78" fontSize="8" fill="#059669" fontFamily="Inter, sans-serif" fontWeight="700">✓ Bar Council Verified</text>

        <rect x="60" y="295" width="100" height="28" rx="8" fill="white" stroke="#E2E8F0" strokeWidth="1" />
        <text x="110" y="313" fontSize="8" fill="#7C3AED" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="700">🔒 Encrypted Chat</text>

        <rect x="290" y="270" width="120" height="28" rx="8" fill="white" stroke="#E2E8F0" strokeWidth="1" />
        <text x="350" y="288" fontSize="8" fill="#F59E0B" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="700">⚡ 220+ Cities</text>

        {/* Dots decoration */}
        {[0,1,2,3,4].map(i => (
          <circle key={i} cx={40 + i * 20} cy={380} r="3" fill="#2563EB" opacity={0.15 + i * 0.08} />
        ))}
        {[0,1,2].map(i => (
          <circle key={i} cx={380} cy={80 + i * 25} r="3" fill="#059669" opacity={0.2 + i * 0.1} />
        ))}

        <defs>
          <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#EFF6FF" />
          </linearGradient>
          <linearGradient id="aiCardGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1E40AF" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          <linearGradient id="borderGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
          <linearGradient id="scaleGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#DBEAFE" />
            <stop offset="100%" stopColor="#EDE9FE" />
          </linearGradient>
          <linearGradient id="avatarGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}
