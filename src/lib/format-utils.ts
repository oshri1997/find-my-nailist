import { todayInIsrael, addDays } from './booking-utils'

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} מ׳`
  return `${km.toFixed(1)} ק"מ`
}

const WEEKDAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

// "היום, 14:00" / "מחר, 09:00" / "יום ג׳, 03.09 · 11:30" — relative for the
// next two days (most common case for a "book me soon" search), an explicit
// weekday + date beyond that so it isn't ambiguous a week out.
export function formatNextSlotLabel(date: string, time: string): string {
  const today = todayInIsrael()
  if (date === today) return `היום, ${time}`
  if (date === addDays(today, 1)) return `מחר, ${time}`
  const [, m, d] = date.split('-')
  const dayOfWeek = new Date(`${date}T12:00:00`).getDay()
  return `יום ${WEEKDAY_NAMES[dayOfWeek]}, ${d}.${m} · ${time}`
}
