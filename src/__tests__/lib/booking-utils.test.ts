import { generateSlots, isSlotUnavailable, buildDateStrip, buildMonthCalendar, toDateStr, computeDateAvailability, filterExpiredConfirmed } from '@/lib/booking-utils'

describe('buildMonthCalendar', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  describe('June 2025 — month starts on Sunday (getDay() = 0, no leading nulls)', () => {
    beforeEach(() => {
      jest.setSystemTime(new Date(2025, 5, 15)) // June 15, 2025
    })

    it('returns 30 cells (0 leading nulls + 30 days)', () => {
      expect(buildMonthCalendar()).toHaveLength(30)
    })

    it('all elements are Date objects (no nulls)', () => {
      const cal = buildMonthCalendar()
      expect(cal.every((d) => d !== null)).toBe(true)
    })

    it('first element is June 1', () => {
      const first = buildMonthCalendar()[0] as Date
      expect(first.getDate()).toBe(1)
      expect(first.getMonth()).toBe(5)
    })

    it('last element is June 30', () => {
      const cal = buildMonthCalendar()
      const last = cal[cal.length - 1] as Date
      expect(last.getDate()).toBe(30)
    })
  })

  describe('January 2025 — month starts on Wednesday (getDay() = 3, 3 leading nulls)', () => {
    beforeEach(() => {
      jest.setSystemTime(new Date(2025, 0, 15)) // January 15, 2025
    })

    it('returns 34 cells (3 leading nulls + 31 days)', () => {
      expect(buildMonthCalendar()).toHaveLength(34)
    })

    it('first 3 elements are null', () => {
      const cal = buildMonthCalendar()
      expect(cal[0]).toBeNull()
      expect(cal[1]).toBeNull()
      expect(cal[2]).toBeNull()
    })

    it('element at index 3 is January 1 (first real date)', () => {
      const cal = buildMonthCalendar()
      const first = cal[3] as Date
      expect(first).not.toBeNull()
      expect(first.getDate()).toBe(1)
      expect(first.getMonth()).toBe(0)
      expect(first.getFullYear()).toBe(2025)
    })

    it('last element is January 31', () => {
      const cal = buildMonthCalendar()
      const last = cal[cal.length - 1] as Date
      expect(last.getDate()).toBe(31)
    })

    it('all non-null elements are in January 2025', () => {
      const cal = buildMonthCalendar()
      const dates = cal.filter((d): d is Date => d !== null)
      expect(dates.every((d) => d.getMonth() === 0 && d.getFullYear() === 2025)).toBe(true)
    })

    it('non-null dates are consecutive days', () => {
      const cal = buildMonthCalendar()
      const dates = cal.filter((d): d is Date => d !== null)
      for (let i = 1; i < dates.length; i++) {
        const diff = (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
        expect(diff).toBe(1)
      }
    })

    it('exactly 31 non-null dates', () => {
      const cal = buildMonthCalendar()
      const dates = cal.filter((d) => d !== null)
      expect(dates).toHaveLength(31)
    })
  })

  describe('February 2025 — 28 days (non-leap year)', () => {
    beforeEach(() => {
      jest.setSystemTime(new Date(2025, 1, 10)) // February 10, 2025
    })

    it('has exactly 28 non-null dates', () => {
      const cal = buildMonthCalendar()
      const dates = cal.filter((d) => d !== null)
      expect(dates).toHaveLength(28)
    })

    it('last non-null date is February 28', () => {
      const cal = buildMonthCalendar()
      const last = cal[cal.length - 1] as Date
      expect(last.getDate()).toBe(28)
      expect(last.getMonth()).toBe(1)
    })
  })

  it('today date object is at midnight (hours/minutes/seconds = 0)', () => {
    jest.setSystemTime(new Date(2025, 5, 20, 14, 30, 0)) // June 20 at 2:30 PM
    const cal = buildMonthCalendar()
    const dates = cal.filter((d): d is Date => d !== null)
    for (const d of dates) {
      expect(d.getHours()).toBe(0)
      expect(d.getMinutes()).toBe(0)
      expect(d.getSeconds()).toBe(0)
    }
  })
})

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

