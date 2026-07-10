import { toBitUrl, formatBitPhoneDisplay } from '../bit'

describe('toBitUrl', () => {
  it('converts Israeli 05X format to international digits', () => {
    expect(toBitUrl('0501234567')).toBe('bit://pay/972501234567')
  })

  it('accepts already-international format', () => {
    expect(toBitUrl('972501234567')).toBe('bit://pay/972501234567')
  })

  it('accepts +972 format by stripping the +', () => {
    expect(toBitUrl('+972501234567')).toBe('bit://pay/972501234567')
  })

  it('strips dashes and spaces', () => {
    expect(toBitUrl('050-123-4567')).toBe('bit://pay/972501234567')
  })

  it('appends the amount as a query param when provided', () => {
    expect(toBitUrl('0501234567', 30)).toBe('bit://pay/972501234567?amount=30')
  })

  it('omits the amount param when not provided', () => {
    const url = toBitUrl('0501234567')
    expect(url).not.toContain('?amount=')
  })
})

describe('formatBitPhoneDisplay', () => {
  it('formats a local 05X number with dashes', () => {
    expect(formatBitPhoneDisplay('0501234567')).toBe('050-123-4567')
  })

  it('formats an international 972 number the same way', () => {
    expect(formatBitPhoneDisplay('972501234567')).toBe('050-123-4567')
  })

  it('strips existing dashes/spaces before reformatting', () => {
    expect(formatBitPhoneDisplay('050 123 4567')).toBe('050-123-4567')
  })

  it('returns the raw input unchanged if it is not a recognizable 10-digit number', () => {
    expect(formatBitPhoneDisplay('123')).toBe('123')
  })
})
