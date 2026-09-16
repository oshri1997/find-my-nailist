'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, AlertCircle, Clock, CopyCheck, Plus, X } from 'lucide-react'
import { addDays, todayInIsrael } from '@/lib/booking-utils'
import { getIsraeliChag } from '@/lib/holiday-availability'
import { validateIntervals, type TimeInterval } from '@/lib/availability-intervals'
import { useInvalidateNailistProfile, useNailistProfile } from '@/lib/hooks/use-nailist-profile'

const DAYS = [
  { day: 0, label: 'ראשון', short: 'א׳', weekend: false },
  { day: 1, label: 'שני', short: 'ב׳', weekend: false },
  { day: 2, label: 'שלישי', short: 'ג׳', weekend: false },
  { day: 3, label: 'רביעי', short: 'ד׳', weekend: false },
  { day: 4, label: 'חמישי', short: 'ה׳', weekend: false },
  { day: 5, label: 'שישי', short: 'ו׳', weekend: true },
  { day: 6, label: 'שבת', short: 'ש׳', weekend: true },
]

const PRESETS = [
  { label: 'א׳ – ה׳', days: [0, 1, 2, 3, 4], start: '09:00', end: '19:00' },
  { label: 'א׳ – ו׳', days: [0, 1, 2, 3, 4, 5], start: '09:00', end: '18:00' },
  { label: 'ב׳ – ו׳', days: [1, 2, 3, 4, 5], start: '09:00', end: '18:00' },
]

const TIME_OPTIONS: string[] = []
for (let h = 7; h <= 23; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`)
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`)
}
const LAST_TIME_OPTION = TIME_OPTIONS[TIME_OPTIONS.length - 1]

interface DayHours {
  dayOfWeek: number
  isActive: boolean
  intervals: TimeInterval[]
}

interface DateOverride {
  date: string
  mode: 'OPEN' | 'CLOSED'
  startTime?: string
  endTime?: string
  intervals?: TimeInterval[]
}

// Server payload shape for a working-hours day: intervals[] is the source of
// truth going forward; startTime/endTime stay a best-effort legacy mirror
// (the single window when there's exactly one interval, or the enclosing
// span of the whole day otherwise) for old-client/rollback compatibility —
// see the API route and availability-intervals.ts for the full precedence.
interface WorkingHoursPayloadItem {
  dayOfWeek: number
  isActive: boolean
  startTime: string
  endTime: string
  intervals: TimeInterval[]
}

const DEFAULT_HOURS: DayHours[] = DAYS.map(({ day }) => ({
  dayOfWeek: day,
  isActive: day <= 4,
  intervals: [{ start: '09:00', end: '19:00' }],
}))

// Fetched working-hours docs may still be in the legacy shape (no intervals
// field, or an empty one) — fall back to the startTime/endTime pair exactly
// like normalizeDayAvailability does, except a malformed/missing legacy pair
// falls back to a single default window rather than an empty list, since the
// editor always needs at least one row to show and edit (even for a
// currently-closed day, so her previously-configured hours aren't lost the
// moment she re-opens it — matching the pre-existing behavior of keeping
// stale startTime/endTime around while isActive is false).
function intervalsFromFetched(fetched: { startTime?: string; endTime?: string; intervals?: TimeInterval[] }): TimeInterval[] {
  if (Array.isArray(fetched.intervals) && fetched.intervals.length > 0 && !validateIntervals(fetched.intervals)) {
    return fetched.intervals
  }
  if (fetched.startTime && fetched.endTime && fetched.startTime < fetched.endTime) {
    return [{ start: fetched.startTime, end: fetched.endTime }]
  }
  return [{ start: '09:00', end: '19:00' }]
}

function toWorkingHoursPayload(h: DayHours): WorkingHoursPayloadItem {
  return {
    dayOfWeek: h.dayOfWeek,
    isActive: h.isActive,
    startTime: h.intervals[0]?.start ?? '09:00',
    endTime: h.intervals[h.intervals.length - 1]?.end ?? '19:00',
    intervals: h.intervals,
  }
}

function overrideIntervals(o: DateOverride): TimeInterval[] {
  if (o.intervals && o.intervals.length > 0) return o.intervals
  return [{ start: o.startTime ?? '09:00', end: o.endTime ?? '19:00' }]
}

