import { getRecommendedSlots } from '../slot-recommendation'
import { israelWallClockToUtc } from '../booking-utils'

const DATE = '2025-01-15' // winter — Israel is UTC+2, no DST
const iso = (time: string) => israelWallClockToUtc(DATE, time).toISOString()

const FULL_DAY = [{ start: '08:00', end: '18:00' }]

describe('getRecommendedSlots', () => {
  it('recommends nothing when there are no active services (minServiceDurationMinutes is 0)', () => {
    const result = getRecommendedSlots({
      date: DATE,
      intervals: FULL_DAY,
      bookedSlots: [],
      candidateSlots: ['08:00', '09:00'],
      serviceDurationMinutes: 60,
      minServiceDurationMinutes: 0,
    })
    expect(result.size).toBe(0)
  })

  it('recommends a slot that butts directly against an existing appointment, consolidating the schedule', () => {
    const result = getRecommendedSlots({
      date: DATE,
      intervals: FULL_DAY,
      bookedSlots: [{ startTime: iso('10:00'), endTime: iso('11:00') }],
      candidateSlots: ['09:00', '11:00', '15:00'],
      serviceDurationMinutes: 60,
      minServiceDurationMinutes: 45,
    })
    // 09:00–10:00 ends exactly where the booked appointment starts.
    expect(result.has('09:00')).toBe(true)
    // 11:00–12:00 starts exactly where the booked appointment ends.
    expect(result.has('11:00')).toBe(true)
    // 15:00 floats in open space, touching neither the appointment nor a
    // shift boundary — doesn't consolidate anything.
    expect(result.has('15:00')).toBe(false)
  })

  it('recommends the first slot of an empty day (touches the shift start boundary)', () => {
    const result = getRecommendedSlots({
      date: DATE,
      intervals: FULL_DAY,
      bookedSlots: [],
      candidateSlots: ['08:00', '12:00'],
      serviceDurationMinutes: 60,
      minServiceDurationMinutes: 45,
    })
    expect(result.has('08:00')).toBe(true) // touches shiftStart
    expect(result.has('12:00')).toBe(false) // touches neither boundary
  })

  it('does not recommend a slot that touches one appointment but leaves a too-small sliver before the next one', () => {
    // 09:00–10:00 and 10:50–11:30 are both booked. A 45-minute slot at
    // 10:00 butts directly against the first appointment (gapBefore = 0)
    // but leaves only a 5-minute sliver before the second one — too small
    // for the 45-minute minimum service. Touching one side isn't enough if
    // the other side still creates dead time.
    const result = getRecommendedSlots({
      date: DATE,
      intervals: FULL_DAY,
      bookedSlots: [
        { startTime: iso('09:00'), endTime: iso('10:00') },
        { startTime: iso('10:50'), endTime: iso('11:30') },
      ],
      candidateSlots: ['10:00'],
      serviceDurationMinutes: 45,
      minServiceDurationMinutes: 45,
    })
    expect(result.has('10:00')).toBe(false)
  })

  it('recommends nothing when there are no intervals (closed day)', () => {
    const result = getRecommendedSlots({
      date: DATE,
      intervals: [],
      bookedSlots: [],
      candidateSlots: ['09:00'],
      serviceDurationMinutes: 60,
      minServiceDurationMinutes: 45,
    })
    expect(result.size).toBe(0)
  })

  describe('split-shift day — 09:00-13:00, 15:00-19:00', () => {
    const split = [{ start: '09:00', end: '13:00' }, { start: '15:00', end: '19:00' }]

    it('recommends the first slot of each interval independently (both touch their own interval start)', () => {
      const result = getRecommendedSlots({
        date: DATE,
        intervals: split,
        bookedSlots: [],
        candidateSlots: ['09:00', '11:00', '15:00', '17:00'],
        serviceDurationMinutes: 60,
        minServiceDurationMinutes: 45,
      })
      expect(result.has('09:00')).toBe(true) // touches first interval's start
      expect(result.has('15:00')).toBe(true) // touches second interval's start
      expect(result.has('11:00')).toBe(false) // floats in the middle of interval 1
      expect(result.has('17:00')).toBe(false) // floats in the middle of interval 2
    })

    it('does NOT treat the last slot of interval 1 as adjacent to interval 2 across the break', () => {
      // 12:00-13:00 touches interval 1's own end (13:00) — recommended on
      // that basis alone, not because interval 2 starts two hours later.
      const result = getRecommendedSlots({
        date: DATE,
        intervals: split,
        bookedSlots: [],
        candidateSlots: ['12:00'],
        serviceDurationMinutes: 60,
        minServiceDurationMinutes: 45,
      })
      expect(result.has('12:00')).toBe(true)
    })

    it('an appointment in interval 1 never affects recommendations computed for interval 2', () => {
      const result = getRecommendedSlots({
        date: DATE,
        intervals: split,
        bookedSlots: [{ startTime: iso('09:00'), endTime: iso('10:00') }],
        candidateSlots: ['16:00'],
        serviceDurationMinutes: 60,
        minServiceDurationMinutes: 45,
      })
      // 16:00 floats in the middle of interval 2 — the interval-1 booking
      // must not make it look adjacent to anything.
      expect(result.has('16:00')).toBe(false)
    })
  })
})
