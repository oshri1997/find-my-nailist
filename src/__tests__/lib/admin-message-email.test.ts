jest.mock('@/lib/cost-quota', () => ({
  reserveEmailQuota: jest.fn().mockResolvedValue(undefined),
  normalizeRecipient: (email: string) => email.trim().toLowerCase(),
}))

import { sendAdminMessageEmail } from '@/lib/email'

function mockResendFetch() {
  const calls: { subject: string; html: string; text: string; to: string[] }[] = []
  global.fetch = jest.fn().mockImplementation((_url: string, init: RequestInit) => {
    calls.push(JSON.parse(init.body as string))
    return Promise.resolve({ ok: true, json: async () => ({ id: 'email-1' }) } as Response)
  })
  return calls
}

describe('sendAdminMessageEmail', () => {
  const OLD_ENV = process.env.RESEND_API_KEY

  beforeAll(() => { process.env.RESEND_API_KEY = 'test-key' })
  afterAll(() => { process.env.RESEND_API_KEY = OLD_ENV })

  it('sends the admin subject with a personal greeting and the site branding', async () => {
    const calls = mockResendFetch()
    await sendAdminMessageEmail({
      email: 'Client@Example.com',
      subject: 'עדכון חשוב',
      message: 'שלחנו לך קישור חדש.',
      name: 'דנה',
    })

    expect(calls[0].to).toEqual(['client@example.com'])
    expect(calls[0].subject).toBe('עדכון חשוב')
    expect(calls[0].html).toContain('שלום דנה,')
    expect(calls[0].html).toContain('linear-gradient(135deg,#F5175C,#9D174D)')
    expect(calls[0].text).toContain('שלחנו לך קישור חדש.')
  })

  it('falls back to a neutral greeting when the user has no display name', async () => {
    const calls = mockResendFetch()
    await sendAdminMessageEmail({ email: 'a@b.com', subject: 'נושא', message: 'תוכן', name: '  ' })

    expect(calls[0].html).toContain('שלום,')
    expect(calls[0].html).not.toContain('שלום ,')
  })

  it('splits blank-line-separated blocks into paragraphs', async () => {
    const calls = mockResendFetch()
    await sendAdminMessageEmail({ email: 'a@b.com', subject: 'נושא', message: 'פסקה ראשונה\n\nפסקה שנייה' })

    expect(calls[0].html).toContain('>פסקה ראשונה</p>')
    expect(calls[0].html).toContain('>פסקה שנייה</p>')
  })

  it('escapes admin-typed content so a message body cannot inject markup', async () => {
    const calls = mockResendFetch()
    await sendAdminMessageEmail({
      email: 'a@b.com',
      subject: '<img src=x onerror=alert(1)>',
      message: '<script>alert(1)</script>',
      name: '<b>דנה</b>',
    })

    expect(calls[0].html).not.toContain('<script>')
    expect(calls[0].html).not.toContain('<img src=x')
    expect(calls[0].html).not.toContain('<b>דנה</b>')
    expect(calls[0].html).toContain('&lt;script&gt;')
  })
})
