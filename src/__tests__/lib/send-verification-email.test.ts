import { sendVerificationEmail } from '@/lib/email'

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
