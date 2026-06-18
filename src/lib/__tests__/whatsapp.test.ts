import { toWhatsAppUrl, whatsAppBookingMessage } from '../whatsapp'

describe('toWhatsAppUrl', () => {
  it('converts Israeli 05X format to international wa.me link', () => {
    expect(toWhatsAppUrl('0501234567')).toBe('https://wa.me/972501234567')
  })

  it('accepts already-international format', () => {
    expect(toWhatsAppUrl('972501234567')).toBe('https://wa.me/972501234567')
  })

  it('accepts +972 format by stripping the +', () => {
    expect(toWhatsAppUrl('+972501234567')).toBe('https://wa.me/972501234567')
  })

  it('strips dashes and spaces', () => {
    expect(toWhatsAppUrl('050-123-4567')).toBe('https://wa.me/972501234567')
  })

  it('appends URL-encoded message when provided', () => {
    const url = toWhatsAppUrl('0501234567', 'Hello World')
    expect(url).toContain('?text=')
    expect(url).toContain('Hello%20World')
  })

  it('returns base URL with no message when message is undefined', () => {
    const url = toWhatsAppUrl('0501234567')
    expect(url).not.toContain('?text=')
  })
})

describe('whatsAppBookingMessage', () => {
  it('includes the business name', () => {
    const msg = whatsAppBookingMessage('סטודיו שרה')
    expect(msg).toContain('סטודיו שרה')
  })

  it('returns a non-empty string', () => {
    expect(whatsAppBookingMessage('Test')).toBeTruthy()
  })
})
