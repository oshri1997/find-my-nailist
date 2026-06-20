import { formatDistance } from '@/lib/format-utils'

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
