'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, AlertCircle, Clock, CopyCheck } from 'lucide-react'

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

interface DayHours {
  dayOfWeek: number
  isActive: boolean
  startTime: string
  endTime: string
}

const DEFAULT_HOURS: DayHours[] = DAYS.map(({ day }) => ({
  dayOfWeek: day,
  isActive: day <= 4,
  startTime: '09:00',
  endTime: '19:00',
}))

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

export default function WorkingHoursPage() {
  const [hours, setHours] = useState<DayHours[]>(DEFAULT_HOURS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [bulkStart, setBulkStart] = useState('09:00')
  const [bulkEnd, setBulkEnd] = useState('19:00')

  useEffect(() => {
    fetch('/api/working-hours')
      .then(async (r) => {
        if (!r.ok) return
        const { data } = await r.json()
        if (!data?.length) return
        setHours((prev) =>
          prev.map((def) => {
            const fetched = (data as DayHours[]).find((d) => d.dayOfWeek === def.dayOfWeek)
            return fetched ? { ...def, ...fetched } : def
          })
        )
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function toggle(day: number) {
    setHours(prev => prev.map(h => h.dayOfWeek === day ? { ...h, isActive: !h.isActive } : h))
  }

  function setTime(day: number, field: 'startTime' | 'endTime', value: string) {
    setHours(prev => prev.map(h => {
      if (h.dayOfWeek !== day) return h
      if (field === 'startTime' && value >= h.endTime) {
        // Pushing startTime past (or equal to) the current endTime would leave
        // an invalid backwards range — bump endTime to the next available slot.
        const next = TIME_OPTIONS.find(t => t > value)
        return { ...h, startTime: value, endTime: next ?? value }
      }
      return { ...h, [field]: value }
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
    setHours(prev => prev.map(h => ({ ...h, startTime: bulkStart, endTime: bulkEnd })))
  }

  function applyPreset(preset: typeof PRESETS[0]) {
    setHours(prev => prev.map(h => ({
      ...h,
      isActive: preset.days.includes(h.dayOfWeek),
      startTime: preset.days.includes(h.dayOfWeek) ? preset.start : h.startTime,
      endTime: preset.days.includes(h.dayOfWeek) ? preset.end : h.endTime,
    })))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/working-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
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

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-foreground mb-1">שעות עבודה</h1>
        <p className="text-muted-foreground font-medium">הגדירי את הימים והשעות שאת זמינה ללקוחות</p>
      </motion.div>

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
            <TimeSelect value={bulkStart} onChange={setBulkStartTime} max={TIME_OPTIONS[TIME_OPTIONS.length - 1]} label="שעת התחלה כללית" />
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
                <div className="flex items-center gap-3 p-3.5">
                  {/* Toggle */}
                  <button
                    type="button"
                    dir="ltr"
                    onClick={() => toggle(day)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                      h.isActive
                        ? weekend ? 'bg-primary/70' : 'bg-primary'
                        : 'bg-muted'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${h.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>

                  {/* Day name */}
                  <span className={`w-14 text-sm font-black shrink-0 ${
                    h.isActive
                      ? weekend ? 'text-primary' : 'text-foreground'
                      : 'text-muted-foreground'
                  }`}>
                    {label}
                  </span>

                  {/* Times or closed label */}
                  {h.isActive ? (
                    <div className="flex items-center gap-2 flex-1">
                      <TimeSelect value={h.startTime} onChange={v => setTime(day, 'startTime', v)} max={TIME_OPTIONS[TIME_OPTIONS.length - 1]} />
                      <span className="text-muted-foreground/40 font-bold text-sm">—</span>
                      <TimeSelect value={h.endTime} onChange={v => setTime(day, 'endTime', v)} min={h.startTime} />
                      <span className="text-xs text-muted-foreground font-medium hidden sm:block">
                        ({Math.round(((() => {
                          const [eh, em] = h.endTime.split(':').map(Number)
                          const [sh, sm] = h.startTime.split(':').map(Number)
                          return (eh * 60 + em) - (sh * 60 + sm)
                        })()) / 60 * 10) / 10} ש׳)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-muted-foreground flex-1">
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
