import { findUnfillableGaps, type DayWorkingHours, type ActiveAppointment } from '@/lib/gap-detection'

// 2026-07-13 is a Monday (dayOfWeek 1). Working hours below use it directly,
// so tests aren't sensitive to whatever "today" happens to be when they run.
const MONDAY = { dayOfWeek: 1, isActive: true, startTime: '09:00', endTime: '17:00' }

function hours(overrides: Partial<DayWorkingHours> = {}): DayWorkingHours[] {
  return [{ ...MONDAY, ...overrides }]
}

// Fixed "now" well before the working day starts, so nothing gets clipped
// as "already elapsed" unless a test explicitly wants that behavior.
const EARLY_NOW = new Date('2026-07-13T05:00:00Z')

describe('findUnfillableGaps', () => {
  it('flags the exact scenario from the bug report: shift starts 9:00, first booking 9:30 for a 60-minute service', () => {
    const appointments: ActiveAppointment[] = [
      { startTime: '2026-07-13T06:30:00Z', endTime: '2026-07-13T07:30:00Z' }, // 09:30-10:30 Israel (IDT, UTC+3 in July)
    ]
    const gaps = findUnfillableGaps({
      workingHours: hours(),
      appointments,
      minServiceDurationMinutes: 60,
      daysAhead: 1,
      startDate: '2026-07-13',
      now: EARLY_NOW,
    })
    expect(gaps).toEqual([
      { date: '2026-07-13', startTime: '09:00', endTime: '09:30', gapMinutes: 30 },
    ])
  })

  it('does not flag a wide-open day with no appointments', () => {
    const gaps = findUnfillableGaps({
      workingHours: hours(),
      appointments: [],
      minServiceDurationMinutes: 60,
      daysAhead: 1,
      startDate: '2026-07-13',
      now: EARLY_NOW,
    })
    expect(gaps).toEqual([])
  })

  it('does not flag a gap that exactly equals the shortest service duration', () => {
    // 09:00-09:30 free (30 min), 09:30-10:30 booked — a 30-minute service fits exactly.
    const appointments: ActiveAppointment[] = [
      { startTime: '2026-07-13T06:30:00Z', endTime: '2026-07-13T07:30:00Z' },
    ]
    const gaps = findUnfillableGaps({
      workingHours: hours(),
      appointments,
      minServiceDurationMinutes: 30,
      daysAhead: 1,
      startDate: '2026-07-13',
      now: EARLY_NOW,
    })
    expect(gaps).toEqual([])
  })

  it('does not flag back-to-back appointments with no gap between them', () => {
    const appointments: ActiveAppointment[] = [
      { startTime: '2026-07-13T06:00:00Z', endTime: '2026-07-13T07:00:00Z' }, // 09:00-10:00
      { startTime: '2026-07-13T07:00:00Z', endTime: '2026-07-13T08:00:00Z' }, // 10:00-11:00
    ]
    const gaps = findUnfillableGaps({
      workingHours: hours(),
      appointments,
      minServiceDurationMinutes: 60,
      daysAhead: 1,
      startDate: '2026-07-13',
      now: EARLY_NOW,
    })
    expect(gaps).toEqual([])
  })

  it('flags a gap after the last appointment before shift end', () => {
    // Shift ends 17:00, last appointment ends 16:45 -> 15-minute unfillable tail.
    const appointments: ActiveAppointment[] = [
      { startTime: '2026-07-13T13:00:00Z', endTime: '2026-07-13T13:45:00Z' }, // 16:00-16:45
    ]
    const gaps = findUnfillableGaps({
      workingHours: hours(),
      appointments,
      minServiceDurationMinutes: 60,
      daysAhead: 1,
      startDate: '2026-07-13',
      now: EARLY_NOW,
    })
    expect(gaps).toEqual([
      { date: '2026-07-13', startTime: '16:45', endTime: '17:00', gapMinutes: 15 },
    ])
  })

  it('skips a day the nailist is closed, even with appointment data present', () => {
    const gaps = findUnfillableGaps({
      workingHours: hours({ isActive: false }),
      appointments: [{ startTime: '2026-07-13T06:30:00Z', endTime: '2026-07-13T07:30:00Z' }],
      minServiceDurationMinutes: 60,
      daysAhead: 1,
      startDate: '2026-07-13',
      now: EARLY_NOW,
    })
    expect(gaps).toEqual([])
  })

  it('returns nothing when there is no shortest-service duration to compare against', () => {
    const appointments: ActiveAppointment[] = [
      { startTime: '2026-07-13T06:30:00Z', endTime: '2026-07-13T07:30:00Z' },
    ]
    expect(findUnfillableGaps({
      workingHours: hours(), appointments, minServiceDurationMinutes: null, startDate: '2026-07-13', now: EARLY_NOW,
    })).toEqual([])
    expect(findUnfillableGaps({
      workingHours: hours(), appointments, minServiceDurationMinutes: 0, startDate: '2026-07-13', now: EARLY_NOW,
    })).toEqual([])
  })

  it('clips an already-elapsed gap to "now" instead of flagging dead time in the past', () => {
    // "Now" is 09:15 Israel time (06:15Z) — the 09:00-09:15 sliver of the gap
    // already passed; only the remaining 09:15-09:30 (15 min) is actionable.
    const appointments: ActiveAppointment[] = [
      { startTime: '2026-07-13T06:30:00Z', endTime: '2026-07-13T07:30:00Z' },
    ]
    const gaps = findUnfillableGaps({
      workingHours: hours(),
      appointments,
      minServiceDurationMinutes: 60,
      daysAhead: 1,
      startDate: '2026-07-13',
      now: new Date('2026-07-13T06:15:00Z'),
    })
    expect(gaps).toEqual([
      { date: '2026-07-13', startTime: '09:15', endTime: '09:30', gapMinutes: 15 },
    ])
  })

  it('drops a gap entirely once "now" has moved past it', () => {
    const appointments: ActiveAppointment[] = [
      { startTime: '2026-07-13T06:30:00Z', endTime: '2026-07-13T07:30:00Z' },
    ]
    const gaps = findUnfillableGaps({
      workingHours: hours(),
      appointments,
      minServiceDurationMinutes: 60,
      daysAhead: 1,
      startDate: '2026-07-13',
      now: new Date('2026-07-13T06:30:00Z'), // 09:30 Israel — the gap already closed
    })
    expect(gaps).toEqual([])
  })

  it('only checks the requested horizon (daysAhead)', () => {
    // The stranding appointment falls on day 2 (2026-07-14, also a working
    // Tuesday) — invisible to a 1-day horizon starting on day 1.
    const appointments: ActiveAppointment[] = [
      { startTime: '2026-07-14T06:30:00Z', endTime: '2026-07-14T07:30:00Z' },
    ]
    const gaps = findUnfillableGaps({
      workingHours: [MONDAY, { dayOfWeek: 2, isActive: true, startTime: '09:00', endTime: '17:00' }],
      appointments,
      minServiceDurationMinutes: 60,
      daysAhead: 1,
      startDate: '2026-07-13',
      now: EARLY_NOW,
    })
    expect(gaps).toEqual([])
  })
})
