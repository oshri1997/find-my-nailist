import { formatDate } from '@/lib/email'

describe('formatDate', () => {
  it('renders the appointment time in Israel local time, not the server timezone', () => {
    // 10:00 UTC in winter is 12:00 in Israel (UTC+2) — if formatDate ever drops
    // the Asia/Jerusalem timeZone option again, this catches the "2 hours
    // behind" bug where the server's own (UTC) clock leaks into the email.
    const winterUtc = new Date('2026-01-15T10:00:00.000Z')
    expect(formatDate(winterUtc)).toContain('12:00')
    expect(formatDate(winterUtc)).not.toContain('10:00')
  })

  it('accounts for Israeli daylight saving time in summer (UTC+3)', () => {
    const summerUtc = new Date('2026-07-15T10:00:00.000Z')
    expect(formatDate(summerUtc)).toContain('13:00')
  })
})
