import { haversineDistanceKm, formatCurrency, formatDuration } from '../utils'

describe('haversineDistanceKm', () => {
  it('returns 0 for the same point', () => {
    expect(haversineDistanceKm(32.08, 34.78, 32.08, 34.78)).toBeCloseTo(0)
  })

  it('calculates Tel Aviv to Jerusalem (~54 km straight line)', () => {
    // Tel Aviv: 32.0853, 34.7818  |  Jerusalem: 31.7683, 35.2137
    const dist = haversineDistanceKm(32.0853, 34.7818, 31.7683, 35.2137)
    expect(dist).toBeGreaterThan(50)
    expect(dist).toBeLessThan(60)
  })

  it('calculates Tel Aviv to Haifa (~80 km straight line)', () => {
    // Haifa: 32.794, 34.9896
    const dist = haversineDistanceKm(32.0853, 34.7818, 32.794, 34.9896)
    expect(dist).toBeGreaterThan(70)
    expect(dist).toBeLessThan(95)
  })

  it('is symmetric (A→B == B→A)', () => {
    const ab = haversineDistanceKm(32.08, 34.78, 31.76, 35.21)
    const ba = haversineDistanceKm(31.76, 35.21, 32.08, 34.78)
    expect(ab).toBeCloseTo(ba, 5)
  })

  it('returns a positive number', () => {
    const dist = haversineDistanceKm(0, 0, 1, 1)
    expect(dist).toBeGreaterThan(0)
  })
})

describe('formatCurrency', () => {
  it('formats USD', () => {
    expect(formatCurrency(100, 'USD')).toContain('100')
    expect(formatCurrency(100, 'USD')).toContain('$')
  })

  it('formats ILS', () => {
    const result = formatCurrency(200, 'ILS')
    expect(result).toContain('200')
  })

  it('formats decimal amounts', () => {
    const result = formatCurrency(99.5, 'USD')
    expect(result).toContain('99')
  })
})

describe('formatDuration', () => {
  it('formats minutes under 60', () => {
    expect(formatDuration(30)).toBe('30m')
    expect(formatDuration(45)).toBe('45m')
  })

  it('formats exactly 60 minutes as 1h', () => {
    expect(formatDuration(60)).toBe('1h')
  })

  it('formats 90 minutes as 1h 30m', () => {
    expect(formatDuration(90)).toBe('1h 30m')
  })

  it('formats 120 minutes as 2h', () => {
    expect(formatDuration(120)).toBe('2h')
  })
})
