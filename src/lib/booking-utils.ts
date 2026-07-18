function pad(n: number) {
  return String(n).padStart(2, '0')
}

// All booking business hours are Israel wall-clock time, but this file runs
// both in the browser (whatever the visitor's local timezone is) and on the
// server (UTC — no TZ env var is set). `new Date(\`${date}T${time}:00\`)` (no
// offset) parses using the RUNTIME's local timezone, so the exact same slot
// string resolves to a different instant depending on where the code runs —
// correct only when the runtime happens to be in Israel. This converts a
// Y-M-D + H:M pair, understood as Asia/Jerusalem wall-clock time, into the
// real UTC instant, independent of the runtime's own timezone.
export function israelWallClockToUtc(dateStr: string, timeStr: string): Date {
  const naiveUtc = new Date(`${dateStr}T${timeStr}:00Z`)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(naiveUtc).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value
    return acc
  }, {} as Record<string, string>)
  const asIfUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second)
  )
  return new Date(naiveUtc.getTime() - (asIfUtc - naiveUtc.getTime()))
}

// Today's calendar date as Israel wall-clock sees it, regardless of the
// runtime's own timezone (see israelWallClockToUtc's comment above for why
// that distinction matters on a UTC server).
export function todayInIsrael(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value
    return acc
  }, {} as Record<string, string>)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function buildDateStrip(count = 21): Date[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return d
  })
}

export function buildMonthCalendar(): (Date | null)[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return buildMonthCalendarFor(today.getFullYear(), today.getMonth())
}

export function buildMonthCalendarFor(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (Date | null)[] = Array.from({ length: firstDay.getDay() }, () => null)
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d))
  }
  return days
}

export function generateSlots(startTime: string, endTime: string): string[] {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const start = sh * 60 + sm
  const end = eh * 60 + em
  const slots: string[] = []
  for (let m = start; m < end; m += 30) {
    slots.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`)
  }
  return slots
}

export interface BookedSlot {
  startTime: string
  endTime: string
}

export function isSlotUnavailable(
  slot: string,
  date: string,
  durationMinutes: number,
  endTime: string,
  bookedSlots: BookedSlot[]
): boolean {
  const slotStart = israelWallClockToUtc(date, slot)
  const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000)
  const workEnd = israelWallClockToUtc(date, endTime)
  if (slotEnd > workEnd) return true
  return bookedSlots.some((b) => {
    const bStart = new Date(b.startTime)
    const bEnd = new Date(b.endTime)
    return bStart < slotEnd && bEnd > slotStart
  })
}

export interface WorkingHours {
  startTime: string
  endTime: string
  isActive: boolean
}

// The first bookable slot on `date`, or null if the day is off/fully booked.
// Shared by computeDateAvailability (just needs to know booked-or-not) and
// findNextAvailableSlot (needs the actual time), so the slot-filtering logic
// lives in exactly one place.
export function findFirstAvailableSlot(
  date: string,
  workingHours: WorkingHours | undefined,
  durationMinutes: number,
  appointments: BookedSlot[],
  nowMinutes?: number
): string | null {
  if (!workingHours || !workingHours.isActive) return null
  const slots = generateSlots(workingHours.startTime, workingHours.endTime)
  return slots.find((slot) => {
    if (nowMinutes !== undefined) {
      const [h, m] = slot.split(':').map(Number)
      if (h * 60 + m <= nowMinutes) return false
    }
    return !isSlotUnavailable(slot, date, durationMinutes, workingHours.endTime, appointments)
  }) ?? null
}

export function computeDateAvailability(
  date: string,
  workingHours: WorkingHours | undefined,
  durationMinutes: number,
  appointments: BookedSlot[],
  nowMinutes?: number
): { workingDay: boolean; fullyBooked: boolean } {
  if (!workingHours || !workingHours.isActive) {
    return { workingDay: false, fullyBooked: false }
  }
  const firstSlot = findFirstAvailableSlot(date, workingHours, durationMinutes, appointments, nowMinutes)
  return { workingDay: true, fullyBooked: firstSlot === null }
}

// "Now", read off Asia/Jerusalem explicitly rather than the runtime's local
// clock — this route can run on a UTC server, where new Date()'s own
// getDate()/getHours() would land on the wrong Israel calendar day/time
// during the UTC-offset window around Israel's midnight.
export function israelNow(): { dateStr: string; minutesSinceMidnight: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date()).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value
    return acc
  }, {} as Record<string, string>)
  return {
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    minutesSinceMidnight: Number(parts.hour) * 60 + Number(parts.minute),
  }
}

// Pure calendar-date arithmetic (no wall-clock/instant conversion involved),
// so unlike israelWallClockToUtc this is safe regardless of the runtime's
// own timezone.
export function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d, 12).getDay()
}

export function addDays(dateStr: string, count: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + count)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export interface NextAvailableSlot {
  date: string
  time: string
}

// Scans forward from today (Israel calendar) across `daysToSearch` days and
// returns the very first bookable slot found — used to show "next available
// appointment" on a nailist's search-results card, where we don't yet know
// which service/duration the visitor wants, so callers pass a representative
// default duration (see the API route).
export function findNextAvailableSlot(
  workingHoursByDay: Map<number, WorkingHours>,
  appointments: BookedSlot[],
  durationMinutes: number,
  daysToSearch = 14
): NextAvailableSlot | null {
  const { dateStr: todayStr, minutesSinceMidnight: todayNowMinutes } = israelNow()
  let dateStr = todayStr
  for (let i = 0; i < daysToSearch; i++) {
    const slot = findFirstAvailableSlot(
      dateStr,
      workingHoursByDay.get(getDayOfWeek(dateStr)),
      durationMinutes,
      appointments,
      i === 0 ? todayNowMinutes : undefined
    )
    if (slot) return { date: dateStr, time: slot }
    dateStr = addDays(dateStr, 1)
  }
  return null
}

export function filterExpiredConfirmed(
  appointments: Array<{ id: string; status: string; endTime: Date }>,
  now: Date
): string[] {
  return appointments
    .filter((a) => a.status === 'CONFIRMED' && a.endTime < now)
    .map((a) => a.id)
}
