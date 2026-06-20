import { generateSlots, isSlotUnavailable, buildDateStrip, toDateStr } from '@/lib/booking-utils'

describe('toDateStr', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toDateStr(new Date(2024, 2, 15))).toBe('2024-03-15')
  })

  it('pads single-digit month and day with leading zeros', () => {
    expect(toDateStr(new Date(2024, 0, 5))).toBe('2024-01-05')
  })

  it('handles end-of-year dates', () => {
    expect(toDateStr(new Date(2024, 11, 31))).toBe('2024-12-31')
  })
})

describe('buildDateStrip', () => {
  it('returns the requested number of dates', () => {
    expect(buildDateStrip(7)).toHaveLength(7)
    expect(buildDateStrip(21)).toHaveLength(21)
  })

  it('defaults to 21 dates', () => {
    expect(buildDateStrip()).toHaveLength(21)
  })

  it('first date is today at midnight', () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const strip = buildDateStrip(3)
    expect(strip[0].getTime()).toBe(today.getTime())
  })

  it('dates are consecutive days', () => {
    const strip = buildDateStrip(5)
    for (let i = 1; i < strip.length; i++) {
      const diff = (strip[i].getTime() - strip[i - 1].getTime()) / (1000 * 60 * 60 * 24)
      expect(diff).toBe(1)
    }
  })
})

describe('generateSlots', () => {
  it('generates 30-minute slots', () => {
    expect(generateSlots('09:00', '10:30')).toEqual(['09:00', '09:30', '10:00'])
  })

  it('returns empty array when start equals end', () => {
    expect(generateSlots('09:00', '09:00')).toEqual([])
  })

  it('returns empty array when end is before start', () => {
    expect(generateSlots('10:00', '09:00')).toEqual([])
  })

  it('handles half-hour start time', () => {
    expect(generateSlots('10:30', '12:00')).toEqual(['10:30', '11:00', '11:30'])
  })

  it('generates a full day of slots', () => {
    const slots = generateSlots('09:00', '18:00')
    expect(slots).toHaveLength(18)
    expect(slots[0]).toBe('09:00')
    expect(slots[slots.length - 1]).toBe('17:30')
  })
})

describe('isSlotUnavailable', () => {
  const date = '2024-06-15'

  it('is available when there are no bookings', () => {
    expect(isSlotUnavailable('09:00', date, 60, '18:00', [])).toBe(false)
  })

  it('is unavailable when slot extends past working hours end', () => {
    expect(isSlotUnavailable('17:30', date, 60, '18:00', [])).toBe(true)
  })

  it('is available when slot ends exactly at working hours end', () => {
    expect(isSlotUnavailable('17:00', date, 60, '18:00', [])).toBe(false)
  })

  it('is unavailable when overlapping a booked slot', () => {
    const booked = [{ startTime: `${date}T10:00:00`, endTime: `${date}T11:00:00` }]
    // 09:30–10:30 overlaps 10:00–11:00
    expect(isSlotUnavailable('09:30', date, 60, '18:00', booked)).toBe(true)
  })

  it('is unavailable when fully inside a booked slot', () => {
    const booked = [{ startTime: `${date}T10:00:00`, endTime: `${date}T12:00:00` }]
    expect(isSlotUnavailable('10:30', date, 30, '18:00', booked)).toBe(true)
  })

  it('is available immediately after a booked slot ends', () => {
    const booked = [{ startTime: `${date}T10:00:00`, endTime: `${date}T11:00:00` }]
    expect(isSlotUnavailable('11:00', date, 60, '18:00', booked)).toBe(false)
  })

  it('is available for a slot that ends exactly when a booking starts', () => {
    const booked = [{ startTime: `${date}T10:00:00`, endTime: `${date}T11:00:00` }]
    expect(isSlotUnavailable('09:00', date, 60, '18:00', booked)).toBe(false)
  })

  it('handles multiple booked slots', () => {
    const booked = [
      { startTime: `${date}T10:00:00`, endTime: `${date}T11:00:00` },
      { startTime: `${date}T14:00:00`, endTime: `${date}T15:00:00` },
    ]
    expect(isSlotUnavailable('10:00', date, 60, '18:00', booked)).toBe(true)
    expect(isSlotUnavailable('13:00', date, 60, '18:00', booked)).toBe(false)
    expect(isSlotUnavailable('14:30', date, 60, '18:00', booked)).toBe(true)
  })
})
