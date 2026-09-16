import { useState } from 'react'
import { useLocation } from 'react-router'
import { Bell, Globe, Moon, Sun, Shield, Check } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: 40, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer', position: 'relative',
      background: on ? 'var(--blue)' : 'var(--border)', transition: 'background 0.15s', flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: '50%',
        background: 'white', transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

export default function Settings() {
  const location = useLocation()
  const isAdvocate = location.pathname.startsWith('/advocate')
  const { theme, toggle } = useTheme()

  const [emailNotif, setEmailNotif] = useState(true)
  const [smsNotif, setSmsNotif] = useState(false)
  const [pushNotif, setPushNotif] = useState(true)
  const [language, setLanguage] = useState('English')
  const [autoAccept, setAutoAccept] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="page-enter" style={{ maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 2 }}>Manage your account preferences</p>
      </div>

      {/* Appearance */}
      <div className="card" style={{ padding: 22 }}>
        <h2 style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />} Appearance
        </h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: '0.85rem' }}>Dark Mode</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>Switch between light and dark theme</div>
          </div>
          <Toggle on={theme === 'dark'} onClick={toggle} />
        </div>
      </div>

      {/* Notifications */}
      <div className="card" style={{ padding: 22 }}>
        <h2 style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={15} /> Notifications
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Email Notifications', desc: 'Case updates, appointment reminders', on: emailNotif, set: setEmailNotif },
            { label: 'SMS Notifications', desc: 'Urgent alerts via text message', on: smsNotif, set: setSmsNotif },
            { label: 'Push Notifications', desc: 'Real-time alerts on this device', on: pushNotif, set: setPushNotif },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: '0.85rem' }}>{f.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>{f.desc}</div>
              </div>
              <Toggle on={f.on} onClick={() => f.set(!f.on)} />
            </div>
          ))}
        </div>
      </div>

      {isAdvocate && (
        <div className="card" style={{ padding: 22 }}>
          <h2 style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={15} /> Practice Preferences
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: '0.85rem' }}>Auto-accept new client requests</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>Skip manual review for matching specializations</div>
            </div>
            <Toggle on={autoAccept} onClick={() => setAutoAccept(!autoAccept)} />
          </div>
        </div>
      )}

      {/* Language */}
      <div className="card" style={{ padding: 22 }}>
        <h2 style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe size={15} /> Language
        </h2>
        <select className="input" value={language} onChange={e => setLanguage(e.target.value)} style={{ maxWidth: 260 }}>
          {['English', 'Hindi', 'Tamil', 'Bengali', 'Telugu', 'Marathi', 'Gujarati'].map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div>
        <button onClick={handleSave} className="btn-primary"
          style={{
            padding: '11px 22px', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 7,
          }}>
          {saved ? <><Check size={15} /> Saved</> : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
