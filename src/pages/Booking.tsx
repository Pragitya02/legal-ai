import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { isLoggedIn } from '../lib/auth'
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Star,
  Award,
  CheckCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

const timeSlots = [
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
]

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDay(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function Booking() {
  const navigate = useNavigate()

  // =====================================================
  // SELECTED ADVOCATE ID
  // =====================================================

  const advocateId = new URLSearchParams(
    window.location.search
  ).get('advocateId')

  // =====================================================
  // DATE / BOOKING STATE
  // =====================================================

  const today = new Date()

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] =
    useState<number | null>(null)
  const [selectedTime, setSelectedTime] =
    useState<string | null>(null)

  const [mode, setMode] =
    useState<'video' | 'inperson'>('video')

  const [booked, setBooked] = useState(false)

  // =====================================================
  // BOOKING LOADING STATE
  // =====================================================

  const [bookingLoading, setBookingLoading] =
    useState(false)

  // =====================================================
  // REAL ADVOCATE AVAILABILITY
  // =====================================================

  const [weeklyAvailability, setWeeklyAvailability] =
    useState<any[]>([])
  const [availabilityBlocks, setAvailabilityBlocks] =
    useState<any[]>([])
  const [bookedAppointments, setBookedAppointments] =
    useState<any[]>([])
  const [availabilityLoading, setAvailabilityLoading] =
    useState(false)

  // =====================================================
  // SELECTED ADVOCATE
  // =====================================================

  const [advocate, setAdvocate] =
    useState<any>(null)

  const [loadingAdvocate, setLoadingAdvocate] =
    useState(true)

  // =====================================================
  // LOAD SELECTED ADVOCATE
  // =====================================================

  useEffect(() => {
    if (!advocateId) {
      setLoadingAdvocate(false)
      return
    }

    const loadAdvocate = async () => {
      try {
        setLoadingAdvocate(true)

        const response = await fetch(
          `${API_URL}/api/lawyers`
        )

        if (!response.ok) {
          throw new Error(
            `Server error: ${response.status}`
          )
        }

        const data = await response.json()

        if (
          data.success &&
          Array.isArray(data.lawyers)
        ) {
          const selectedAdvocate =
            data.lawyers.find(
              (lawyer: any) =>
                String(lawyer.id) ===
                String(advocateId)
            )

          if (selectedAdvocate) {
            setAdvocate(selectedAdvocate)
          } else {
            console.error(
              'Selected advocate not found:',
              advocateId
            )
          }
        }
      } catch (error) {
        console.error(
          'Failed to load selected advocate:',
          error
        )
      } finally {
        setLoadingAdvocate(false)
      }
    }

    loadAdvocate()
  }, [advocateId])

  // =====================================================
  // ADVOCATE DISPLAY DATA
  // =====================================================

  const advocateName =
    advocate?.full_name || 'Advocate'

  const advocateInitials =
    advocateName
      .split(' ')
      .filter(Boolean)
      .map(
        (name: string) =>
          name[0]
      )
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'AD'

  const advocateEmail =
    advocate?.email || ''

  const advocatePhone =
    advocate?.phone || ''

  const advocateSpecialization =
    advocate?.specialization ||
    advocate?.specializations?.[0] ||
    'General Practice'

  const advocateCity =
    advocate?.city ||
    'India'

  const advocateCourt =
    advocate?.court ||
    'High Court'

  // =====================================================
  // FEES
  // =====================================================

  const consultationFee =
    Number(advocate?.fee) > 0
      ? Number(advocate.fee)
      : 1500

  const platformFee =
    Math.round(
      consultationFee * 0.05
    )

  const totalFee =
    consultationFee + platformFee

  // =====================================================
  // CALENDAR
  // =====================================================

  const daysInMonth =
    getDaysInMonth(
      year,
      month
    )

  const firstDay =
    getFirstDay(
      year,
      month
    )

  const unavailableDays: number[] = []

  // =====================================================
  // AVAILABILITY HELPERS
  // =====================================================

  const formatDate = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const getDayOfWeekMondayFirst = (dateString: string) => {
    const date = new Date(`${dateString}T12:00:00`)
    const jsDay = date.getDay()
    return jsDay === 0 ? 7 : jsDay
  }

  const timeToMinutes = (value: string) => {
    const [hours, minutes] = String(value || '')
      .slice(0, 5)
      .split(':')
      .map(Number)
    return hours * 60 + minutes
  }

  const convertTo24Hour = (value: string) => {
    const match = String(value || '')
      .trim()
      .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)

    if (!match) return null

    let hours = Number(match[1])
    const minutes = Number(match[2])
    const period = match[3].toUpperCase()

    if (period === 'AM') {
      if (hours === 12) hours = 0
    } else if (hours !== 12) {
      hours += 12
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  const convertTo12Hour = (value: string) => {
    const [hours, minutes] = String(value || '')
      .slice(0, 5)
      .split(':')
      .map(Number)

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return ''
    }

    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHour = hours % 12 || 12

    return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
  }

  const getScheduleForDay = (day: number) => {
    const dateString = formatDate(day)
    const dayOfWeek = getDayOfWeekMondayFirst(dateString)

    return weeklyAvailability.find(
      item => Number(item.day_of_week) === dayOfWeek
    ) || null
  }

  const getDateBlocks = (day: number) => {
    const dateString = formatDate(day)
    return availabilityBlocks.filter(
      block => block.block_date === dateString
    )
  }

  const isFullDayBlocked = (day: number) =>
    getDateBlocks(day).some(
      block => block.block_type === 'full_day'
    )

  const isDateAvailable = (day: number) => {
    const schedule = getScheduleForDay(day)

    return Boolean(
      schedule &&
      Number(schedule.is_available) === 1 &&
      !isFullDayBlocked(day)
    )
  }

  const isTimeBlocked = (day: number, time: string) => {
    const start = convertTo24Hour(time)
    if (!start) return false

    const startMinutes = timeToMinutes(start)
    const endMinutes = startMinutes + 60

    return getDateBlocks(day).some(block => {
      if (block.block_type !== 'time_block') return false

      const blockStart = timeToMinutes(block.start_time)
      const blockEnd = timeToMinutes(block.end_time)

      return startMinutes < blockEnd && endMinutes > blockStart
    })
  }

  const isSlotBooked = (day: number, time: string) => {
    const dateString = formatDate(day)
    const time24 = convertTo24Hour(time)

    if (!time24) return false

    return bookedAppointments.some(appointment => {
      const value = String(
        appointment.appointment_date ||
        appointment.appointmentDate ||
        ''
      ).replace('T', ' ')

      return (
        value.slice(0, 10) === dateString &&
        value.slice(11, 16) === time24
      )
    })
  }

  const isSlotAvailable = (day: number, time: string) => {
    const schedule = getScheduleForDay(day)
    const time24 = convertTo24Hour(time)

    if (!schedule || Number(schedule.is_available) !== 1 || !time24) {
      return false
    }

    const startMinutes = timeToMinutes(time24)
    const endMinutes = startMinutes + 60

    return (
      !isFullDayBlocked(day) &&
      startMinutes >= timeToMinutes(schedule.start_time) &&
      endMinutes <= timeToMinutes(schedule.end_time) &&
      !isTimeBlocked(day, time) &&
      !isSlotBooked(day, time)
    )
  }

  const getAvailableTimeSlots = () => {
    if (!selectedDay) return []

    const schedule = getScheduleForDay(selectedDay)

    if (!schedule || Number(schedule.is_available) !== 1) {
      return []
    }

    const startMinutes = timeToMinutes(schedule.start_time)
    const endMinutes = timeToMinutes(schedule.end_time)
    const slots: string[] = []

    for (let minutes = startMinutes; minutes + 60 <= endMinutes; minutes += 60) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      slots.push(
        convertTo12Hour(
          `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
        )
      )
    }

    return slots
  }

  // =====================================================
  // LOAD REAL AVAILABILITY FOR SELECTED ADVOCATE
  // =====================================================

  useEffect(() => {
    if (!advocateId) return

    const loadAvailability = async () => {
      try {
        setAvailabilityLoading(true)

        const targetMonth = `${year}-${String(month + 1).padStart(2, '0')}`

        const response = await fetch(
          `${API_URL}/api/availability/lawyer/${encodeURIComponent(advocateId)}?month=${targetMonth}`
        )

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(
            data?.message ||
            'Failed to load advocate availability.'
          )
        }

        setWeeklyAvailability(
          Array.isArray(data.availability)
            ? data.availability
            : []
        )

        setAvailabilityBlocks(
          Array.isArray(data.blocks)
            ? data.blocks
            : []
        )

        setBookedAppointments(
          Array.isArray(data.bookedAppointments)
            ? data.bookedAppointments
            : []
        )
      } catch (error) {
        console.error(
          'BOOKING AVAILABILITY ERROR:',
          error
        )

        setWeeklyAvailability([])
        setAvailabilityBlocks([])
        setBookedAppointments([])
      } finally {
        setAvailabilityLoading(false)
      }
    }

    loadAvailability()
  }, [advocateId, year, month])

  useEffect(() => {
    if (selectedDay && !isDateAvailable(selectedDay)) {
      setSelectedTime(null)
    }

    if (selectedDay && selectedTime && !isSlotAvailable(selectedDay, selectedTime)) {
      setSelectedTime(null)
    }
  }, [weeklyAvailability, availabilityBlocks, bookedAppointments, selectedDay, selectedTime])

  // =====================================================
  // PREVIOUS MONTH
  // =====================================================

  const prevMonth = () => {
    if (month === 0) {
      setYear(
        y => y - 1
      )

      setMonth(11)
    } else {
      setMonth(
        m => m - 1
      )
    }

    setSelectedDay(null)
    setSelectedTime(null)
  }

  // =====================================================
  // NEXT MONTH
  // =====================================================

  const nextMonth = () => {
    if (month === 11) {
      setYear(
        y => y + 1
      )

      setMonth(0)
    } else {
      setMonth(
        m => m + 1
      )
    }

    setSelectedDay(null)
    setSelectedTime(null)
  }

  // =====================================================
  // CREATE APPOINTMENT
  // =====================================================

  const handleBooking = async () => {
    if (!selectedDay || !selectedTime || !advocateId) {
      return
    }

    try {
      setBookingLoading(true)

      if (!isLoggedIn()) {
        alert('Please login before requesting an appointment.')
        return
      }

      const appointmentDate = [
        year,
        String(month + 1).padStart(2, '0'),
        String(selectedDay).padStart(2, '0')
      ].join('-')

      const response = await fetch(
        `${API_URL}/api/appointments`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            advocateId: Number(advocateId),
            appointmentDate,
            appointmentTime: selectedTime,
            mode,
            consultationFee,
            platformFee,
            totalFee
          })
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data?.message ||
          'Failed to send consultation request.'
        )
      }

      console.log(
        'CONSULTATION REQUEST CREATED:',
        data.appointment
      )

      setBooked(true)

    } catch (error: any) {
      console.error(
        'BOOKING REQUEST ERROR:',
        error
      )

      alert(
        error?.message ||
        'Failed to send consultation request. Please try again.'
      )
    } finally {
      setBookingLoading(false)
    }
  }

  // =====================================================
  // BOOKING CONFIRMATION
  // =====================================================

  if (booked) {
    return (
      <div
        className="page-enter"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 400
        }}
      >
        <div
          className="card"
          style={{
            padding: 48,
            textAlign: 'center',
            maxWidth: 460
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--gold-subtle, rgba(212,175,55,0.12))',
              border: '2px solid var(--gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}
          >
            <Clock
              size={34}
              style={{
                color: 'var(--gold)'
              }}
            />
          </div>

          <h2
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'var(--text)',
              marginBottom: 8
            }}
          >
            Booking Request Sent
          </h2>

          <p
            style={{
              color: 'var(--text-muted)',
              marginBottom: 20,
              lineHeight: 1.6
            }}
          >
            Your consultation request has been sent to{' '}
            <strong>
              Adv. {advocateName}
            </strong>.
            The appointment will be confirmed only after the advocate accepts your request.
          </p>

          <div
            style={{
              padding: '14px 18px',
              borderRadius: 10,
              background: 'var(--bg-secondary)',
              marginBottom: 24,
              textAlign: 'left'
            }}
          >
            {[
              ['Advocate', `Adv. ${advocateName}`],
              ['Date', `${selectedDay} ${months[month]} ${year}`],
              ['Time', selectedTime || ''],
              ['Mode', mode === 'video' ? 'Video Call' : 'In-Person'],
              ['Status', 'Pending Advocate Approval']
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '5px 0',
                  fontSize: '0.875rem'
                }}
              >
                <span
                  style={{
                    color: 'var(--text-muted)'
                  }}
                >
                  {k}
                </span>

                <span
                  style={{
                    fontWeight: 600,
                    color: k === 'Status' ? 'var(--gold)' : 'var(--text)',
                    textAlign: 'right'
                  }}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>

          <p
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              marginBottom: 20,
              lineHeight: 1.5
            }}
          >
            No payment has been processed. You will be notified when the advocate responds.
          </p>

          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loadingAdvocate) {
    return (
      <div
        className="page-enter"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 400
        }}
      >
        <div
          style={{
            textAlign: 'center',
            color:
              'var(--text-muted)'
          }}
        >
          <div
            style={{
              marginBottom: 10
            }}
          >
            Loading advocate details...
          </div>

          <div
            style={{
              fontSize: '0.8rem'
            }}
          >
            Please wait
          </div>
        </div>
      </div>
    )
  }

  // =====================================================
  // MAIN BOOKING PAGE
  // =====================================================

  return (
    <div className="page-enter">

      {/* Header */}

      <div
        style={{
          marginBottom: 24
        }}
      >
        <h1
          style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: 'var(--text)',
            marginBottom: 4
          }}
        >
          Book Consultation
        </h1>

        <p
          style={{
            color:
              'var(--text-muted)',
            fontSize: '0.9rem',
            marginBottom: 24
          }}
        >
          Choose your preferred date,
          time, and consultation mode.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            '1fr 340px',
          gap: 20
        }}
        className="booking-grid"
      >

        {/* =================================================
            LEFT: CALENDAR + TIME + MODE
        ================================================= */}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}
        >

          {/* Calendar */}

          <div
            className="card"
            style={{
              padding: 24
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'space-between',
                marginBottom: 20
              }}
            >

              <button
                onClick={prevMonth}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border:
                    '1px solid var(--border)',
                  background:
                    'var(--bg-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent:
                    'center',
                  color:
                    'var(--text-muted)'
                }}
              >
                <ChevronLeft
                  size={16}
                />
              </button>

              <span
                style={{
                  fontWeight: 700,
                  color: 'var(--text)',
                  fontSize: '0.95rem'
                }}
              >
                {months[month]} {year}
              </span>

              <button
                onClick={nextMonth}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border:
                    '1px solid var(--border)',
                  background:
                    'var(--bg-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent:
                    'center',
                  color:
                    'var(--text-muted)'
                }}
              >
                <ChevronRight
                  size={16}
                />
              </button>

            </div>

            {/* Weekdays */}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(7, 1fr)',
                gap: 2,
                marginBottom: 8
              }}
            >
              {[
                'Su',
                'Mo',
                'Tu',
                'We',
                'Th',
                'Fr',
                'Sa'
              ].map(d => (
                <div
                  key={d}
                  style={{
                    textAlign: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color:
                      'var(--text-muted)',
                    padding: '4px 0'
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Days */}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(7, 1fr)',
                gap: 2
              }}
            >

              {Array.from({
                length: firstDay
              }).map((_, i) => (
                <div
                  key={`e${i}`}
                />
              ))}

              {Array.from({
                length: daysInMonth
              }).map((_, i) => {

                const day =
                  i + 1

                const isToday =
                  year ===
                    today.getFullYear() &&
                  month ===
                    today.getMonth() &&
                  day ===
                    today.getDate()

                const isPast =
                  new Date(
                    year,
                    month,
                    day
                  ) <
                  new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate()
                  )

                const isScheduledAvailable =
                  isDateAvailable(day)

                const isUnavail =
                  unavailableDays.includes(day) ||
                  !isScheduledAvailable

                const isSelected =
                  selectedDay === day

                return (
                  <button
                    key={day}
                    onClick={() => {

                      if (
                        !isPast &&
                        !isUnavail
                      ) {
                        setSelectedDay(
                          day
                        )

                        setSelectedTime(
                          null
                        )
                      }

                    }}
                    disabled={
                      isPast ||
                      isUnavail
                    }
                    style={{
                      height: 36,
                      borderRadius: 8,
                      border: 'none',
                      cursor:
                        isPast ||
                        isUnavail
                          ? 'default'
                          : 'pointer',
                      fontSize:
                        '0.82rem',
                      fontWeight:
                        isSelected
                          ? 700
                          : 400,
                      background:
                        isSelected
                          ? 'var(--blue)'
                          : isToday
                          ? 'var(--blue-subtle)'
                          : 'transparent',
                      color:
                        isSelected
                          ? 'white'
                          : isPast
                          ? 'var(--text-subtle)'
                          : isUnavail
                          ? 'var(--border)'
                          : isToday
                          ? 'var(--blue)'
                          : 'var(--text)',
                      transition:
                        'all 0.15s',
                      textDecoration:
                        isUnavail
                          ? 'line-through'
                          : 'none'
                    }}
                  >
                    {day}
                  </button>
                )
              })}

            </div>

            {/* Legend */}

            <div
              style={{
                display: 'flex',
                gap: 16,
                marginTop: 12,
                paddingTop: 12,
                borderTop:
                  '1px solid var(--border)'
              }}
            >

              {[
                [
                  'var(--blue)',
                  'Selected'
                ],
                [
                  'var(--blue-subtle)',
                  'Today'
                ],
                [
                  'var(--border)',
                  'Unavailable'
                ]
              ].map(
                ([c, l]) => (
                  <div
                    key={l}
                    style={{
                      display: 'flex',
                      alignItems:
                        'center',
                      gap: 5
                    }}
                  >

                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 3,
                        background: c
                      }}
                    />

                    <span
                      style={{
                        fontSize:
                          '0.7rem',
                        color:
                          'var(--text-muted)'
                      }}
                    >
                      {l}
                    </span>

                  </div>
                )
              )}

            </div>

          </div>

          {/* Time Slots */}

          {selectedDay && (
            <div
              className="card"
              style={{
                padding: 20
              }}
            >

              <h3
                style={{
                  fontWeight: 700,
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                  marginBottom: 14
                }}
              >

                <Clock
                  size={15}
                  style={{
                    marginRight: 6,
                    verticalAlign:
                      'middle',
                    color:
                      'var(--blue)'
                  }}
                />

                Available Time Slots —{' '}
                {selectedDay}{' '}
                {months[month]}

              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(4, 1fr)',
                  gap: 8
                }}
              >

                {availabilityLoading ? (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      padding: '16px 8px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.82rem'
                    }}
                  >
                    Loading available slots...
                  </div>
                ) : getAvailableTimeSlots().length === 0 ? (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      padding: '16px 8px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.82rem'
                    }}
                  >
                    No consultation slots are available for this date.
                  </div>
                ) : getAvailableTimeSlots().map(t => {

                  const slotBooked =
                    isSlotBooked(selectedDay, t)

                  const slotBlocked =
                    isTimeBlocked(selectedDay, t)

                  const slotAvailable =
                    isSlotAvailable(selectedDay, t)

                  const selected =
                    selectedTime === t

                  return (
                    <button
                      key={t}
                      onClick={() =>
                        slotAvailable &&
                        setSelectedTime(t)
                      }
                      disabled={!slotAvailable}
                      title={
                        slotBooked
                          ? 'Already booked'
                          : slotBlocked
                          ? 'Blocked by advocate'
                          : !slotAvailable
                          ? 'Not available'
                          : 'Available'
                      }
                      style={{
                        padding: '9px',
                        borderRadius: 8,
                        fontSize:
                          '0.8rem',
                        fontWeight: 600,
                        cursor:
                          slotAvailable
                            ? 'pointer'
                            : 'default',
                        border:
                          `1px solid ${
                            selected
                              ? 'var(--blue)'
                              : 'var(--border)'
                          }`,
                        background:
                          selected
                            ? 'var(--blue)'
                            : !slotAvailable
                            ? 'var(--bg-secondary)'
                            : 'var(--bg-card)',
                        color:
                          selected
                            ? 'white'
                            : !slotAvailable
                            ? 'var(--text-subtle)'
                            : 'var(--text)',
                        textDecoration:
                          !slotAvailable
                            ? 'line-through'
                            : 'none'
                      }}
                    >
                      {t}
                    </button>
                  )
                })}

              </div>

            </div>
          )}

          {/* Consultation Mode */}

          <div
            className="card"
            style={{
              padding: 20
            }}
          >

            <h3
              style={{
                fontWeight: 700,
                color: 'var(--text)',
                fontSize: '0.9rem',
                marginBottom: 14
              }}
            >
              Consultation Mode
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '1fr 1fr',
                gap: 10
              }}
            >

              {[
                {
                  id: 'video' as const,
                  icon: Video,
                  label: 'Video Call',
                  sub: 'Google Meet / Zoom'
                },
                {
                  id: 'inperson' as const,
                  icon: MapPin,
                  label: 'In-Person',
                  sub: 'Delhi HC Chamber'
                }
              ].map(m => (

                <button
                  key={m.id}
                  onClick={() =>
                    setMode(m.id)
                  }
                  style={{
                    padding: '14px',
                    borderRadius: 10,
                    border:
                      `1.5px solid ${
                        mode === m.id
                          ? 'var(--blue)'
                          : 'var(--border)'
                      }`,
                    background:
                      mode === m.id
                        ? 'var(--blue-subtle)'
                        : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition:
                      'all 0.15s'
                  }}
                >

                  <m.icon
                    size={18}
                    style={{
                      color:
                        mode === m.id
                          ? 'var(--blue)'
                          : 'var(--text-muted)',
                      marginBottom: 6
                    }}
                  />

                  <div
                    style={{
                      fontWeight: 600,
                      color:
                        mode === m.id
                          ? 'var(--blue)'
                          : 'var(--text)',
                      fontSize:
                        '0.875rem'
                    }}
                  >
                    {m.label}
                  </div>

                  <div
                    style={{
                      fontSize:
                        '0.72rem',
                      color:
                        'var(--text-muted)',
                      marginTop: 2
                    }}
                  >
                    {m.sub}
                  </div>

                </button>

              ))}

            </div>
          </div>

        </div>

        {/* =================================================
            RIGHT: ADVOCATE + PAYMENT
        ================================================= */}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >

          {/* Advocate Profile */}

          <div
            className="card"
            style={{
              padding: 22
            }}
          >

            <div
              style={{
                display: 'flex',
                gap: 12,
                marginBottom: 16
              }}
            >

              <div
                className="avatar"
                style={{
                  width: 52,
                  height: 52,
                  fontSize: '1rem'
                }}
              >
                {advocateInitials}
              </div>

              <div>

                <div
                  style={{
                    fontWeight: 700,
                    color: 'var(--text)',
                    fontSize: '0.95rem'
                  }}
                >
                  Adv. {advocateName}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    marginTop: 3
                  }}
                >

                  <Award
                    size={11}
                    style={{
                      color:
                        'var(--emerald)'
                    }}
                  />

                  <span
                    style={{
                      fontSize:
                        '0.7rem',
                      color:
                        'var(--emerald)',
                      fontWeight: 600
                    }}
                  >
                    Registered Advocate
                  </span>

                </div>

              </div>

            </div>

            <div
              style={{
                fontSize: '0.8rem',
                color:
                  'var(--text-muted)',
                marginBottom: 14
              }}
            >
              {advocateSpecialization} ·{' '}
              {advocateCity}
            </div>

            <div
              style={{
                display: 'flex',
                gap: 12,
                marginBottom: 14
              }}
            >

              <div
                style={{
                  textAlign: 'center',
                  flex: 1
                }}
              >

                <div
                  style={{
                    display: 'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                    gap: 3
                  }}
                >

                  <Star
                    size={12}
                    style={{
                      color:
                        '#F59E0B'
                    }}
                    fill="#F59E0B"
                  />

                  <span
                    style={{
                      fontWeight: 700,
                      color:
                        'var(--text)',
                      fontSize:
                        '0.875rem'
                    }}
                  >
                    New
                  </span>

                </div>

                <div
                  style={{
                    fontSize:
                      '0.65rem',
                    color:
                      'var(--text-muted)'
                  }}
                >
                  No reviews
                </div>

              </div>

              <div
                style={{
                  width: 1,
                  background:
                    'var(--border)'
                }}
              />

              <div
                style={{
                  textAlign: 'center',
                  flex: 1
                }}
              >

                <div
                  style={{
                    fontWeight: 700,
                    color:
                      'var(--text)',
                    fontSize:
                      '0.875rem'
                  }}
                >
                  —
                </div>

                <div
                  style={{
                    fontSize:
                      '0.65rem',
                    color:
                      'var(--text-muted)'
                  }}
                >
                  experience
                </div>

              </div>

              <div
                style={{
                  width: 1,
                  background:
                    'var(--border)'
                }}
              />

              <div
                style={{
                  textAlign: 'center',
                  flex: 1
                }}
              >

                <div
                  style={{
                    fontWeight: 700,
                    color:
                      'var(--text)',
                    fontSize:
                      '0.875rem'
                  }}
                >
                  —
                </div>

                <div
                  style={{
                    fontSize:
                      '0.65rem',
                    color:
                      'var(--text-muted)'
                  }}
                >
                  cases won
                </div>

              </div>

            </div>

            {/* Contact details */}

            {(advocateEmail ||
              advocatePhone) && (
              <div
                style={{
                  borderTop:
                    '1px solid var(--border)',
                  paddingTop: 12,
                  marginTop: 4,
                  fontSize:
                    '0.75rem',
                  color:
                    'var(--text-muted)'
                }}
              >

                {advocateEmail && (
                  <div
                    style={{
                      marginBottom: 4
                    }}
                  >
                    Email:{' '}
                    <strong
                      style={{
                        color:
                          'var(--text)'
                      }}
                    >
                      {advocateEmail}
                    </strong>
                  </div>
                )}

                {advocatePhone && (
                  <div>
                    Phone:{' '}
                    <strong
                      style={{
                        color:
                          'var(--text)'
                      }}
                    >
                      {advocatePhone}
                    </strong>
                  </div>
                )}

              </div>
            )}

          </div>

          {/* Booking Summary */}

          <div
            className="card"
            style={{
              padding: 20
            }}
          >

            <h3
              style={{
                fontWeight: 700,
                color: 'var(--text)',
                fontSize: '0.9rem',
                marginBottom: 14
              }}
            >
              Booking Summary
            </h3>

            <div
              style={{
                display: 'flex',
                flexDirection:
                  'column',
                gap: 8,
                marginBottom: 16
              }}
            >

              {[
                [
                  'Advocate',
                  `Adv. ${advocateName}`
                ],

                [
                  'Date',
                  selectedDay
                    ? `${selectedDay} ${months[month]} ${year}`
                    : '—'
                ],

                [
                  'Time',
                  selectedTime || '—'
                ],

                [
                  'Mode',
                  mode === 'video'
                    ? 'Video Call'
                    : 'In-Person'
                ],

                [
                  'Duration',
                  '60 minutes'
                ],

                [
                  'Consultation Fee',
                  `₹${consultationFee.toLocaleString()}`
                ],

                [
                  'Platform Fee (5%)',
                  `₹${platformFee.toLocaleString()}`
                ]

              ].map(
                ([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      fontSize:
                        '0.84rem',
                      gap: 12
                    }}
                  >

                    <span
                      style={{
                        color:
                          'var(--text-muted)'
                      }}
                    >
                      {k}
                    </span>

                    <span
                      style={{
                        fontWeight: 500,
                        color:
                          'var(--text)',
                        textAlign:
                          'right'
                      }}
                    >
                      {v}
                    </span>

                  </div>
                )
              )}

            </div>

            <div
              style={{
                height: 1,
                background:
                  'var(--border)',
                margin: '14px 0'
              }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                marginBottom: 20
              }}
            >

              <span
                style={{
                  fontWeight: 700,
                  color:
                    'var(--text)'
                }}
              >
                Total
              </span>

              <span
                style={{
                  fontWeight: 800,
                  fontSize: '1.2rem',
                  color:
                    'var(--text)'
                }}
              >
                ₹{totalFee.toLocaleString()}
              </span>

            </div>

            {/* =================================================
                BOOKING BUTTON
            ================================================= */}

            <button
              onClick={handleBooking}
              disabled={
                !selectedDay ||
                !selectedTime ||
                !selectedDay ||
                !isSlotAvailable(selectedDay, selectedTime) ||
                bookingLoading
              }
              className="btn-primary"
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: 10,
                border: 'none',
                cursor:
                  selectedDay &&
                  selectedTime &&
                  isSlotAvailable(selectedDay, selectedTime) &&
                  !bookingLoading
                    ? 'pointer'
                    : 'not-allowed',
                fontWeight: 700,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'center',
                gap: 8,
                opacity:
                  selectedDay &&
                  selectedTime &&
                  isSlotAvailable(selectedDay, selectedTime) &&
                  !bookingLoading
                    ? 1
                    : 0.5
              }}
            >
              {bookingLoading
                ? 'Sending Request...'
                : 'Send Booking Request'}
            </button>

            <p
              style={{
                textAlign: 'center',
                fontSize: '0.72rem',
                color:
                  'var(--text-muted)',
                marginTop: 10
              }}
            >
              Your request will be sent to the advocate for approval. No payment is processed at this stage.
            </p>

          </div>

        </div>

      </div>

      <style>{`
        @media (max-width: 900px) {
          .booking-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </div>
  )
}