// Mirrors toWorkingHoursPayload's precedence for a date override: intervals
// only travels on the wire when there's more than one window, so a plain
// single-window override keeps sending the exact legacy {date, mode,
// startTime, endTime} shape unchanged.
function buildOverridePayload(override: DateOverride): Record<string, unknown> {
  if (override.mode === 'CLOSED') return { date: override.date, mode: 'CLOSED' }
  const list = overrideIntervals(override)
  const base = { date: override.date, mode: 'OPEN', startTime: list[0].start, endTime: list[list.length - 1].end }
  return list.length > 1 ? { ...base, intervals: list } : base
}

function formatHolidayDate(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

function TimeSelect({ value, onChange, min, max, label }: { value: string; onChange: (v: string) => void; min?: string; max?: string; label?: string }) {
  let options = TIME_OPTIONS
  if (min) options = options.filter(t => t > min)
  if (max) options = options.filter(t => t < max)
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label={label}
      className="h-9 rounded-xl border border-border bg-card px-2 text-sm font-semibold text-foreground focus:outline-none focus:border-primary cursor-pointer"
    >
      {options.map(t => <option key={t} value={t}>{t}</option>)}
    </select>
  )
}

// Bumps a start time forward past its own end time to the next available
// grid option, exactly like the previous single-window editor did — shared
// by the per-day interval editor, the bulk "uniform hours" control and the
// date-override editor so all three auto-bump identically.
function bumpedInterval(interval: TimeInterval, field: 'start' | 'end', value: string): TimeInterval {
  if (field === 'start' && value >= interval.end) {
    const next = TIME_OPTIONS.find(t => t > value)
    return { start: value, end: next ?? value }
  }
  return { ...interval, [field]: value }
}

