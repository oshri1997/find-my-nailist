import { israelWallClockToUtc, todayInIsrael } from './booking-utils'

export interface DayWorkingHours {
  dayOfWeek: number // 0=Sunday..6=Saturday, matches Date#getUTCDay()
  isActive: boolean
  startTime: string // "HH:MM"
  endTime: string
}

export interface ActiveAppointment {
  startTime: string // ISO instant
  endTime: string // ISO instant
}

export interface UnfillableGap {
  date: string // "YYYY-MM-DD"
  startTime: string // "HH:MM", Israel wall-clock
  endTime: string
  gapMinutes: number
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

function dayOfWeekOf(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

function formatIsraelTime(instant: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(instant)
}

// Finds contiguous stretches of a nailist's working day too short to fit any
// of her active services — dead time nobody can ever book into, caused by an
// appointment that doesn't line up with the shift edges or with another
// appointment (e.g. shift starts 9:00, first booking is 9:30 for a 60-minute
// service — the 9:00-9:30 sliver can never be filled). Pure and side-effect
// free so it can run against data the dashboard already has in memory,
// without a dedicated API round-trip.
export function findUnfillableGaps(params: {
  workingHours: DayWorkingHours[]
  appointments: ActiveAppointment[] // caller filters to PENDING/CONFIRMED only
  minServiceDurationMinutes: number | null // null/0 = no active services to compare against
  daysAhead?: number
  startDate?: string // "YYYY-MM-DD", Israel wall-clock — defaults to today
  now?: Date // injectable for tests; defaults to the real current instant
}): UnfillableGap[] {
  const {
    workingHours, appointments, minServiceDurationMinutes,
    daysAhead = 14, startDate = todayInIsrael(), now = new Date(),
  } = params
  if (!minServiceDurationMinutes || minServiceDurationMinutes <= 0) return []

  const gaps: UnfillableGap[] = []

  for (let i = 0; i < daysAhead; i++) {
    const date = addDays(startDate, i)
    const hours = workingHours.find((h) => h.dayOfWeek === dayOfWeekOf(date))
    if (!hours || !hours.isActive) continue

    const shiftStart = israelWallClockToUtc(date, hours.startTime)
    const shiftEnd = israelWallClockToUtc(date, hours.endTime)

    const dayAppointments = appointments
      .map((a) => ({ start: new Date(a.startTime), end: new Date(a.endTime) }))
      .filter((a) => a.start < shiftEnd && a.end > shiftStart)
      .sort((a, b) => a.start.getTime() - b.start.getTime())

    const freeIntervals: Array<[Date, Date]> = []
    let cursor = shiftStart
    for (const apt of dayAppointments) {
      if (apt.start > cursor) freeIntervals.push([cursor, apt.start])
      if (apt.end > cursor) cursor = apt.end
    }
    if (shiftEnd > cursor) freeIntervals.push([cursor, shiftEnd])

    for (const [start, end] of freeIntervals) {
      // Don't flag time that's already elapsed today as "actionable."
      const effectiveStart = start < now ? now : start
      if (effectiveStart >= end) continue

      const gapMinutes = (end.getTime() - effectiveStart.getTime()) / 60_000
      if (gapMinutes > 0 && gapMinutes < minServiceDurationMinutes) {
        gaps.push({
          date,
          startTime: formatIsraelTime(effectiveStart),
          endTime: formatIsraelTime(end),
          gapMinutes: Math.round(gapMinutes),
        })
      }
    }
  }

  return gaps
}
