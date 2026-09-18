import { formatBitPhoneDisplay, toBitUrl } from '@/lib/bit'

describe('toBitUrl', () => {
  it('converts a leading-zero Israeli number to international format', () => {
    expect(toBitUrl('0501234567')).toBe('bit://pay/972501234567')
  })

  it('passes through a number already in international format', () => {
    expect(toBitUrl('972501234567')).toBe('bit://pay/972501234567')
  })

  it('strips non-digit formatting before converting', () => {
    expect(toBitUrl('050-123-4567')).toBe('bit://pay/972501234567')
  })

  it('accepts a +972-prefixed number by stripping the +', () => {
    expect(toBitUrl('+972501234567')).toBe('bit://pay/972501234567')
  })

  it('appends the amount as a query param when given', () => {
    expect(toBitUrl('0501234567', 50)).toBe('bit://pay/972501234567?amount=50')
  })

  it('omits the amount param when none is given', () => {
    expect(toBitUrl('0501234567')).not.toContain('?amount=')
  })
})

describe('formatBitPhoneDisplay', () => {
  it('formats a leading-zero number as 0XX-XXX-XXXX', () => {
    expect(formatBitPhoneDisplay('0501234567')).toBe('050-123-4567')
  })

  it('formats an international-format number the same way', () => {
    expect(formatBitPhoneDisplay('972501234567')).toBe('050-123-4567')
  })

  it('strips existing dashes/spaces before reformatting', () => {
    expect(formatBitPhoneDisplay('050 123 4567')).toBe('050-123-4567')
  })

  it('returns the input unchanged when it is not a recognizable 10-digit number', () => {
    expect(formatBitPhoneDisplay('12345')).toBe('12345')
  })
})