describe('computeDateAvailability', () => {
  const date = '2024-06-15'

  it('returns workingDay:false when no working hours provided', () => {
    expect(computeDateAvailability(date, undefined, 60, [])).toEqual({ workingDay: false, fullyBooked: false })
  })

  it('returns workingDay:false when isActive is false', () => {
    const hours = { startTime: '09:00', endTime: '18:00', isActive: false }
    expect(computeDateAvailability(date, hours, 60, [])).toEqual({ workingDay: false, fullyBooked: false })
  })

  it('returns workingDay:true and fullyBooked:false when no appointments', () => {
    const hours = { startTime: '09:00', endTime: '18:00', isActive: true }
    const result = computeDateAvailability(date, hours, 60, [])
    expect(result.workingDay).toBe(true)
    expect(result.fullyBooked).toBe(false)
  })

  it('returns fullyBooked:true when all slots are taken', () => {
    const hours = { startTime: '09:00', endTime: '10:00', isActive: true }
    // Only slot is 09:00–10:00, which is fully booked
    const booked = [{ startTime: `${date}T09:00:00`, endTime: `${date}T10:00:00` }]
    const result = computeDateAvailability(date, hours, 60, booked)
    expect(result.workingDay).toBe(true)
    expect(result.fullyBooked).toBe(true)
  })

  it('returns fullyBooked:false when at least one slot is free', () => {
    const hours = { startTime: '09:00', endTime: '11:00', isActive: true }
    // 09:00 is booked but 10:00 is free
    const booked = [{ startTime: `${date}T09:00:00`, endTime: `${date}T10:00:00` }]
    const result = computeDateAvailability(date, hours, 60, booked)
    expect(result.workingDay).toBe(true)
    expect(result.fullyBooked).toBe(false)
  })

  it('accounts for duration when checking fullyBooked', () => {
    // 09:00–11:00 = slots: 09:00, 09:30, 10:00, 10:30
    // with 90-min duration: 09:00 ok, 09:30 ok, 10:00 extends to 11:30 (over end) → unavailable
    // 09:30 extends to 11:00 → exactly at end → available
    const hours = { startTime: '09:00', endTime: '11:00', isActive: true }
    const result = computeDateAvailability(date, hours, 90, [])
    expect(result.workingDay).toBe(true)
    expect(result.fullyBooked).toBe(false)
  })
})

describe('filterExpiredConfirmed', () => {
  const now = new Date('2024-06-15T12:00:00')

  it('returns IDs of CONFIRMED appointments past their endTime', () => {
    const appointments = [
      { id: 'a1', status: 'CONFIRMED', endTime: new Date('2024-06-15T10:00:00') },
      { id: 'a2', status: 'CONFIRMED', endTime: new Date('2024-06-15T14:00:00') },
    ]
    expect(filterExpiredConfirmed(appointments, now)).toEqual(['a1'])
  })

  it('ignores non-CONFIRMED appointments even if past endTime', () => {
    const appointments = [
      { id: 'a1', status: 'PENDING', endTime: new Date('2024-06-15T10:00:00') },
      { id: 'a2', status: 'COMPLETED', endTime: new Date('2024-06-14T10:00:00') },
    ]
    expect(filterExpiredConfirmed(appointments, now)).toEqual([])
  })

  it('returns empty array when no appointments expired', () => {
    const appointments = [
      { id: 'a1', status: 'CONFIRMED', endTime: new Date('2024-06-15T14:00:00') },
    ]
    expect(filterExpiredConfirmed(appointments, now)).toEqual([])
  })

  it('handles empty list', () => {
    expect(filterExpiredConfirmed([], now)).toEqual([])
  })
})
