import {
  validateIntervals,
  sortIntervals,
  normalizeDayAvailability,
  isValidTimeStr,
} from '../availability-intervals'

describe('validateIntervals', () => {
  it('accepts a single valid interval', () => {
    expect(validateIntervals([{ start: '09:00', end: '13:00' }])).toBeNull()
  })

  it('accepts two non-overlapping intervals', () => {
    expect(validateIntervals([
      { start: '09:00', end: '13:00' },
      { start: '15:00', end: '19:00' },
    ])).toBeNull()
  })

  it('accepts touching intervals under [start, end) semantics', () => {
    expect(validateIntervals([
      { start: '09:00', end: '13:00' },
      { start: '13:00', end: '18:00' },
    ])).toBeNull()
  })

  it('rejects overlapping intervals', () => {
    expect(validateIntervals([
      { start: '09:00', end: '14:00' },
      { start: '13:00', end: '18:00' },
    ])).not.toBeNull()
  })

  it('rejects start after end', () => {
    expect(validateIntervals([{ start: '13:00', end: '09:00' }])).not.toBeNull()
  })

  it('rejects start === end', () => {
    expect(validateIntervals([{ start: '09:00', end: '09:00' }])).not.toBeNull()
  })

  it('accepts an empty array (closed day)', () => {
    expect(validateIntervals([])).toBeNull()
  })

  it('rejects malformed time strings', () => {
    expect(validateIntervals([{ start: '9:00', end: '13:00' }])).not.toBeNull()
    expect(validateIntervals([{ start: '09:00', end: '25:00' }])).not.toBeNull()
  })

  it('validates overlap regardless of input order', () => {
    expect(validateIntervals([
      { start: '15:00', end: '18:00' },
      { start: '14:00', end: '16:00' },
    ])).not.toBeNull()
  })
})

describe('sortIntervals', () => {
  it('sorts intervals by start time deterministically', () => {
    expect(sortIntervals([
      { start: '15:00', end: '18:00' },
      { start: '09:00', end: '13:00' },
    ])).toEqual([
      { start: '09:00', end: '13:00' },
      { start: '15:00', end: '18:00' },
    ])
  })

  it('does not mutate the input array', () => {
    const input = [{ start: '15:00', end: '18:00' }, { start: '09:00', end: '13:00' }]
    const copy = [...input]
    sortIntervals(input)
    expect(input).toEqual(copy)
  })
})

describe('isValidTimeStr', () => {
  it('accepts well-formed HH:MM', () => {
    expect(isValidTimeStr('09:00')).toBe(true)
    expect(isValidTimeStr('23:59')).toBe(true)
  })

  it('rejects malformed values', () => {
    expect(isValidTimeStr('9:00')).toBe(false)
    expect(isValidTimeStr('24:00')).toBe(false)
    expect(isValidTimeStr(undefined)).toBe(false)
    expect(isValidTimeStr(null)).toBe(false)
    expect(isValidTimeStr(123)).toBe(false)
  })
})

describe('normalizeDayAvailability — legacy format', () => {
  it('normalizes a legacy single-window active day', () => {
    expect(normalizeDayAvailability({ isActive: true, startTime: '09:00', endTime: '18:00' }))
      .toEqual([{ start: '09:00', end: '18:00' }])
  })

  it('normalizes a legacy closed day (isActive: false) to []', () => {
    expect(normalizeDayAvailability({ isActive: false, startTime: '09:00', endTime: '18:00' })).toEqual([])
  })

  it('fails safe to closed when startTime is missing', () => {
    expect(normalizeDayAvailability({ isActive: true, endTime: '18:00' })).toEqual([])
  })

  it('fails safe to closed when endTime is missing', () => {
    expect(normalizeDayAvailability({ isActive: true, startTime: '09:00' })).toEqual([])
  })

  it('fails safe to closed on malformed time strings', () => {
    expect(normalizeDayAvailability({ isActive: true, startTime: '9am', endTime: '6pm' })).toEqual([])
  })

  it('fails safe to closed when startTime >= endTime', () => {
    expect(normalizeDayAvailability({ isActive: true, startTime: '18:00', endTime: '09:00' })).toEqual([])
  })

  it('treats undefined/empty raw data as closed', () => {
    expect(normalizeDayAvailability(undefined)).toEqual([])
    expect(normalizeDayAvailability(null)).toEqual([])
    expect(normalizeDayAvailability({})).toEqual([])
  })
})

describe('normalizeDayAvailability — new intervals[] format', () => {
  it('normalizes a single-interval new-format day identically to legacy', () => {
    expect(normalizeDayAvailability({ isActive: true, intervals: [{ start: '09:00', end: '18:00' }] }))
      .toEqual([{ start: '09:00', end: '18:00' }])
  })

  it('normalizes split-shift intervals, sorted', () => {
    expect(normalizeDayAvailability({
      isActive: true,
      intervals: [{ start: '15:00', end: '19:00' }, { start: '09:00', end: '13:00' }],
    })).toEqual([
      { start: '09:00', end: '13:00' },
      { start: '15:00', end: '19:00' },
    ])
  })

  it('fails safe to closed when intervals overlap', () => {
    expect(normalizeDayAvailability({
      isActive: true,
      intervals: [{ start: '09:00', end: '14:00' }, { start: '13:00', end: '18:00' }],
    })).toEqual([])
  })

  it('respects isActive: false even with valid intervals present', () => {
    expect(normalizeDayAvailability({
      isActive: false,
      intervals: [{ start: '09:00', end: '18:00' }],
    })).toEqual([])
  })

  it('intervals[] takes precedence over legacy startTime/endTime when both present', () => {
    expect(normalizeDayAvailability({
      isActive: true,
      startTime: '09:00',
      endTime: '18:00',
      intervals: [{ start: '10:00', end: '12:00' }],
    })).toEqual([{ start: '10:00', end: '12:00' }])
  })

  it('falls back to legacy fields when intervals is an empty array', () => {
    expect(normalizeDayAvailability({
      isActive: true,
      startTime: '09:00',
      endTime: '18:00',
      intervals: [],
    })).toEqual([{ start: '09:00', end: '18:00' }])
  })
})
