import { isMobileDevice } from '@/lib/device'

describe('isMobileDevice', () => {
  it('detects common mobile user agents', () => {
    expect(isMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true)
    expect(isMobileDevice('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe(true)
    expect(isMobileDevice('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe(true)
    expect(isMobileDevice('Mozilla/5.0 (Linux; U; Android 4.0; en-us; Mobi) AppleWebKit')).toBe(true)
  })

  it('does not flag common desktop user agents as mobile', () => {
    expect(isMobileDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')).toBe(false)
    expect(isMobileDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15')).toBe(false)
    expect(isMobileDevice('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36')).toBe(false)
  })

  it('treats an empty user agent as non-mobile', () => {
    expect(isMobileDevice('')).toBe(false)
  })
})
