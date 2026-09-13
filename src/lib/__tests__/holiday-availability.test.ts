import { getIsraeliChag, isObservedYomHaAtzmaut, resolveAvailabilityHours } from '@/lib/holiday-availability'

const weekly = { isActive: true, startTime: '09:00', endTime: '18:00' }

describe('holiday availability policy', () => {
  it('recognizes a full Israeli holiday but not a normal weekday', () => {
    expect(getIsraeliChag('2026-09-21')).toEqual({ date: '2026-09-21', name: 'חג ישראלי' })
    expect(getIsraeliChag('2026-09-22')).toBeNull()
  })

  it('calculates Israeli holidays in future years without a network request', () => {
    expect(getIsraeliChag('2027-10-11')).toEqual({ date: '2027-10-11', name: 'חג ישראלי' })
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
    expect(resolveAvailabilityHours('2026-09-21', weekly, true)).toBeUndefined()
  })

  it('closes legacy profiles whose preference is missing', () => {
    expect(resolveAvailabilityHours('2026-09-21', weekly, undefined)).toBeUndefined()
  })

  it('keeps a holiday working day only when the nailist explicitly opts out', () => {
    expect(resolveAvailabilityHours('2026-09-21', weekly, false)).toEqual(weekly)
  })

  it('gives a date opening precedence over holiday closure and weekly hours', () => {
    expect(resolveAvailabilityHours('2026-09-21', undefined, true, {
      date: '2026-09-21', mode: 'OPEN', startTime: '10:00', endTime: '14:00',
    })).toEqual({ isActive: true, startTime: '10:00', endTime: '14:00' })
  })

  it('gives a manual closure precedence over regular weekly hours', () => {
    expect(resolveAvailabilityHours('2026-09-22', weekly, false, {
      date: '2026-09-22', mode: 'CLOSED',
    })).toBeUndefined()
  })
})
