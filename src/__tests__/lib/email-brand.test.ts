import { escapeHtml, sendAppointmentRequest, sendNailistReviewEmail, sendReviewRequestEmail } from '@/lib/email'

function mockResendFetch() {
  const calls: Array<{ html: string }> = []
  global.fetch = jest.fn().mockImplementation((_url: string, init: RequestInit) => {
    calls.push(JSON.parse(init.body as string))
    return Promise.resolve({ ok: true, json: async () => ({ id: 'email-1' }) } as Response)
  })
  return calls
}

describe('transactional email branding and escaping', () => {
  const previousKey = process.env.RESEND_API_KEY

  beforeAll(() => {
    process.env.RESEND_API_KEY = 'test-key'
  })

  afterAll(() => {
    process.env.RESEND_API_KEY = previousKey
  })

  it('uses the site primary CTA instead of the retired orange gradient', async () => {
    const calls = mockResendFetch()
    await sendAppointmentRequest({
      clientEmail: 'client@example.com',
      nailistEmail: 'nailist@example.com',
      clientName: 'לקוחה',
      nailistBusinessName: 'סטודיו',
      serviceName: 'מניקור',
      startTime: new Date('2026-07-01T10:00:00.000Z'),
      price: 150,
      currency: 'ILS',
      confirmUrl: 'https://nailistiot.fun/api/appointments/confirm?token=token',
      declineUrl: 'https://nailistiot.fun/api/appointments/decline?token=token',
    })

    const nailistEmail = calls[1].html
    expect(nailistEmail).toContain('linear-gradient(135deg,#F5175C,#9D174D)')
    expect(nailistEmail).not.toContain('#c2542d')
    expect(nailistEmail).not.toContain('#d9a441')
  })

  it('escapes user-entered content in HTML email bodies', async () => {
    const calls = mockResendFetch()
    await sendNailistReviewEmail({
      nailistEmail: 'nailist@example.com',
      nailistName: '<b>ניהול</b>',
      clientName: '<img src=x>',
      rating: 5,
      comment: '<script>alert(1)</script>',
      serviceName: 'ג\'ל & צבע',
    })
    await sendReviewRequestEmail({
      clientEmail: 'client@example.com',
      clientName: '<לקוחה>',
      nailistBusinessName: 'סטודיו',
      serviceName: 'מניקור',
      startTime: new Date('2026-07-01T10:00:00.000Z'),
      appointmentId: 'apt-1',
    })

    expect(calls[0].html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(calls[0].html).not.toContain('<script>alert(1)</script>')
    expect(calls[0].html).toContain('linear-gradient(135deg,#F5175C,#9D174D)')
    expect(calls[1].html).toContain('&lt;לקוחה&gt;')
  })

  it('escapes all five HTML-sensitive characters', () => {
    expect(escapeHtml(`&<>\"'`)).toBe('&amp;&lt;&gt;&quot;&#39;')
  })
})
