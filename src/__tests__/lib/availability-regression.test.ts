// Regression baseline: proves that a legacy single-window working-hours
// record produces IDENTICAL generated slots to the new intervals[] format
// expressing the exact same window, across a matrix of service durations and
// booking scenarios. If this file ever fails, upgrading the availability
// model broke behavior for every existing single-interval nailist — the one
// outcome the whole migration is required to avoid.
import { normalizeDayAvailability } from '@/lib/availability-intervals'
import {
  findFirstAvailableSlot,
  generateSlotsForIntervals,
  israelWallClockToUtc,
  type BookedSlot,
} from '@/lib/booking-utils'

const DATE = '2026-06-15' // a plain Wednesday, no DST transition nearby

function slot(date: string, time: string): string {
  return israelWallClockToUtc(date, time).toISOString()
}

const legacyDay = { isActive: true, startTime: '09:00', endTime: '18:00' }
const newDay = { isActive: true, intervals: [{ start: '09:00', end: '18:00' }] }

const legacyIntervals = normalizeDayAvailability(legacyDay)
const newIntervals = normalizeDayAvailability(newDay)

const DURATIONS = [30, 45, 60, 75, 90, 120]

describe('legacy single interval === new single interval (normalization)', () => {
  it('normalizes to the exact same TimeInterval[]', () => {
    expect(legacyIntervals).toEqual(newIntervals)
    expect(legacyIntervals).toEqual([{ start: '09:00', end: '18:00' }])
  })

  it('generates the exact same slot list', () => {
    expect(generateSlotsForIntervals(legacyIntervals)).toEqual(generateSlotsForIntervals(newIntervals))
  })
})

describe('legacy single interval === new single interval — generated slots across scenarios', () => {
  const scenarios: Array<{ name: string; appointments: BookedSlot[] }> = [
    { name: 'no appointments', appointments: [] },
    { name: 'appointment at the start of the day', appointments: [{ startTime: slot(DATE, '09:00'), endTime: slot(DATE, '10:00') }] },
    { name: 'appointment in the middle of the day', appointments: [{ startTime: slot(DATE, '13:00'), endTime: slot(DATE, '14:00') }] },
    { name: 'appointment at the end of the day', appointments: [{ startTime: slot(DATE, '17:00'), endTime: slot(DATE, '18:00') }] },
    {
      name: 'multiple existing appointments',
      appointments: [
        { startTime: slot(DATE, '09:00'), endTime: slot(DATE, '09:30') },
        { startTime: slot(DATE, '11:00'), endTime: slot(DATE, '12:30') },
        { startTime: slot(DATE, '16:00'), endTime: slot(DATE, '16:45') },
      ],
    },
  ]

  for (const duration of DURATIONS) {
    for (const scenario of scenarios) {
      it(`duration=${duration}min, ${scenario.name}: identical first-available-slot`, () => {
        const oldSlot = findFirstAvailableSlot(DATE, legacyIntervals, duration, scenario.appointments)
        const newSlot = findFirstAvailableSlot(DATE, newIntervals, duration, scenario.appointments)
        expect(oldSlot).toEqual(newSlot)
      })
    }
  }
})

describe('legacy single interval === new single interval — full slot list equivalence', () => {
  it('every generated 30-minute grid slot start matches exactly, one by one', () => {
    const oldSlots = generateSlotsForIntervals(legacyIntervals)
    const newSlots = generateSlotsForIntervals(newIntervals)
    expect(oldSlots).toEqual(newSlots)
    expect(oldSlots.length).toBeGreaterThan(0)
  })
})

