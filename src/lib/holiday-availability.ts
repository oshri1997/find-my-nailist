import { isYomTov } from 'jewish-holidays'
import { JewishMonth, toGregorianDate, toJewishDate } from 'jewish-date'
import { normalizeDayAvailability, type RawDayAvailability, type TimeInterval } from '@/lib/availability-intervals'

export type AvailabilityOverrideMode = 'OPEN' | 'CLOSED'

export interface AvailabilityOverride {
  date: string
  mode: AvailabilityOverrideMode
  startTime?: string
  endTime?: string
  intervals?: TimeInterval[]
}

export interface IsraeliChag {
  date: string
  name: string
}

// One predictable Firestore document per nailist and Israel calendar date.
// Profile document IDs never contain `/`, so this is a valid Firestore ID.
export function availabilityOverrideDocumentId(nailistProfileId: string, date: string): string {
  return `${nailistProfileId}_${date}`
}

function dateAtIsraelNoon(date: string): Date {
  // Noon avoids converting a UTC date into the preceding Israel calendar day.
  return new Date(`${date}T12:00:00+03:00`)
}

function israelCalendarDayOfWeek(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(instant).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value
    return result
  }, {} as Record<string, string>)
  return new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 12).getDay()
}

export function isObservedYomHaAtzmaut(date: string): boolean {
  const jewishDate = toJewishDate(dateAtIsraelNoon(date))
  if (jewishDate.monthName !== JewishMonth.Iyyar) return false

  // The Independence Day Law moves 5 Iyar from Friday/Saturday back to
  // Thursday and from Monday forward to Tuesday. 5 Iyar can only fall on
  // Monday, Wednesday, Friday, or Saturday in the Hebrew calendar.
  const iyyarFive = toGregorianDate({ year: jewishDate.year, monthName: JewishMonth.Iyyar, day: 5 })
  const observedDay = ({ 1: 6, 3: 5, 5: 4, 6: 3 } as Record<number, number>)[israelCalendarDayOfWeek(iyyarFive)]
  return jewishDate.day === observedDay
}

export function getIsraeliChag(date: string): IsraeliChag | null {
  // `false` selects Israel's one-day Yom Tov schedule. The MIT package's
  // documented boolean API does not expose a stable public holiday name.
  if (isObservedYomHaAtzmaut(date)) return { date, name: 'יום העצמאות' }
  return isYomTov(dateAtIsraelNoon(date), false) ? { date, name: 'חג ישראלי' } : null
}

export function isIsraeliChag(date: string): boolean {
  return getIsraeliChag(date) !== null
}

// The normalization layer's precedence entry point: resolves whichever
// source governs a given Israel calendar date into the one representation
// business logic operates on — TimeInterval[], where [] means closed.
// Precedence: date override (OPEN or CLOSED) > Israeli holiday auto-closure
// (unless the nailist opted out) > weekly hours. A date override is always
// authoritative, including opening a weekly day off; it REPLACES the weekly
// day's intervals rather than adding to them.
export function resolveAvailabilityIntervals(
  date: string,
  weeklyHours: RawDayAvailability | undefined,
  autoCloseHolidays: boolean | undefined,
  override?: AvailabilityOverride,
): TimeInterval[] {
  if (override?.mode === 'CLOSED') return []
  if (override?.mode === 'OPEN') {
    return normalizeDayAvailability({
      startTime: override.startTime,
      endTime: override.endTime,
      intervals: override.intervals,
    })
  }
  // Profiles created before this preference existed must follow the Israel
  // holiday policy too. Only an explicit false opts a nailist out.
  if (autoCloseHolidays !== false && isIsraeliChag(date)) return []
  return normalizeDayAvailability(weeklyHours)
}
