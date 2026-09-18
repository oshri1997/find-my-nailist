import { getIsraeliChag, isObservedYomHaAtzmaut, resolveAvailabilityIntervals } from '@/lib/holiday-availability'

const weekly = { isActive: true, startTime: '09:00', endTime: '18:00' }

describe('holiday availability policy', () => {
  it('recognizes a full Israeli holiday, by its specific name, but not a normal weekday', () => {
    expect(getIsraeliChag('2026-09-21')).toEqual({ date: '2026-09-21', name: 'יום הכיפורים' })
    expect(getIsraeliChag('2026-09-22')).toBeNull()
  })

  it('calculates Israeli holidays in future years without a network request', () => {
    expect(getIsraeliChag('2027-10-11')).toEqual({ date: '2027-10-11', name: 'יום הכיפורים' })
  })

  it('names each Israeli Yom Tov specifically, not a generic label', () => {
    expect(getIsraeliChag('2026-09-13')).toEqual({ date: '2026-09-13', name: 'ראש השנה' })
    expect(getIsraeliChag('2026-09-26')).toEqual({ date: '2026-09-26', name: 'סוכות' })
    expect(getIsraeliChag('2026-10-03')).toEqual({ date: '2026-10-03', name: 'שמחת תורה' })
    expect(getIsraeliChag('2027-04-22')).toEqual({ date: '2027-04-22', name: 'פסח' })
    expect(getIsraeliChag('2027-04-28')).toEqual({ date: '2027-04-28', name: 'שביעי של פסח' })
    expect(getIsraeliChag('2027-06-11')).toEqual({ date: '2027-06-11', name: 'שבועות' })
  })

  it('includes Independence Day on its current observed date rules', () => {
    // 5 Iyar 5784 was Monday, so the holiday moved forward to 6 Iyar.
    expect(isObservedYomHaAtzmaut('2024-05-14')).toBe(true)
    expect(isObservedYomHaAtzmaut('2024-05-13')).toBe(false)
    // 5 Iyar 5785 was Shabbat, so the holiday moved back to Thursday 3 Iyar.
    expect(isObservedYomHaAtzmaut('2025-05-01')).toBe(true)
    expect(isObservedYomHaAtzmaut('2025-05-02')).toBe(false)
    // Future-year support: 5 Iyar 5787 is a regular Wednesday observance.
    expect(getIsraeliChag('2027-05-12')).toEqual({ date: '2027-05-12', name: 'יום העצמאות' })
  })

  it('closes a weekly working day when holiday closure is enabled', () => {
    expect(resolveAvailabilityIntervals('2026-09-21', weekly, true)).toEqual([])
  })

  it('closes legacy profiles whose preference is missing', () => {
    expect(resolveAvailabilityIntervals('2026-09-21', weekly, undefined)).toEqual([])
  })

  it('keeps a holiday working day only when the nailist explicitly opts out', () => {
    expect(resolveAvailabilityIntervals('2026-09-21', weekly, false)).toEqual([{ start: '09:00', end: '18:00' }])
  })

  it('gives a date opening precedence over holiday closure and weekly hours', () => {
    expect(resolveAvailabilityIntervals('2026-09-21', undefined, true, {
      date: '2026-09-21', mode: 'OPEN', startTime: '10:00', endTime: '14:00',
    })).toEqual([{ start: '10:00', end: '14:00' }])
  })

  it('gives a manual closure precedence over regular weekly hours', () => {
    expect(resolveAvailabilityIntervals('2026-09-22', weekly, false, {
      date: '2026-09-22', mode: 'CLOSED',
    })).toEqual([])
  })

  it('a date override REPLACES weekly hours rather than adding to them', () => {
    expect(resolveAvailabilityIntervals('2026-09-20', weekly, false, {
      date: '2026-09-20', mode: 'OPEN', startTime: '10:00', endTime: '12:00',
    })).toEqual([{ start: '10:00', end: '12:00' }])
  })

  it('supports a multi-interval date override', () => {
    expect(resolveAvailabilityIntervals('2026-09-20', weekly, false, {
      date: '2026-09-20',
      mode: 'OPEN',
      intervals: [{ start: '10:00', end: '12:00' }, { start: '15:00', end: '17:00' }],
    })).toEqual([{ start: '10:00', end: '12:00' }, { start: '15:00', end: '17:00' }])
  })

  it('supports multi-interval weekly hours (split shift)', () => {
    const splitWeekly = { isActive: true, intervals: [{ start: '09:00', end: '13:00' }, { start: '15:00', end: '19:00' }] }
    expect(resolveAvailabilityIntervals('2026-09-20', splitWeekly, false)).toEqual([
      { start: '09:00', end: '13:00' },
      { start: '15:00', end: '19:00' },
    ])
  })
})
