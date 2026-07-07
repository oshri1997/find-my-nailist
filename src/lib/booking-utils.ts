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
  const slots = generateSlots(workingHours.startTime, workingHours.endTime)
  const available = slots.filter((slot) => {
    if (nowMinutes !== undefined) {
      const [h, m] = slot.split(':').map(Number)
      if (h * 60 + m <= nowMinutes) return false
    }
    return !isSlotUnavailable(slot, date, durationMinutes, workingHours.endTime, appointments)
  })
  return { workingDay: true, fullyBooked: available.length === 0 }
}

export function filterExpiredConfirmed(
  appointments: Array<{ id: string; status: string; endTime: Date }>,
  now: Date
): string[] {
  return appointments
    .filter((a) => a.status === 'CONFIRMED' && a.endTime < now)
    .map((a) => a.id)
}
