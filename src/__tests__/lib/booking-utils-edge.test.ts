/**
 * Edge cases and additional coverage for booking-utils.
 * generateSlots always uses 30-min steps; durationMinutes only affects isSlotUnavailable.
 */
import { generateSlots, isSlotUnavailable, toDateStr, computeDateAvailability } from '@/lib/booking-utils'

describe('generateSlots — edge cases', () => {
  it('returns [] when startTime equals endTime', () => {
    expect(generateSlots('10:00', '10:00')).toEqual([])
  })

  it('returns [] when endTime is before startTime', () => {
    expect(generateSlots('10:00', '09:00')).toEqual([])
  })

  it('returns one slot when window is exactly 30 min', () => {
    expect(generateSlots('09:00', '09:30')).toEqual(['09:00'])
  })

  it('returns two slots for a 60-min window', () => {
    expect(generateSlots('09:00', '10:00')).toEqual(['09:00', '09:30'])
  })

  it('always generates slots on 30-min boundaries regardless of arguments', () => {
    // 09:30 to 11:30 → 09:30, 10:00, 10:30, 11:00
    expect(generateSlots('09:30', '11:30')).toEqual(['09:30', '10:00', '10:30', '11:00'])
  })

  it('generates a full 9-to-18 working day correctly (18 slots)', () => {
    const slots = generateSlots('09:00', '18:00')
    expect(slots).toHaveLength(18)
    expect(slots[0]).toBe('09:00')
    expect(slots[slots.length - 1]).toBe('17:30')
  })

  it('pads single-digit hours correctly (e.g. 09:00 not 9:00)', () => {
    const slots = generateSlots('08:00', '09:00')
    expect(slots[0]).toBe('08:00')
  })

  it('handles midnight-crossing times gracefully (e.g. 23:30 to 24:00)', () => {
    expect(generateSlots('23:30', '24:00')).toEqual(['23:30'])
  })
})

describe('isSlotUnavailable — edge cases', () => {
  const date = '2026-07-01'

  it('unavailable when slot extends past working hours (slotEnd > workEnd)', () => {
    // 17:30 + 60 min = 18:30 > 18:00 end
    expect(isSlotUnavailable('17:30', date, 60, '18:00', [])).toBe(true)
  })

  it('available when slot ends exactly at working hours end', () => {
    // 17:00 + 60 min = 18:00 = workEnd → NOT past end
    expect(isSlotUnavailable('17:00', date, 60, '18:00', [])).toBe(false)
  })

  it('unavailable when slot overlaps the start of a booking', () => {
    const booked = [{ startTime: `${date}T10:00:00Z`, endTime: `${date}T11:00:00Z` }]
    // 09:30 + 60min = 10:30 → overlaps [10:00, 11:00)
    expect(isSlotUnavailable('09:30', date, 60, '18:00', booked)).toBe(true)
  })

  it('unavailable when slot is fully inside a booking', () => {
    const booked = [{ startTime: `${date}T09:00:00Z`, endTime: `${date}T12:00:00Z` }]
    expect(isSlotUnavailable('10:00', date, 60, '18:00', booked)).toBe(true)
  })

  it('available when slot ends exactly when the booking starts (no overlap)', () => {
    const booked = [{ startTime: `${date}T11:00:00Z`, endTime: `${date}T12:00:00Z` }]
    // 10:00 + 60min = 11:00 = bStart → bStart < slotEnd is false (not strict <)
    expect(isSlotUnavailable('10:00', date, 60, '18:00', booked)).toBe(false)
  })

  it('available when slot starts exactly when the booking ends (no overlap)', () => {
    const booked = [{ startTime: `${date}T10:00:00Z`, endTime: `${date}T11:00:00Z` }]
    // bEnd(11:00) > slotStart(11:00) is false → no overlap
    expect(isSlotUnavailable('11:00', date, 60, '18:00', booked)).toBe(false)
  })

  it('returns false with empty booked slots', () => {
    expect(isSlotUnavailable('10:00', date, 60, '18:00', [])).toBe(false)
  })

  it('blocked by a 30-min duration booking (shorter than slot step)', () => {
    const booked = [{ startTime: `${date}T10:00:00Z`, endTime: `${date}T10:30:00Z` }]
    expect(isSlotUnavailable('10:00', date, 30, '18:00', booked)).toBe(true)
  })

  it('handles multiple bookings, only checks overlap not count', () => {
    const booked = [
      { startTime: `${date}T09:00:00Z`, endTime: `${date}T10:00:00Z` },
      { startTime: `${date}T14:00:00Z`, endTime: `${date}T15:00:00Z` },
    ]
    expect(isSlotUnavailable('12:00', date, 60, '18:00', booked)).toBe(false)
    expect(isSlotUnavailable('14:30', date, 60, '18:00', booked)).toBe(true)
  })
})

