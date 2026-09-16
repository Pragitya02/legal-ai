import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Calendar, Clock, Video, MapPin, Star, Award, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'

const timeSlots = [
  '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
]

const months = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDay(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function Booking() {
  const navigate = useNavigate()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [mode, setMode] = useState<'video' | 'inperson'>('video')
  const [booked, setBooked] = useState(false)

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDay(year, month)
  const unavailableDays = [3, 7, 14, 21, 28]

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  if (booked) {
    return (
      <div className="page-enter" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div className="card" style={{ padding: 48, textAlign: 'center', maxWidth: 440 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: 'var(--emerald-subtle)',
            border: '2px solid var(--emerald-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <CheckCircle size={34} style={{ color: 'var(--emerald)' }} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Consultation Booked!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
            Your appointment with <strong>Adv. Kavita Srinivasan</strong> has been confirmed.
          </p>
          <div style={{ padding: '14px 18px', borderRadius: 10, background: 'var(--bg-secondary)', marginBottom: 24, textAlign: 'left' }}>
            {[
              ['Date', `${selectedDay} ${months[month]} ${year}`],
              ['Time', selectedTime || ''],
              ['Mode', mode === 'video' ? 'Video Call' : 'In-Person'],
              ['Fee', '₹1,500 (paid)'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{v}</span>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn-primary"
            style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700 }}>
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter">
      <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Book Consultation</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 24 }}>Choose your preferred date, time, and consultation mode.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }} className="booking-grid">
        {/* Left: Calendar + slots */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Calendar */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <button onClick={prevMonth} style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)',
              }}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>
                {months[month]} {year}
              </span>
              <button onClick={nextMonth} style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)',
              }}>
                <ChevronRight size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 8 }}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate()
                const isPast = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate())
                const isUnavail = unavailableDays.includes(day)
                const isSelected = selectedDay === day

                return (
                  <button key={day}
                    onClick={() => !isPast && !isUnavail && setSelectedDay(day)}
                    disabled={isPast || isUnavail}
                    style={{
                      height: 36, borderRadius: 8, border: 'none', cursor: isPast || isUnavail ? 'default' : 'pointer',
                      fontSize: '0.82rem', fontWeight: isSelected ? 700 : 400,
                      background: isSelected ? 'var(--blue)' : isToday ? 'var(--blue-subtle)' : 'transparent',
                      color: isSelected ? 'white' : isPast ? 'var(--text-subtle)' : isUnavail ? 'var(--border)' : isToday ? 'var(--blue)' : 'var(--text)',
                      transition: 'all 0.15s',
                      textDecoration: isUnavail ? 'line-through' : 'none',
                    }}>
                    {day}
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              {[['var(--blue)', 'Selected'], ['var(--blue-subtle)', 'Today'], ['var(--border)', 'Unavailable']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Time slots */}
          {selectedDay && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem', marginBottom: 14 }}>
                <Clock size={15} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--blue)' }} />
                Available Time Slots — {selectedDay} {months[month]}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {timeSlots.map(t => {
                  const booked = ['11:00 AM', '2:00 PM'].includes(t)
                  const selected = selectedTime === t
                  return (
                    <button key={t} onClick={() => !booked && setSelectedTime(t)}
                      disabled={booked}
                      style={{
                        padding: '9px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: booked ? 'default' : 'pointer',
                        border: `1px solid ${selected ? 'var(--blue)' : 'var(--border)'}`,
                        background: selected ? 'var(--blue)' : booked ? 'var(--bg-secondary)' : 'var(--bg-card)',
                        color: selected ? 'white' : booked ? 'var(--text-subtle)' : 'var(--text)',
                        textDecoration: booked ? 'line-through' : 'none',
                      }}>{t}</button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Mode */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem', marginBottom: 14 }}>
              Consultation Mode
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {([
                { id: 'video' as const, icon: Video, label: 'Video Call', sub: 'Google Meet / Zoom' },
                { id: 'inperson' as const, icon: MapPin, label: 'In-Person', sub: 'Delhi HC Chamber' },
              ]).map(m => (
                <button key={m.id} onClick={() => setMode(m.id)}
                  style={{
                    padding: '14px', borderRadius: 10, border: `1.5px solid ${mode === m.id ? 'var(--blue)' : 'var(--border)'}`,
                    background: mode === m.id ? 'var(--blue-subtle)' : 'var(--bg-secondary)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}>
                  <m.icon size={18} style={{ color: mode === m.id ? 'var(--blue)' : 'var(--text-muted)', marginBottom: 6 }} />
                  <div style={{ fontWeight: 600, color: mode === m.id ? 'var(--blue)' : 'var(--text)', fontSize: '0.875rem' }}>{m.label}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{m.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Advocate card + payment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Advocate profile */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div className="avatar" style={{ width: 52, height: 52, fontSize: '1rem' }}>KS</div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>Adv. Kavita Srinivasan</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                  <Award size={11} style={{ color: 'var(--emerald)' }} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--emerald)', fontWeight: 600 }}>Bar Council Verified</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 14 }}>Property & Real Estate Law · Delhi HC</div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                  <Star size={12} style={{ color: '#F59E0B' }} fill="#F59E0B" />
                  <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.875rem' }}>4.9</span>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>218 reviews</div>
              </div>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.875rem' }}>15yr</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>experience</div>
              </div>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.875rem' }}>312</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>cases won</div>
              </div>
            </div>
          </div>

          {/* Booking summary */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem', marginBottom: 14 }}>Booking Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {[
                ['Date', selectedDay ? `${selectedDay} ${months[month]} ${year}` : '—'],
                ['Time', selectedTime || '—'],
                ['Mode', mode === 'video' ? 'Video Call' : 'In-Person'],
                ['Duration', '60 minutes'],
                ['Consultation Fee', '₹1,500'],
                ['Platform Fee (5%)', '₹75'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ fontWeight: 500, color: 'var(--text)' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)' }}>₹1,575</span>
            </div>

            <button
              onClick={() => selectedDay && selectedTime && setBooked(true)}
              disabled={!selectedDay || !selectedTime}
              className="btn-primary"
              style={{
                width: '100%', padding: '13px', borderRadius: 10, border: 'none', cursor: selectedDay && selectedTime ? 'pointer' : 'not-allowed',
                fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: selectedDay && selectedTime ? 1 : 0.5,
              }}>
              Pay & Confirm Booking
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 10 }}>
              Powered by Razorpay · 100% Secure · Refundable within 24hrs
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { .booking-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
