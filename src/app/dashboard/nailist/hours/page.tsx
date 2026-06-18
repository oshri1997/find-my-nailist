'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

const DAYS = [
  { day: 0, label: 'ראשון' },
  { day: 1, label: 'שני' },
  { day: 2, label: 'שלישי' },
  { day: 3, label: 'רביעי' },
  { day: 4, label: 'חמישי' },
  { day: 5, label: 'שישי' },
  { day: 6, label: 'שבת' },
]

interface DayHours {
  dayOfWeek: number
  isActive: boolean
  startTime: string
  endTime: string
}

const DEFAULT_HOURS: DayHours[] = DAYS.map(({ day }) => ({
  dayOfWeek: day,
  isActive: day >= 0 && day <= 4, // Sun-Thu active by default
  startTime: '09:00',
  endTime: '19:00',
}))

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
        // Merge fetched data with defaults
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
    setHours((prev) => prev.map((h) => h.dayOfWeek === day ? { ...h, isActive: !h.isActive } : h))
  }

  function setTime(day: number, field: 'startTime' | 'endTime', value: string) {
    setHours((prev) => prev.map((h) => h.dayOfWeek === day ? { ...h, [field]: value } : h))
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

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-black text-gray-800 mb-1">שעות עבודה ⏰</h1>
        <p className="text-gray-400 font-medium">הגדירי את הימים והשעות שאת זמינה</p>
      </motion.div>

      <form onSubmit={handleSave} className="space-y-3">
        {DAYS.map(({ day, label }, i) => {
          const h = hours.find((x) => x.dayOfWeek === day)!
          return (
            <motion.div
              key={day}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-2xl border p-4 transition-all ${h.isActive ? 'bg-white border-gray-100 shadow-sm' : 'bg-gray-50 border-gray-100'}`}
            >
              <div className="flex items-center gap-4">
                {/* Toggle */}
                <button
                  type="button"
                  onClick={() => toggle(day)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${h.isActive ? 'bg-pink-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${h.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>

                {/* Day name */}
                <span className={`w-16 text-sm font-black shrink-0 ${h.isActive ? 'text-gray-700' : 'text-gray-400'}`}>
                  {label}
                </span>

                {/* Times */}
                {h.isActive ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={h.startTime}
                      onChange={(e) => setTime(day, 'startTime', e.target.value)}
                      className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 focus:outline-none focus:border-pink-300 w-28"
                    />
                    <span className="text-gray-400 text-sm font-medium">—</span>
                    <input
                      type="time"
                      value={h.endTime}
                      onChange={(e) => setTime(day, 'endTime', e.target.value)}
                      className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 focus:outline-none focus:border-pink-300 w-28"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-gray-400 font-medium">סגור</span>
                )}
              </div>
            </motion.div>
          )
        })}

        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm font-semibold pt-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 rounded-xl h-12 px-8 font-black shadow-lg shadow-pink-200 gap-2 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'שומרת...' : 'שמרי שעות עבודה'}
          </Button>
          {saved && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-1.5 text-green-600 font-bold text-sm">
              <CheckCircle2 className="h-4 w-4" />
              נשמר בהצלחה!
            </motion.div>
          )}
        </div>
      </form>
    </div>
  )
}