describe('toDateStr', () => {
  it('formats date as YYYY-MM-DD with zero-padded month and day', () => {
    expect(toDateStr(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('handles December (month index 11)', () => {
    expect(toDateStr(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('handles single-digit day', () => {
    expect(toDateStr(new Date(2026, 5, 1))).toBe('2026-06-01')
  })
})

describe('computeDateAvailability — edge cases', () => {
  const date = '2026-07-01'

  it('fullyBooked is true when duration makes every generated slot extend past workEnd', () => {
    // 09:00–09:30 generates one slot (09:00). 09:00 + 60min = 10:00 > 09:30 → unavailable → fullyBooked
    const hours = { startTime: '09:00', endTime: '09:30', isActive: true }
    const result = computeDateAvailability(date, hours, 60, [])
    expect(result.workingDay).toBe(true)
    expect(result.fullyBooked).toBe(true)
  })

  it('uses todayNowMinutes to skip past slots and detect fullyBooked', () => {
    // 09:00–10:00 → slots: 09:00, 09:30
    // nowMinutes = 9*60+31 = 571 → slot 09:00 (540) <= 571 skipped, 09:30 (570) <= 571 skipped → fullyBooked
    const hours = { startTime: '09:00', endTime: '10:00', isActive: true }
    const result = computeDateAvailability(date, hours, 30, [], 9 * 60 + 31)
    expect(result.workingDay).toBe(true)
    expect(result.fullyBooked).toBe(true)
  })

  it('does not skip past slots when todayNowMinutes is not provided', () => {
    // Without nowMinutes, early morning slots are not filtered
    const hours = { startTime: '00:00', endTime: '01:00', isActive: true }
    const result = computeDateAvailability(date, hours, 30, [], undefined)
    expect(result.fullyBooked).toBe(false)
  })

  it('slot at exactly nowMinutes is skipped (≤ not <)', () => {
    // 09:00 → 540 min; nowMinutes=540 → 540 <= 540 → skipped
    const hours = { startTime: '09:00', endTime: '10:30', isActive: true }
    // slots: 09:00, 09:30, 10:00 → 09:00 skipped (≤540), 09:30 and 10:00 remain → NOT fullyBooked
    const result = computeDateAvailability(date, hours, 30, [], 9 * 60)
    expect(result.fullyBooked).toBe(false)
  })

  it('returns workingDay: false and fullyBooked: false when isActive is false', () => {
    const hours = { startTime: '09:00', endTime: '18:00', isActive: false }
    expect(computeDateAvailability(date, hours, 60, [])).toEqual({ workingDay: false, fullyBooked: false })
  })

  it('returns workingDay: false when workingHours is undefined', () => {
    expect(computeDateAvailability(date, undefined, 60, [])).toEqual({ workingDay: false, fullyBooked: false })
  })

  it('workingDay: true, fullyBooked: false when there are available slots and no bookings', () => {
    const hours = { startTime: '09:00', endTime: '18:00', isActive: true }
    const result = computeDateAvailability(date, hours, 60, [])
    expect(result.workingDay).toBe(true)
    expect(result.fullyBooked).toBe(false)
  })
})