export default function WorkingHoursPage() {
  const [hours, setHours] = useState<DayHours[]>(DEFAULT_HOURS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [bulkStart, setBulkStart] = useState('09:00')
  const [bulkEnd, setBulkEnd] = useState('19:00')
  const [autoCloseHolidays, setAutoCloseHolidays] = useState(true)
  const [overrides, setOverrides] = useState<Record<string, DateOverride>>({})
  const [savingHoliday, setSavingHoliday] = useState<string | null>(null)

  const { data: profile } = useNailistProfile()
  const invalidateProfile = useInvalidateNailistProfile()
  const profileId = profile?.id ?? null

  useEffect(() => {
    Promise.all([
      fetch('/api/working-hours'), fetch('/api/availability-overrides'),
    ]).then(async ([hoursRes, overridesRes]) => {
      if (hoursRes.ok) {
        const { data } = await hoursRes.json()
        if (data?.length) setHours((prev) => prev.map((def) => {
          const fetched = (data as Array<{ dayOfWeek: number; isActive: boolean; startTime?: string; endTime?: string; intervals?: TimeInterval[] }>)
            .find((d) => d.dayOfWeek === def.dayOfWeek)
          if (!fetched) return def
          return { dayOfWeek: def.dayOfWeek, isActive: fetched.isActive, intervals: intervalsFromFetched(fetched) }
        }))
      }
      if (overridesRes.ok) {
        const { data } = await overridesRes.json()
        setOverrides(Object.fromEntries((data as DateOverride[]).map((item) => [item.date, item])))
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!profile) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutoCloseHolidays(profile.autoCloseHolidays !== false)
  }, [profile])

  async function saveHolidayPreference(value: boolean) {
    if (!profileId) return
    setSavingHoliday('preference')
    try {
      const res = await fetch(`/api/nailists/${profileId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoCloseHolidays: value }),
      })
      if (!res.ok) throw new Error()
      setAutoCloseHolidays(value)
      await invalidateProfile()
    } catch {
      setError('שגיאה בשמירת הגדרת החגים — נסי שוב')
    } finally { setSavingHoliday(null) }
  }

  async function saveOverride(override: DateOverride | null, date: string) {
    setSavingHoliday(date)
    try {
      const res = await fetch(override ? '/api/availability-overrides' : `/api/availability-overrides?date=${date}`, {
        method: override ? 'PUT' : 'DELETE',
        headers: override ? { 'Content-Type': 'application/json' } : undefined,
        body: override ? JSON.stringify(buildOverridePayload(override)) : undefined,
      })
      if (!res.ok) throw new Error()
      setOverrides(prev => {
        const next = { ...prev }
        if (override) next[date] = override
        else delete next[date]
        return next
      })
    } catch {
      setError('שגיאה בשמירת החריגה — נסי שוב')
    } finally { setSavingHoliday(null) }
  }

  function setOverrideIntervalTime(date: string, idx: number, field: 'start' | 'end', value: string) {
    setOverrides(prev => {
      const current = prev[date]
      if (!current) return prev
      const list = overrideIntervals(current).map((iv, i) => i === idx ? bumpedInterval(iv, field, value) : iv)
      return { ...prev, [date]: { date, mode: 'OPEN', intervals: list } }
    })
  }

  function addOverrideInterval(date: string) {
    setOverrides(prev => {
      const current = prev[date]
      if (!current) return prev
      const list = overrideIntervals(current)
      const last = list[list.length - 1]
      const newStart = last.end
      const newEnd = TIME_OPTIONS.find(t => t > newStart) ?? newStart
      return { ...prev, [date]: { date, mode: 'OPEN', intervals: [...list, { start: newStart, end: newEnd }] } }
    })
  }

  function removeOverrideInterval(date: string, idx: number) {
    setOverrides(prev => {
      const current = prev[date]
      if (!current) return prev
      const list = overrideIntervals(current).filter((_, i) => i !== idx)
      if (list.length === 0) return prev
      return { ...prev, [date]: { date, mode: 'OPEN', intervals: list } }
    })
  }

  function toggle(day: number) {
    setHours(prev => prev.map(h => h.dayOfWeek === day ? { ...h, isActive: !h.isActive } : h))
  }

  function setIntervalTime(day: number, idx: number, field: 'start' | 'end', value: string) {
    setHours(prev => prev.map(h => {
      if (h.dayOfWeek !== day) return h
      return { ...h, intervals: h.intervals.map((iv, i) => i === idx ? bumpedInterval(iv, field, value) : iv) }
    }))
  }

  function addInterval(day: number) {
    setHours(prev => prev.map(h => {
      if (h.dayOfWeek !== day) return h
      const last = h.intervals[h.intervals.length - 1]
      const newStart = last?.end ?? '09:00'
      const newEnd = TIME_OPTIONS.find(t => t > newStart) ?? newStart
      return { ...h, intervals: [...h.intervals, { start: newStart, end: newEnd }] }
    }))
  }

  function removeInterval(day: number, idx: number) {
    setHours(prev => prev.map(h => {
      if (h.dayOfWeek !== day || h.intervals.length <= 1) return h
      return { ...h, intervals: h.intervals.filter((_, i) => i !== idx) }
    }))
  }

  function setBulkStartTime(value: string) {
    if (value >= bulkEnd) {
      // Same backwards-range guard as the per-day selects.
      const next = TIME_OPTIONS.find(t => t > value)
      setBulkStart(value)
      setBulkEnd(next ?? value)
    } else {
      setBulkStart(value)
    }
  }

  function applyBulkTimes() {
    // A quick uniform preset always resets every day to one plain window —
    // it's the "start over simply" action, not a merge with split shifts.
    setHours(prev => prev.map(h => ({ ...h, intervals: [{ start: bulkStart, end: bulkEnd }] })))
  }

  function applyPreset(preset: typeof PRESETS[0]) {
    setHours(prev => prev.map(h => ({
      ...h,
      isActive: preset.days.includes(h.dayOfWeek),
      intervals: preset.days.includes(h.dayOfWeek) ? [{ start: preset.start, end: preset.end }] : h.intervals,
    })))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Server-side validation is authoritative, but check client-side first
    // so a mistake shows up immediately instead of after a round trip.
    for (const h of hours) {
      if (!h.isActive) continue
      const validationError = validateIntervals(h.intervals)
      if (validationError) {
        const dayLabel = DAYS.find((d) => d.day === h.dayOfWeek)?.label ?? ''
        setError(`יום ${dayLabel}: ${validationError}`)
        return
      }
    }

    setSaving(true)
    try {
      const res = await fetch('/api/working-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: hours.map(toWorkingHoursPayload) }),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('שגיאה בשמירה — נסי שוב')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3 text-muted-foreground font-medium">
        <Loader2 className="h-5 w-5 animate-spin" />
        טוענת שעות עבודה...
      </div>
    )
  }

  const activeDays = hours.filter(h => h.isActive).length
  const upcomingHolidays = Array.from({ length: 370 }, (_, index) => {
    const date = addDays(todayInIsrael(), index)
    return getIsraeliChag(date)
  }).filter((holiday): holiday is NonNullable<typeof holiday> => holiday !== null).slice(0, 8)

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-foreground mb-1">שעות עבודה</h1>
        <p className="text-muted-foreground font-medium">הגדירי את הימים והשעות שאת זמינה ללקוחות</p>
      </motion.div>

      <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4 mb-5 space-y-4">
        <label className="flex gap-3 cursor-pointer">
          <input type="checkbox" checked={autoCloseHolidays} disabled={!profileId || savingHoliday === 'preference'}
            onChange={e => saveHolidayPreference(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
          <span>
            <span className="block text-sm font-black text-foreground">סגירה אוטומטית בחגים וביום העצמאות</span>
            <span className="block text-xs text-muted-foreground mt-0.5">חגים מלאים בישראל ויום העצמאות ייסגרו בכל שנה. ערב חג וחול המועד נשארים לפי השעות השבועיות.</span>
          </span>
        </label>
        <div className="border-t border-primary/15 pt-3 space-y-2">
          <p className="text-xs font-black text-muted-foreground">חגים וימים לאומיים קרובים</p>
          {upcomingHolidays.map((holiday) => {
            const override = overrides[holiday.date]
            const open = override?.mode === 'OPEN'
            const displayDate = formatHolidayDate(holiday.date)
            const intervals = open ? overrideIntervals(override) : []
            return <div key={holiday.date} className="rounded-xl bg-card border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold">{holiday.name} · {displayDate}</span>
                <span className="text-xs text-muted-foreground">{override?.mode === 'CLOSED' ? 'סגור ידנית' : open ? 'פתוח בחריגה' : autoCloseHolidays ? 'סגור אוטומטית' : 'לפי שעות שבועיות'}</span>
              </div>
              {open && <div className="mt-2 space-y-2">
                {intervals.map((iv, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <TimeSelect
                      value={iv.start}
                      onChange={v => setOverrideIntervalTime(holiday.date, idx, 'start', v)}
                      max="23:00"
                      label={idx === 0 ? `שעת פתיחה חריגה ${displayDate}` : `שעת פתיחה חריגה ${displayDate} - חלון ${idx + 1}`}
                    />
                    <span className="text-muted-foreground/40 font-bold text-sm">—</span>
                    <TimeSelect
                      value={iv.end}
                      onChange={v => setOverrideIntervalTime(holiday.date, idx, 'end', v)}
                      min={iv.start}
                      label={idx === 0 ? `שעת סיום חריגה ${displayDate}` : `שעת סיום חריגה ${displayDate} - חלון ${idx + 1}`}
                    />
                    {intervals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOverrideInterval(holiday.date, idx)}
                        aria-label={`מחיקת חלון שעות ${idx + 1} — ${displayDate}`}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addOverrideInterval(holiday.date)}
                  className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  <Plus className="h-3 w-3" /> הוספת שעות
                </button>
              </div>}
              <div className="flex gap-2 mt-2 flex-wrap">
                {open ? <Button type="button" size="sm" disabled={savingHoliday === holiday.date} onClick={() => saveOverride(overrides[holiday.date], holiday.date)}>שמרי שעות</Button> : <Button type="button" size="sm" variant="outline" disabled={savingHoliday === holiday.date} onClick={() => saveOverride({ date: holiday.date, mode: 'OPEN', startTime: '09:00', endTime: '19:00' }, holiday.date)}>פתיחה ביום הזה</Button>}
                <Button type="button" size="sm" variant="outline" disabled={savingHoliday === holiday.date} onClick={() => saveOverride({ date: holiday.date, mode: 'CLOSED' }, holiday.date)}>סגירה ביום הזה</Button>
                {override && <Button type="button" size="sm" variant="ghost" disabled={savingHoliday === holiday.date} onClick={() => saveOverride(null, holiday.date)}>החזרה לכלל הרגיל</Button>}
              </div>
            </div>
          })}
        </div>
      </section>

      {/* Quick presets */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/30 dark:to-primary/15 rounded-2xl p-4 mb-5 border border-primary/20 dark:border-primary/50 space-y-4">
        <div>
          <p className="text-xs font-black text-muted-foreground mb-3 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            תבניות מהירות
          </p>
          <div className="flex gap-2 flex-wrap">
            {PRESETS.map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className="px-4 py-1.5 rounded-xl bg-card border border-primary/30 text-sm font-bold text-primary hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-primary/60 dark:border-primary/40">
          <p className="text-xs font-black text-muted-foreground mb-3 flex items-center gap-1.5">
            <CopyCheck className="h-3.5 w-3.5" />
            שעה אחידה לכל הימים
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <TimeSelect value={bulkStart} onChange={setBulkStartTime} max={LAST_TIME_OPTION} label="שעת התחלה כללית" />
            <span className="text-muted-foreground/40 font-bold text-sm">—</span>
            <TimeSelect value={bulkEnd} onChange={setBulkEnd} min={bulkStart} label="שעת סיום כללית" />
            <Button
              type="button"
              onClick={applyBulkTimes}
              size="sm"
              className="bg-gradient-to-r from-primary to-primary/70 hover:from-primary hover:to-primary/80 border-0 rounded-xl font-bold shadow-sm gap-1.5 cursor-pointer"
            >
              <CopyCheck className="h-3.5 w-3.5" />
              החל על כל הימים
            </Button>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSave}>
        {/* Active count badge */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-muted-foreground">
            {activeDays} ימים פעילים מתוך 7
          </p>
          <div className="flex gap-1">
            {DAYS.map(({ day }) => {
              const h = hours.find(x => x.dayOfWeek === day)!
              return (
                <div
                  key={day}
                  className={`w-2 h-2 rounded-full transition-colors ${h.isActive ? 'bg-gradient-to-br from-primary to-primary/70' : 'bg-muted'}`}
                />
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          {DAYS.map(({ day, label, weekend }, i) => {
            const h = hours.find((x) => x.dayOfWeek === day)!
            const totalMinutes = h.intervals.reduce((sum, iv) => {
              const [sh, sm] = iv.start.split(':').map(Number)
              const [eh, em] = iv.end.split(':').map(Number)
              return sum + ((eh * 60 + em) - (sh * 60 + sm))
            }, 0)
            return (
              <motion.div
                key={day}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-2xl border-2 transition-all ${
                  h.isActive
                    ? weekend
                      ? 'bg-primary/10 dark:bg-primary/20 border-primary/30'
                      : 'bg-card border-primary/20 shadow-sm'
                    : 'bg-muted/50 border-border'
                }`}
              >
                <div className="flex items-start gap-3 p-3.5">
                  {/* Toggle */}
                  <button
                    type="button"
                    dir="ltr"
                    onClick={() => toggle(day)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none mt-0.5 ${
                      h.isActive
                        ? weekend ? 'bg-primary/70' : 'bg-primary'
                        : 'bg-muted'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${h.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>

                  {/* Day name */}
                  <span className={`w-14 text-sm font-black shrink-0 mt-1 ${
                    h.isActive
                      ? weekend ? 'text-primary' : 'text-foreground'
                      : 'text-muted-foreground'
                  }`}>
                    {label}
                  </span>

                  {/* Times or closed label */}
                  {h.isActive ? (
                    <div className="flex-1 space-y-2">
                      {h.intervals.map((iv, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <TimeSelect value={iv.start} onChange={v => setIntervalTime(day, idx, 'start', v)} max={LAST_TIME_OPTION} />
                          <span className="text-muted-foreground/40 font-bold text-sm">—</span>
                          <TimeSelect value={iv.end} onChange={v => setIntervalTime(day, idx, 'end', v)} min={iv.start} />
                          {h.intervals.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeInterval(day, idx)}
                              aria-label={`מחיקת חלון שעות ${idx + 1} — ${label}`}
                              className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {idx === h.intervals.length - 1 && (
                            <span className="text-xs text-muted-foreground font-medium hidden sm:block">
                              ({Math.round(totalMinutes / 60 * 10) / 10} ש׳)
                            </span>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addInterval(day)}
                        className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                      >
                        <Plus className="h-3 w-3" /> הוספת שעות
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-muted-foreground flex-1 mt-1">
                      <span className="text-sm font-medium">סגור</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-500 dark:text-red-400 text-sm font-semibold mt-4 bg-red-50 dark:bg-red-950/30 rounded-xl px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 mt-5">
          <Button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-primary to-primary/70 hover:from-primary hover:to-primary/80 border-0 rounded-xl h-12 px-8 font-black shadow-lg shadow-primary/40 gap-2 disabled:opacity-60"
          >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> שומרת...</> : 'שמרי שעות עבודה'}
          </Button>
          {saved && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 text-green-600 font-bold text-sm bg-green-50 rounded-xl px-4 py-2">
              <CheckCircle2 className="h-4 w-4" />
              נשמר בהצלחה!
            </motion.div>
          )}
        </div>
      </form>
    </div>
  )
}
