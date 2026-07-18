import { generateSlots, isSlotUnavailable, buildDateStrip, buildMonthCalendar, toDateStr, computeDateAvailability, filterExpiredConfirmed, israelWallClockToUtc, todayInIsrael, findFirstAvailableSlot, findNextAvailableSlot, israelNow, getDayOfWeek, addDays } from '@/lib/booking-utils'

// bookedSlots in production are real UTC instants derived from Israel
// wall-clock booking times — construct test fixtures the same way instead of
// a naive `${date}T{time}:00` literal (parsed in the *test runner's* local
// timezone, not Israel's).
function israelSlot(date: string, time: string): string {
  return israelWallClockToUtc(date, time).toISOString()
}

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
    const booked = [{ startTime: israelSlot(date, '10:00'), endTime: israelSlot(date, '11:00') }]
    // 09:30–10:30 overlaps 10:00–11:00
    expect(isSlotUnavailable('09:30', date, 60, '18:00', booked)).toBe(true)
  })

  it('is unavailable when fully inside a booked slot', () => {
    const booked = [{ startTime: israelSlot(date, '10:00'), endTime: israelSlot(date, '12:00') }]
    expect(isSlotUnavailable('10:30', date, 30, '18:00', booked)).toBe(true)
  })

  it('is available immediately after a booked slot ends', () => {
    const booked = [{ startTime: israelSlot(date, '10:00'), endTime: israelSlot(date, '11:00') }]
    expect(isSlotUnavailable('11:00', date, 60, '18:00', booked)).toBe(false)
  })

  it('is available for a slot that ends exactly when a booking starts', () => {
    const booked = [{ startTime: israelSlot(date, '10:00'), endTime: israelSlot(date, '11:00') }]
    expect(isSlotUnavailable('09:00', date, 60, '18:00', booked)).toBe(false)
  })

  it('handles multiple booked slots', () => {
    const booked = [
      { startTime: israelSlot(date, '10:00'), endTime: israelSlot(date, '11:00') },
      { startTime: israelSlot(date, '14:00'), endTime: israelSlot(date, '15:00') },
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
    const booked = [{ startTime: israelSlot(date, '09:00'), endTime: israelSlot(date, '10:00') }]
    const result = computeDateAvailability(date, hours, 60, booked)
    expect(result.workingDay).toBe(true)
    expect(result.fullyBooked).toBe(true)
  })

  it('returns fullyBooked:false when at least one slot is free', () => {
    const hours = { startTime: '09:00', endTime: '11:00', isActive: true }
    // 09:00 is booked but 10:00 is free
    const booked = [{ startTime: israelSlot(date, '09:00'), endTime: israelSlot(date, '10:00') }]
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

describe('todayInIsrael', () => {
  afterEach(() => jest.useRealTimers())

  it('returns the Israel calendar date even when UTC is still on the previous day', () => {
    jest.useFakeTimers()
    // 23:00 UTC on Jan 15 is already 01:00 on Jan 16 in Israel (UTC+2 in January)
    jest.setSystemTime(new Date('2026-01-15T23:00:00.000Z'))
    expect(todayInIsrael()).toBe('2026-01-16')
  })

  it('returns a plain YYYY-MM-DD string mid-day', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-06-10T09:00:00.000Z'))
    expect(todayInIsrael()).toBe('2026-06-10')
  })
})

describe('findFirstAvailableSlot', () => {
  const date = '2024-06-15'

  it('returns null when no working hours provided', () => {
    expect(findFirstAvailableSlot(date, undefined, 60, [])).toBeNull()
  })

  it('returns null when isActive is false', () => {
    const hours = { startTime: '09:00', endTime: '18:00', isActive: false }
    expect(findFirstAvailableSlot(date, hours, 60, [])).toBeNull()
  })

  it('returns the first slot of the day when nothing is booked', () => {
    const hours = { startTime: '09:00', endTime: '18:00', isActive: true }
    expect(findFirstAvailableSlot(date, hours, 60, [])).toBe('09:00')
  })

  it('skips booked slots and returns the first free one', () => {
    const hours = { startTime: '09:00', endTime: '12:00', isActive: true }
    const booked = [{ startTime: israelSlot(date, '09:00'), endTime: israelSlot(date, '10:00') }]
    expect(findFirstAvailableSlot(date, hours, 60, booked)).toBe('10:00')
  })

  it('returns null when every slot is booked', () => {
    const hours = { startTime: '09:00', endTime: '10:00', isActive: true }
    const booked = [{ startTime: israelSlot(date, '09:00'), endTime: israelSlot(date, '10:00') }]
    expect(findFirstAvailableSlot(date, hours, 60, booked)).toBeNull()
  })

  it('skips already-elapsed slots when nowMinutes is given', () => {
    const hours = { startTime: '09:00', endTime: '12:00', isActive: true }
    // 09:00 and 09:30 have already passed (nowMinutes = 09:45)
    expect(findFirstAvailableSlot(date, hours, 30, [], 9 * 60 + 45)).toBe('10:00')
  })
})

describe('getDayOfWeek', () => {
  it('returns 0 for a Sunday', () => {
    expect(getDayOfWeek('2026-01-18')).toBe(0) // confirmed Sunday
  })

  it('returns 6 for a Saturday', () => {
    expect(getDayOfWeek('2026-01-17')).toBe(6)
  })
})

describe('addDays', () => {
  it('adds days within the same month', () => {
    expect(addDays('2026-01-15', 3)).toBe('2026-01-18')
  })

  it('rolls over into the next month', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02')
  })

  it('rolls over into the next year', () => {
    expect(addDays('2025-12-30', 3)).toBe('2026-01-02')
  })

  it('supports adding 0 days (identity)', () => {
    expect(addDays('2026-03-10', 0)).toBe('2026-03-10')
  })
})

describe('israelNow', () => {
  afterEach(() => jest.useRealTimers())

  it('reports the Israel calendar date and minutes-since-midnight', () => {
    jest.useFakeTimers()
    // 11:30 UTC in June (Israel is UTC+3 in summer) = 14:30 Israel time
    jest.setSystemTime(new Date('2026-06-10T11:30:00.000Z'))
    const { dateStr, minutesSinceMidnight } = israelNow()
    expect(dateStr).toBe('2026-06-10')
    expect(minutesSinceMidnight).toBe(14 * 60 + 30)
  })
})

describe('findNextAvailableSlot', () => {
  afterEach(() => jest.useRealTimers())

  it('returns null when the nailist has no working hours at all', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-06-10T08:00:00.000Z')) // Wed morning, Israel
    expect(findNextAvailableSlot(new Map(), [], 60)).toBeNull()
  })

  it("returns today's first slot when today is a working day with room left", () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-06-10T05:00:00.000Z')) // ~08:00 Israel time, Wednesday (dayOfWeek 3) — before the day opens
    const hours = new Map([[3, { startTime: '09:00', endTime: '18:00', isActive: true }]])
    const result = findNextAvailableSlot(hours, [], 60)
    expect(result).toEqual({ date: '2026-06-10', time: '09:00' })
  })

  it('skips to the next working day when today is fully booked', () => {
    // Only Thursday (dayOfWeek 4) is a working day, and it's entirely booked
    const hours = new Map([[4, { startTime: '09:00', endTime: '10:00', isActive: true }]])
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-06-11T06:00:00.000Z')) // Thursday morning Israel time
    const booked = [{ startTime: israelSlot('2026-06-11', '09:00'), endTime: israelSlot('2026-06-11', '10:00') }]
    const result = findNextAvailableSlot(hours, booked, 60, 21)
    expect(result).not.toBeNull()
    expect(result!.date).toBe('2026-06-18') // next Thursday
    expect(result!.time).toBe('09:00')
  })

  it('returns null when nothing is available within daysToSearch', () => {
    const hours = new Map([[4, { startTime: '09:00', endTime: '10:00', isActive: true }]])
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-06-11T06:00:00.000Z'))
    const booked = [{ startTime: israelSlot('2026-06-11', '09:00'), endTime: israelSlot('2026-06-11', '10:00') }]
    // Only searching 5 days ahead — the next free Thursday is 7 days out
    expect(findNextAvailableSlot(hours, booked, 60, 5)).toBeNull()
  })

  it('excludes already-elapsed slots for today but still finds a later one today', () => {
    const hours = new Map([[3, { startTime: '09:00', endTime: '18:00', isActive: true }]]) // Wednesday
    jest.useFakeTimers()
    // 2026-06-10 is a Wednesday, set to 13:45 Israel time (10:45 UTC in summer) —
    // the 14:00 slot hasn't started yet, so it should still be offered.
    jest.setSystemTime(new Date('2026-06-10T10:45:00.000Z'))
    const result = findNextAvailableSlot(hours, [], 30)
    expect(result).toEqual({ date: '2026-06-10', time: '14:00' })
  })
})
