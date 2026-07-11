import { getRecommendedSlots } from '../slot-recommendation'
import { israelWallClockToUtc } from '../booking-utils'

const DATE = '2025-01-15' // winter — Israel is UTC+2, no DST
const iso = (time: string) => israelWallClockToUtc(DATE, time).toISOString()

describe('getRecommendedSlots', () => {
  it('recommends nothing when there are no active services (minServiceDurationMinutes is 0)', () => {
    const result = getRecommendedSlots({
      date: DATE,
      shiftStartTime: '08:00',
      shiftEndTime: '18:00',
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
      shiftStartTime: '08:00',
      shiftEndTime: '18:00',
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
      shiftStartTime: '08:00',
      shiftEndTime: '18:00',
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
      shiftStartTime: '08:00',
      shiftEndTime: '18:00',
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
})