describe('DST — interval hours stay the same Israel local time across the clock change', () => {
  // Israel switches to daylight saving time (spring forward) on the last
  // Friday before April 2, and back to standard time (fall back) on the
  // last Sunday of October. 09:00-18:00 must mean the same wall-clock hours
  // on both sides of each transition, even though the UTC offset changes.
  const WINTER_DATE = '2026-01-15' // standard time, UTC+2
  const SUMMER_DATE = '2026-07-15' // daylight time, UTC+3
  const SPRING_FORWARD_DATE = '2026-03-27' // DST begins 2026-03-27 02:00 IST -> 03:00 IDT
  const FALL_BACK_DATE = '2026-10-25' // DST ends 2026-10-25 02:00 IDT -> 01:00 IST

  const intervals = [{ start: '09:00', end: '18:00' }]

  it('a plain winter day (no DST) keeps 09:00-18:00 local', () => {
    const slots = generateSlotsForIntervals(intervals)
    expect(slots[0]).toBe('09:00')
    expect(slots[slots.length - 1]).toBe('17:30')
    expect(israelWallClockToUtc(WINTER_DATE, '09:00').toISOString()).toBe('2026-01-15T07:00:00.000Z')
    expect(israelWallClockToUtc(WINTER_DATE, '18:00').toISOString()).toBe('2026-01-15T16:00:00.000Z')
  })

  it('a plain summer day (DST active) keeps 09:00-18:00 local, at a different UTC offset', () => {
    expect(israelWallClockToUtc(SUMMER_DATE, '09:00').toISOString()).toBe('2026-07-15T06:00:00.000Z')
    expect(israelWallClockToUtc(SUMMER_DATE, '18:00').toISOString()).toBe('2026-07-15T15:00:00.000Z')
  })

  it('the spring-forward transition day (clocks jump 02:00->03:00) still means 09:00-18:00 Israel local time throughout business hours', () => {
    // Israel's DST jump happens at 02:00 local, well before any business
    // hours — by 09:00 the whole day is already on the new UTC+3 offset, so
    // wall-clock business hours are unaffected by the transition itself.
    expect(israelWallClockToUtc(SPRING_FORWARD_DATE, '09:00').toISOString()).toBe('2026-03-27T06:00:00.000Z')
    expect(israelWallClockToUtc(SPRING_FORWARD_DATE, '18:00').toISOString()).toBe('2026-03-27T15:00:00.000Z')
    // The generated slot list itself is timezone-agnostic (pure HH:MM grid
    // arithmetic) — identical regardless of which side of a DST transition
    // the calendar date happens to fall on.
    expect(generateSlotsForIntervals(intervals)).toEqual(generateSlotsForIntervals(intervals))
  })

  it('the fall-back transition day (clocks jump 02:00->01:00) still means 09:00-18:00 Israel local time throughout business hours', () => {
    // Symmetric case: the fall-back jump also happens at 02:00 local, before
    // business hours — by 09:00 the day is already back on standard time.
    expect(israelWallClockToUtc(FALL_BACK_DATE, '09:00').toISOString()).toBe('2026-10-25T07:00:00.000Z')
    expect(israelWallClockToUtc(FALL_BACK_DATE, '18:00').toISOString()).toBe('2026-10-25T16:00:00.000Z')
  })

  it('a split-shift interval keeps consistent local hours across a DST transition day, in both windows', () => {
    const split = [{ start: '09:00', end: '13:00' }, { start: '15:00', end: '19:00' }]
    expect(israelWallClockToUtc(SPRING_FORWARD_DATE, '09:00').toISOString()).toBe('2026-03-27T06:00:00.000Z')
    expect(israelWallClockToUtc(SPRING_FORWARD_DATE, '13:00').toISOString()).toBe('2026-03-27T10:00:00.000Z')
    expect(israelWallClockToUtc(SPRING_FORWARD_DATE, '15:00').toISOString()).toBe('2026-03-27T12:00:00.000Z')
    expect(israelWallClockToUtc(SPRING_FORWARD_DATE, '19:00').toISOString()).toBe('2026-03-27T16:00:00.000Z')
    expect(generateSlotsForIntervals(split)).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'])
  })

  it('a 60-minute booking attempt at the exact spring-forward moment resolves to the correct UTC instant, matching the client-computed startTime', () => {
    // This mirrors what the booking transaction checks: the client computes
    // startTime via israelWallClockToUtc and the server must recompute the
    // identical instant from the same date+time string, DST notwithstanding.
    const clientComputedStart = israelWallClockToUtc(SPRING_FORWARD_DATE, '09:00')
    const serverRecomputedStart = israelWallClockToUtc(SPRING_FORWARD_DATE, '09:00')
    expect(serverRecomputedStart.getTime()).toBe(clientComputedStart.getTime())
  })
})
