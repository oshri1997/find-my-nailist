jest.mock('@/lib/cost-quota', () => ({
  reserveEmailQuota: jest.fn().mockResolvedValue(undefined),
  normalizeRecipient: (email: string) => email.trim().toLowerCase(),
}))

import { sendVerificationEmail, sendWelcomeEmail } from '@/lib/email'

function mockResendFetch() {
  const calls: unknown[] = []
  global.fetch = jest.fn().mockImplementation((_url: string, init: RequestInit) => {
    calls.push(JSON.parse(init.body as string))
    return Promise.resolve({ ok: true, json: async () => ({ id: 'email-1' }) } as Response)
  })
  return calls
}

describe('sendVerificationEmail — role-aware copy', () => {
  const OLD_ENV = process.env.RESEND_API_KEY

  beforeAll(() => {
    process.env.RESEND_API_KEY = 'test-key'
  })

  afterAll(() => {
    process.env.RESEND_API_KEY = OLD_ENV
  })

  it('uses nailist-specific copy when role is NAILIST', async () => {
    const calls = mockResendFetch()
    await sendVerificationEmail({ email: 'nail@test.com', verifyLink: 'https://x/y', role: 'NAILIST' })

    const body = calls[0] as { html: string; text: string }
    expect(body.html).toContain('כנייליסטית')
    expect(body.html).toContain('לקבל לקוחות')
    expect(body.text).toContain('כנייליסטית')
  })

  it('uses client-specific copy when role is CLIENT', async () => {
    const calls = mockResendFetch()
    await sendVerificationEmail({ email: 'client@test.com', verifyLink: 'https://x/y', role: 'CLIENT' })

    const body = calls[0] as { html: string; text: string }
    expect(body.html).toContain('להזמין תורים')
    expect(body.html).not.toContain('כנייליסטית')
  })

  it('falls back to client-specific copy when no role is provided', async () => {
    const calls = mockResendFetch()
    await sendVerificationEmail({ email: 'someone@test.com', verifyLink: 'https://x/y' })

    const body = calls[0] as { html: string }
    expect(body.html).toContain('להזמין תורים')
  })
})

describe('sendWelcomeEmail', () => {
  const OLD_ENV = process.env.RESEND_API_KEY

  beforeAll(() => {
    process.env.RESEND_API_KEY = 'test-key'
  })

  afterAll(() => {
    process.env.RESEND_API_KEY = OLD_ENV
  })

  it('sends client-specific welcome copy from the transactional sender', async () => {
    const calls = mockResendFetch()
    await sendWelcomeEmail({ email: 'client@test.com', name: 'נועה', role: 'CLIENT' })

    const body = calls[0] as { from: string; subject: string; html: string; text: string }
    expect(body.from).toBe('נייליסטיות <noreply@nailistiot.fun>')
    expect(body.subject).toBe('ברוכה הבאה לנייליסטיות!')
    expect(body.html).toContain('למצוא נייליסטיות מקצועיות')
    expect(body.html).toContain('נועה')
    expect(body.text).toContain('https://nailistiot.fun/search')
  })

  it('sends nailist-specific welcome copy with a profile setup link', async () => {
    const calls = mockResendFetch()
    await sendWelcomeEmail({ email: 'nailist@test.com', role: 'NAILIST' })

    const body = calls[0] as { html: string; text: string }
    expect(body.html).toContain('השלימי את הפרופיל העסקי')
    expect(body.text).toContain('https://nailistiot.fun/dashboard/nailist')
  })
})
