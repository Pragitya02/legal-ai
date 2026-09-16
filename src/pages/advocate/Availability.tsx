import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Info,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'

type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

type ScheduleDay = {
  enabled: boolean
  start: string
  end: string
}

type TimeBlock = {
  id: string
  start: string
  end: string
  reason: string
}

const dayOrder: { key: DayKey; label: string; short: string }[] = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
]

const defaultSchedule: Record<DayKey, ScheduleDay> = {
  monday: { enabled: true, start: '09:00', end: '17:00' },
  tuesday: { enabled: true, start: '09:00', end: '17:00' },
  wednesday: { enabled: true, start: '09:00', end: '17:00' },
  thursday: { enabled: true, start: '09:00', end: '17:00' },
  friday: { enabled: true, start: '09:00', end: '17:00' },
  saturday: { enabled: false, start: '10:00', end: '14:00' },
  sunday: { enabled: false, start: '10:00', end: '14:00' },
}

const pad = (n: number) => String(n).padStart(2, '0')

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const monthLabel = (date: Date) =>
  date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

const prettyTime = (value: string) => {
  const [h, m] = value.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${pad(m)} ${suffix}`
}

const cloneSchedule = (value: Record<DayKey, ScheduleDay>) =>
  JSON.parse(JSON.stringify(value)) as Record<DayKey, ScheduleDay>

export default function AdvocateAvailability() {
  const today = new Date()
  const [month, setMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [selectedDate, setSelectedDate] = useState(dateKey(today))
  const [schedule, setSchedule] = useState(cloneSchedule(defaultSchedule))
  const [blocks, setBlocks] = useState<Record<string, TimeBlock[]>>({})
  const [blockModalOpen, setBlockModalOpen] = useState(false)
  const [fullDayOff, setFullDayOff] = useState<Record<string, boolean>>({})
  const [newBlock, setNewBlock] = useState({
    start: '16:00',
    end: '17:00',
    reason: '',
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')
  const [blockSaving, setBlockSaving] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

  const authHeaders = () => {
    return {
      'Content-Type': 'application/json',
    }
  }

  const loadAvailability = async (targetMonth: Date, showLoading = true) => {
    if (showLoading) setLoading(true)
    setApiError('')

    try {
      const monthValue = `${targetMonth.getFullYear()}-${pad(
        targetMonth.getMonth() + 1,
      )}`

      const response = await fetch(
        `${API_URL}/api/availability?month=${monthValue}`,
        {
          credentials: 'include',
          headers: authHeaders(),
        },
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load availability.')
      }

      if (Array.isArray(data.availability)) {
        setSchedule((current) => {
          const next = cloneSchedule(current)

          for (const row of data.availability) {
            const index = Number(row.day_of_week) - 1
            if (index >= 0 && index < dayOrder.length) {
              const key = dayOrder[index].key
              next[key] = {
                enabled: Boolean(row.is_available),
                start: String(row.start_time || '09:00').slice(0, 5),
                end: String(row.end_time || '17:00').slice(0, 5),
              }
            }
          }

          return next
        })
      }

      const nextBlocks: Record<string, TimeBlock[]> = {}

      for (const row of Array.isArray(data.blocks) ? data.blocks : []) {
        const key = row.block_date
        if (!key) continue

        if (row.block_type === 'full_day') {
          setFullDayOff((current) => ({
            ...current,
            [key]: true,
          }))
          if (!nextBlocks[key]) nextBlocks[key] = []
          nextBlocks[key].push({
            id: String(row.id),
            start: '',
            end: '',
            reason: row.reason || 'Full day off',
          })
        } else {
          if (!nextBlocks[key]) nextBlocks[key] = []
          nextBlocks[key].push({
            id: String(row.id),
            start: String(row.start_time || '').slice(0, 5),
            end: String(row.end_time || '').slice(0, 5),
            reason: row.reason || 'Unavailable',
          })
        }
      }

      setBlocks((current) => {
        const merged = { ...current }
        for (const key of Object.keys(nextBlocks)) {
          merged[key] = nextBlocks[key]
        }
        return merged
      })
    } catch (error: any) {
      console.error('LOAD AVAILABILITY ERROR:', error)
      setApiError(error?.message || 'Failed to load availability.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    loadAvailability(month)
  }, [month])

  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate()

  const firstDay = new Date(
    month.getFullYear(),
    month.getMonth(),
    1,
  ).getDay()

  const calendarCells = useMemo(() => {
    const cells: (Date | null)[] = []
    const mondayOffset = firstDay === 0 ? 6 : firstDay - 1

    for (let i = 0; i < mondayOffset; i += 1) cells.push(null)

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(month.getFullYear(), month.getMonth(), day))
    }

    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [daysInMonth, firstDay, month])

  const selected = new Date(`${selectedDate}T12:00:00`)
  const selectedDayIndex = (selected.getDay() + 6) % 7
  const selectedDay = dayOrder[selectedDayIndex]
  const selectedSchedule = schedule[selectedDay.key]
  const selectedBlocks = blocks[selectedDate] || []
  const isDayOff = Boolean(fullDayOff[selectedDate])

  const goMonth = (delta: number) => {
    setMonth(
      new Date(month.getFullYear(), month.getMonth() + delta, 1),
    )
  }

  const chooseDate = (date: Date) => {
    setSelectedDate(dateKey(date))
    setSaved(false)
  }

  const toggleDay = (key: DayKey) => {
    setSchedule((current) => ({
      ...current,
      [key]: {
        ...current[key],
        enabled: !current[key].enabled,
      },
    }))
    setSaved(false)
  }

  const updateDay = (
    key: DayKey,
    field: 'start' | 'end',
    value: string,
  ) => {
    setSchedule((current) => ({
      ...current,
      [key]: {
        ...current[key],
        [field]: value,
      },
    }))
    setSaved(false)
  }

  const copyPreviousMonth = async () => {
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  const toggleFullDayOff = async () => {
    const currentlyOff = Boolean(fullDayOff[selectedDate])

    setBlockSaving(true)
    setApiError('')

    try {
      if (currentlyOff) {
        const fullDayBlock = selectedBlocks.find(
          (item) => item.id && item.start === '' && item.end === '',
        )

        if (fullDayBlock) {
          const response = await fetch(
            `${API_URL}/api/availability/blocks/${fullDayBlock.id}`,
            {
              method: 'DELETE',
              credentials: 'include',
              headers: authHeaders(),
            },
          )
          const data = await response.json()

          if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to remove full day off.')
          }
        } else {
          await loadAvailability(month, false)
        }

        setFullDayOff((current) => ({
          ...current,
          [selectedDate]: false,
        }))
      } else {
        const response = await fetch(`${API_URL}/api/availability/blocks`, {
          method: 'POST',
          credentials: 'include',
          headers: authHeaders(),
          body: JSON.stringify({
            blockDate: selectedDate,
            blockType: 'full_day',
            reason: 'Full day off',
          }),
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to mark full day off.')
        }

        setFullDayOff((current) => ({
          ...current,
          [selectedDate]: true,
        }))
      }

      setSaved(false)
    } catch (error: any) {
      console.error('FULL DAY OFF ERROR:', error)
      setApiError(error?.message || 'Failed to update full day off.')
    } finally {
      setBlockSaving(false)
    }
  }

  const addBlock = async () => {
    if (!newBlock.start || !newBlock.end || newBlock.start >= newBlock.end) {
      return
    }

    setBlockSaving(true)
    setApiError('')

    try {
      const response = await fetch(`${API_URL}/api/availability/blocks`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
        body: JSON.stringify({
          blockDate: selectedDate,
          startTime: newBlock.start,
          endTime: newBlock.end,
          blockType: 'time_block',
          reason: newBlock.reason.trim() || 'Unavailable',
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to add time block.')
      }

      const row = data.block

      setBlocks((current) => ({
        ...current,
        [selectedDate]: [
          ...(current[selectedDate] || []),
          {
            id: String(row.id),
            start: String(row.start_time || newBlock.start).slice(0, 5),
            end: String(row.end_time || newBlock.end).slice(0, 5),
            reason: row.reason || newBlock.reason.trim() || 'Unavailable',
          },
        ],
      }))

      setBlockModalOpen(false)
      setNewBlock({ start: '16:00', end: '17:00', reason: '' })
      setSaved(false)
    } catch (error: any) {
      console.error('ADD BLOCK ERROR:', error)
      setApiError(error?.message || 'Failed to add time block.')
    } finally {
      setBlockSaving(false)
    }
  }


  const removeBlock = async (id: string) => {
    setBlockSaving(true)
    setApiError('')

    try {
      const response = await fetch(
        `${API_URL}/api/availability/blocks/${id}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: authHeaders(),
        },
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to remove time block.')
      }

      setBlocks((current) => ({
        ...current,
        [selectedDate]: (current[selectedDate] || []).filter(
          (item) => item.id !== id,
        ),
      }))
      setSaved(false)
    } catch (error: any) {
      console.error('REMOVE BLOCK ERROR:', error)
      setApiError(error?.message || 'Failed to remove time block.')
    } finally {
      setBlockSaving(false)
    }
  }


  const saveAvailability = async () => {
    setSaving(true)
    setApiError('')

    try {
      const availability = dayOrder.map((day, index) => ({
        dayOfWeek: index + 1,
        startTime: schedule[day.key].start,
        endTime: schedule[day.key].end,
        isAvailable: schedule[day.key].enabled,
      }))

      const response = await fetch(`${API_URL}/api/availability`, {
        method: 'PUT',
        credentials: 'include',
        headers: authHeaders(),
        body: JSON.stringify({ availability }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to save availability.')
      }

      setSaved(true)
      window.setTimeout(() => setSaved(false), 3000)
    } catch (error: any) {
      console.error('SAVE AVAILABILITY ERROR:', error)
      setApiError(error?.message || 'Failed to save availability.')
    } finally {
      setSaving(false)
    }
  }

  const isSameDay = (a: Date, b: Date) =>
    dateKey(a) === dateKey(b)

  const selectedLabel = selected.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          alignItems: 'flex-start',
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 7,
            }}
          >
            <CalendarDays size={22} color="var(--blue)" />
            <h1
              style={{
                margin: 0,
                fontSize: '1.65rem',
                fontWeight: 800,
                color: 'var(--text)',
              }}
            >
              Availability & Timetable
            </h1>
          </div>
          <p
            style={{
              margin: 0,
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              maxWidth: 720,
            }}
          >
            Set your working hours, mark days off, and block specific time
            slots when you are unavailable.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={copyPreviousMonth}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <Copy size={15} />
            Copy Previous Month
          </button>
          <button
            type="button"
            onClick={saveAvailability}
            disabled={saving}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <Save size={15} />
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Availability'}
          </button>
        </div>
      </div>

      {apiError && (
        <div
          style={{
            marginBottom: 14,
            padding: '10px 12px',
            borderRadius: 9,
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            color: 'var(--text)',
            fontSize: '0.8rem',
          }}
        >
          {apiError}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: 9,
          alignItems: 'flex-start',
          padding: '12px 14px',
          borderRadius: 10,
          background: 'var(--blue-subtle)',
          border: '1px solid var(--blue-light)',
          marginBottom: 22,
          color: 'var(--text-muted)',
          fontSize: '0.82rem',
        }}
      >
        <Info size={16} color="var(--blue)" style={{ flexShrink: 0 }} />
        <span>
          Availability is now saved to your advocate account. Booking
          integration is still kept separate for the next stage.
          {loading ? ' Loading your saved schedule...' : ''}
        </span>
      </div>

      <section
        className="card"
        style={{ padding: 20, marginBottom: 22 }}
      >
        <div style={{ marginBottom: 16 }}>
          <h2
            style={{
              margin: 0,
              color: 'var(--text)',
              fontSize: '1.05rem',
              fontWeight: 750,
            }}
          >
            Weekly working schedule
          </h2>
          <p
            style={{
              margin: '5px 0 0',
              color: 'var(--text-muted)',
              fontSize: '0.78rem',
            }}
          >
            Choose which days you normally accept consultations and set their
            hours.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gap: 9,
          }}
        >
          {dayOrder.map((day) => {
            const item = schedule[day.key]

            return (
              <div
                key={day.key}
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'minmax(130px, 1fr) minmax(95px, 110px) minmax(150px, 1fr) minmax(150px, 1fr)',
                  gap: 12,
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                }}
              >
                <div
                  style={{
                    fontWeight: 650,
                    color: 'var(--text)',
                  }}
                >
                  {day.label}
                </div>

                <button
                  type="button"
                  onClick={() => toggleDay(day.key)}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 999,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    background: item.enabled
                      ? 'var(--emerald-subtle)'
                      : 'var(--bg-card)',
                    color: item.enabled
                      ? 'var(--emerald)'
                      : 'var(--text-muted)',
                  }}
                >
                  {item.enabled ? 'Working' : 'OFF'}
                </button>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    color: item.enabled
                      ? 'var(--text)'
                      : 'var(--text-subtle)',
                    fontSize: '0.8rem',
                  }}
                >
                  <Clock3 size={15} />
                  <span>From</span>
                  <input
                    type="time"
                    value={item.start}
                    disabled={!item.enabled}
                    onChange={(e) =>
                      updateDay(day.key, 'start', e.target.value)
                    }
                    className="input"
                    style={{ height: 34, minWidth: 0 }}
                  />
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    color: item.enabled
                      ? 'var(--text)'
                      : 'var(--text-subtle)',
                    fontSize: '0.8rem',
                  }}
                >
                  <span>To</span>
                  <input
                    type="time"
                    value={item.end}
                    disabled={!item.enabled}
                    onChange={(e) =>
                      updateDay(day.key, 'end', e.target.value)
                    }
                    className="input"
                    style={{ height: 34, minWidth: 0 }}
                  />
                </label>
              </div>
            )
          })}
        </div>
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.25fr) minmax(300px, 0.75fr)',
          gap: 22,
          alignItems: 'start',
        }}
      >
        <section className="card" style={{ padding: 20 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 18,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.05rem',
                  fontWeight: 750,
                  color: 'var(--text)',
                }}
              >
                Monthly calendar
              </h2>
              <p
                style={{
                  margin: '5px 0 0',
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                }}
              >
                Select a date to manage exceptions.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <button
                type="button"
                onClick={() => goMonth(-1)}
                className="btn btn-secondary"
                style={{ width: 34, height: 34, padding: 0 }}
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <strong
                style={{
                  minWidth: 135,
                  textAlign: 'center',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                }}
              >
                {monthLabel(month)}
              </strong>
              <button
                type="button"
                onClick={() => goMonth(1)}
                className="btn btn-secondary"
                style={{ width: 34, height: 34, padding: 0 }}
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: 6,
              marginBottom: 6,
            }}
          >
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
              (label) => (
                <div
                  key={label}
                  style={{
                    textAlign: 'center',
                    color: 'var(--text-subtle)',
                    fontSize: '0.68rem',
                    fontWeight: 750,
                    padding: '5px 0',
                  }}
                >
                  {label}
                </div>
              ),
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: 6,
            }}
          >
            {calendarCells.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} style={{ minHeight: 62 }} />
              }

              const key = dateKey(date)
              const dayIdx = (date.getDay() + 6) % 7
              const working = schedule[dayOrder[dayIdx].key].enabled
              const blocked = Boolean(fullDayOff[key]) || (blocks[key] || []).length > 0
              const active = key === selectedDate
              const todayCell = isSameDay(date, today)

              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => chooseDate(date)}
                  style={{
                    minHeight: 62,
                    borderRadius: 9,
                    border: active
                      ? '2px solid var(--blue)'
                      : '1px solid var(--border)',
                    background: fullDayOff[key]
                      ? 'var(--bg-secondary)'
                      : 'var(--bg-card)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: 8,
                    position: 'relative',
                    color: 'var(--text)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: todayCell ? 800 : 650,
                    }}
                  >
                    {date.getDate()}
                  </div>
                  <div
                    style={{
                      marginTop: 7,
                      fontSize: '0.61rem',
                      fontWeight: 700,
                      color: fullDayOff[key]
                        ? 'var(--text-muted)'
                        : blocked
                          ? 'var(--amber)'
                          : working
                            ? 'var(--emerald)'
                            : 'var(--text-subtle)',
                    }}
                  >
                    {fullDayOff[key]
                      ? 'OFF'
                      : blocked
                        ? 'Blocked'
                        : working
                          ? 'Available'
                          : 'Day off'}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 17 }}>
            <div
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-subtle)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Selected date
            </div>
            <h2
              style={{
                margin: '5px 0 0',
                color: 'var(--text)',
                fontSize: '1.08rem',
                fontWeight: 750,
              }}
            >
              {selectedLabel}
            </h2>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: isDayOff
                ? 'var(--bg-secondary)'
                : 'var(--emerald-subtle)',
              border: '1px solid var(--border)',
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: '0.76rem',
                fontWeight: 750,
                color: 'var(--text)',
                marginBottom: 4,
              }}
            >
              Normal weekly hours
            </div>
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.78rem',
              }}
            >
              {selectedSchedule.enabled
                ? `${prettyTime(selectedSchedule.start)} – ${prettyTime(
                    selectedSchedule.end,
                  )}`
                : 'This weekday is normally OFF'}
            </div>
          </div>

          <button
            type="button"
            onClick={toggleFullDayOff}
            disabled={blockSaving}
            className="btn btn-secondary"
            style={{
              width: '100%',
              marginBottom: 16,
              fontWeight: 700,
            }}
          >
            {isDayOff ? 'Remove Full Day OFF' : 'Mark Full Day OFF'}
          </button>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <div>
              <div
                style={{
                  color: 'var(--text)',
                  fontWeight: 750,
                  fontSize: '0.86rem',
                }}
              >
                Blocked time
              </div>
              <div
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.72rem',
                  marginTop: 3,
                }}
              >
                These periods will be unavailable.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBlockModalOpen(true)}
              disabled={blockSaving}
              className="btn btn-primary"
              style={{
                padding: '7px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Plus size={14} />
              Block Time
            </button>
          </div>

          {selectedBlocks.length === 0 ? (
            <div
              style={{
                padding: 14,
                border: '1px dashed var(--border)',
                borderRadius: 9,
                color: 'var(--text-muted)',
                fontSize: '0.76rem',
              }}
            >
              No specific time blocks for this date.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {selectedBlocks
                .filter((block) => block.start && block.end)
                .map((block) => (
                <div
                  key={block.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    padding: 10,
                    borderRadius: 9,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-secondary)',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        color: 'var(--text)',
                      }}
                    >
                      {prettyTime(block.start)} – {prettyTime(block.end)}
                    </div>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        marginTop: 2,
                      }}
                    >
                      {block.reason}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBlock(block.id)}
                    aria-label="Remove blocked time"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 7,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                ))}
            </div>
          )}
        </section>
      </div>

      {blockModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setBlockModalOpen(false)
            }
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 430,
              padding: 22,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 18,
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    color: 'var(--text)',
                    fontSize: '1rem',
                  }}
                >
                  Block time
                </h3>
                <p
                  style={{
                    margin: '4px 0 0',
                    color: 'var(--text-muted)',
                    fontSize: '0.74rem',
                  }}
                >
                  {selectedLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBlockModalOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginBottom: 13,
              }}
            >
              <label style={{ color: 'var(--text)', fontSize: '0.76rem' }}>
                Start
                <input
                  className="input"
                  type="time"
                  value={newBlock.start}
                  onChange={(e) =>
                    setNewBlock((current) => ({
                      ...current,
                      start: e.target.value,
                    }))
                  }
                  style={{ marginTop: 5 }}
                />
              </label>

              <label style={{ color: 'var(--text)', fontSize: '0.76rem' }}>
                End
                <input
                  className="input"
                  type="time"
                  value={newBlock.end}
                  onChange={(e) =>
                    setNewBlock((current) => ({
                      ...current,
                      end: e.target.value,
                    }))
                  }
                  style={{ marginTop: 5 }}
                />
              </label>
            </div>

            <label
              style={{
                display: 'block',
                color: 'var(--text)',
                fontSize: '0.76rem',
                marginBottom: 18,
              }}
            >
              Reason (optional)
              <input
                className="input"
                value={newBlock.reason}
                onChange={(e) =>
                  setNewBlock((current) => ({
                    ...current,
                    reason: e.target.value,
                  }))
                }
                placeholder="e.g. Personal appointment"
                style={{ marginTop: 5 }}
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => setBlockModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addBlock}
                disabled={blockSaving}
                className="btn btn-primary"
              >
                {blockSaving ? 'Adding...' : 'Add Block'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 22,
          padding: 14,
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          color: 'var(--text-muted)',
          fontSize: '0.76rem',
        }}
      >
        <strong style={{ color: 'var(--text)' }}>Current stage:</strong>{' '}
        your weekly schedule and date-specific blocks are persisted for your
        advocate account. Citizen booking will use these rules in the next
        stage.
      </div>
    </div>
  )
}
