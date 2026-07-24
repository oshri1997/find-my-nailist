import { isValidIsraeliPhone } from '@/lib/phone'

describe('isValidIsraeliPhone', () => {
  it('accepts real mobile numbers in common formats', () => {
    expect(isValidIsraeliPhone('0501234567')).toBe(true)
    expect(isValidIsraeliPhone('050-1234567')).toBe(true)
    expect(isValidIsraeliPhone('050 123 4567')).toBe(true)
    expect(isValidIsraeliPhone('+972501234567')).toBe(true)
    expect(isValidIsraeliPhone('972501234567')).toBe(true)
  })

  it('accepts real landline numbers', () => {
    expect(isValidIsraeliPhone('021234567')).toBe(true)
    expect(isValidIsraeliPhone('03-1234567')).toBe(true)
  })

  it('rejects a long string of digits pasted with no real phone shape', () => {
    expect(isValidIsraeliPhone('1232131231231231231231231231231231')).toBe(false)
  })

  it('rejects numbers that are too short', () => {
    expect(isValidIsraeliPhone('123456')).toBe(false)
    expect(isValidIsraeliPhone('05012')).toBe(false)
  })

  it('rejects non-numeric garbage', () => {
    expect(isValidIsraeliPhone('abcdefghij')).toBe(false)
    expect(isValidIsraeliPhone('')).toBe(false)
  })

  it('rejects a number that does not start with 0 (after normalizing 972)', () => {
    expect(isValidIsraeliPhone('1501234567')).toBe(false)
  })
})
