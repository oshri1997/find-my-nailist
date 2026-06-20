'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react'

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
  if (h < 23) TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`)
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

function TimeSelect({ value, onChange, min }: { value: string; onChange: (v: string) => void; min?: string }) {
  const options = min ? TIME_OPTIONS.filter(t => t > min) : TIME_OPTIONS
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-9 rounded-xl border border-gray-200 bg-white px-2 text-sm font-semibold text-gray-700 focus:outline-none focus:border-pink-300 cursor-pointer"
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
    setHours(prev => prev.map(h => h.dayOfWeek === day ? { ...h, [field]: value } : h))
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
      <div className="p-8 flex items-center gap-3 text-gray-400 font-medium">
        <Loader2 className="h-5 w-5 animate-spin" />
        טוענת שעות עבודה...
      </div>
    )
  }

  const activeDays = hours.filter(h => h.isActive).length

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-gray-800 mb-1">שעות עבודה ⏰</h1>
        <p className="text-gray-400 font-medium">הגדירי את הימים והשעות שאת זמינה ללקוחות</p>
      </motion.div>

      {/* Quick presets */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-4 mb-5 border border-pink-100">
        <p className="text-xs font-black text-gray-500 mb-3 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          תבניות מהירות
        </p>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className="px-4 py-1.5 rounded-xl bg-white border border-pink-200 text-sm font-bold text-pink-600 hover:bg-pink-500 hover:text-white hover:border-pink-500 transition-all shadow-sm"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </motion.div>

      <form onSubmit={handleSave}>
        {/* Active count badge */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-400">
            {activeDays} ימים פעילים מתוך 7
          </p>
          <div className="flex gap-1">
            {DAYS.map(({ day }) => {
              const h = hours.find(x => x.dayOfWeek === day)!
              return (
                <div
                  key={day}
                  className={`w-2 h-2 rounded-full transition-colors ${h.isActive ? 'bg-gradient-to-br from-pink-500 to-purple-600' : 'bg-gray-200'}`}
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
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-white border-pink-100 shadow-sm'
                    : 'bg-gray-50 border-gray-100'
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
                        ? weekend ? 'bg-amber-400' : 'bg-pink-500'
                        : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${h.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>

                  {/* Day name */}
                  <span className={`w-14 text-sm font-black shrink-0 ${
                    h.isActive
                      ? weekend ? 'text-amber-700' : 'text-gray-800'
                      : 'text-gray-400'
                  }`}>
                    {label}
                  </span>

                  {/* Times or closed label */}
                  {h.isActive ? (
                    <div className="flex items-center gap-2 flex-1">
                      <TimeSelect value={h.startTime} onChange={v => setTime(day, 'startTime', v)} />
                      <span className="text-gray-300 font-bold text-sm">—</span>
                      <TimeSelect value={h.endTime} onChange={v => setTime(day, 'endTime', v)} min={h.startTime} />
                      <span className="text-xs text-gray-400 font-medium hidden sm:block">
                        ({Math.round(((() => {
                          const [eh, em] = h.endTime.split(':').map(Number)
                          const [sh, sm] = h.startTime.split(':').map(Number)
                          return (eh * 60 + em) - (sh * 60 + sm)
                        })()) / 60 * 10) / 10} ש׳)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <span className="text-sm font-medium">סגור</span>
                      {day === 6 && <span className="text-base">🌙</span>}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm font-semibold mt-4 bg-red-50 rounded-xl px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 mt-5">
          <Button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 rounded-xl h-12 px-8 font-black shadow-lg shadow-pink-200 gap-2 disabled:opacity-60"
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
