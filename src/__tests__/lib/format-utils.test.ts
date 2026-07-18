import { formatDistance, formatNextSlotLabel } from '@/lib/format-utils'

describe('formatDistance', () => {
  it('shows meters for distances under 1 km', () => {
    expect(formatDistance(0.5)).toBe("500 מ׳")
    expect(formatDistance(0.1)).toBe("100 מ׳")
  })

  it('shows km with one decimal for distances of 1 km and over', () => {
    expect(formatDistance(1.0)).toBe('1.0 ק"מ')
    expect(formatDistance(5.5)).toBe('5.5 ק"מ')
    expect(formatDistance(12.3)).toBe('12.3 ק"מ')
  })

  it('rounds meters to nearest integer', () => {
    expect(formatDistance(0.1234)).toBe("123 מ׳")
    expect(formatDistance(0.9996)).toBe("1000 מ׳")
  })

  it('handles zero distance', () => {
    expect(formatDistance(0)).toBe("0 מ׳")
  })

  it('shows one decimal place for km (no trailing zeros beyond one place)', () => {
    expect(formatDistance(2.0)).toBe('2.0 ק"מ')
    expect(formatDistance(10.0)).toBe('10.0 ק"מ')
  })
})

describe('formatNextSlotLabel', () => {
  // 2026-06-10 is a Wednesday (Israel calendar date).
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-06-10T08:00:00.000Z')) // mid-day Israel time
  })
  afterEach(() => jest.useRealTimers())

  it('labels a slot on today as "היום"', () => {
    expect(formatNextSlotLabel('2026-06-10', '14:00')).toBe('היום, 14:00')
  })

  it('labels a slot tomorrow as "מחר"', () => {
    expect(formatNextSlotLabel('2026-06-11', '09:30')).toBe('מחר, 09:30')
  })

  it('labels a slot further out with weekday + date', () => {
    expect(formatNextSlotLabel('2026-06-17', '11:00')).toBe('יום רביעי, 17.06 · 11:00')
  })

  it('rolls over correctly when tomorrow crosses into the next month', () => {
    jest.setSystemTime(new Date('2026-06-29T08:00:00.000Z')) // June 29 Israel time
    expect(formatNextSlotLabel('2026-06-30', '10:00')).toBe('מחר, 10:00')
  })
})
