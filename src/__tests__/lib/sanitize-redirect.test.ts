import { sanitizeRedirect } from '@/lib/sanitize-redirect'

describe('sanitizeRedirect', () => {
  it('accepts a plain relative path', () => {
    expect(sanitizeRedirect('/my-appointments')).toBe('/my-appointments')
  })

  it('accepts a relative path with a query string', () => {
    expect(sanitizeRedirect('/my-appointments?review=abc123')).toBe('/my-appointments?review=abc123')
  })

  it('rejects null', () => {
    expect(sanitizeRedirect(null)).toBe('')
  })

  it('rejects empty string', () => {
    expect(sanitizeRedirect('')).toBe('')
  })

  it('rejects an absolute URL to another origin', () => {
    expect(sanitizeRedirect('https://evil.example/phish')).toBe('')
  })

  it('rejects a protocol-relative URL (open redirect via //)', () => {
    expect(sanitizeRedirect('//evil.example/phish')).toBe('')
  })

  it('rejects a backslash-based protocol-relative trick', () => {
    expect(sanitizeRedirect('/\\evil.example/phish')).toBe('')
  })

  it('rejects a path with no leading slash', () => {
    expect(sanitizeRedirect('evil.example')).toBe('')
  })
})
