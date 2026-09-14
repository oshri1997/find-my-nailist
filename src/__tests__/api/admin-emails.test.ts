/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockVerifyAdmin = jest.fn()
const mockSendAdminEmails = jest.fn()

jest.mock('@/lib/admin-auth', () => ({
  verifyAdmin: (...args: unknown[]) => mockVerifyAdmin(...args),
  adminUnauthorized: () =>
    new Response(JSON.stringify({ error: 'אין הרשאה' }), { status: 403 }),
}))

jest.mock('@/lib/admin-email', () => ({
  EMAIL_TEMPLATES: ['VERIFICATION', 'CUSTOM'],
  MAX_RECIPIENTS: 100,
  sendAdminEmails: (...args: unknown[]) => mockSendAdminEmails(...args),
}))

import { POST } from '@/app/api/admin/emails/route'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/emails', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const emptyResult = { sent: [], skipped: [], failed: [] }

describe('POST /api/admin/emails', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockVerifyAdmin.mockResolvedValue({ uid: 'admin-1', email: 'admin@example.com' })
    mockSendAdminEmails.mockResolvedValue(emptyResult)
  })

  it('rejects a non-admin caller', async () => {
    mockVerifyAdmin.mockResolvedValue(null)
    const res = await POST(makeRequest({ template: 'VERIFICATION', userIds: ['u1'] }))
    expect(res.status).toBe(403)
    expect(mockSendAdminEmails).not.toHaveBeenCalled()
  })

  it('rejects an unknown template', async () => {
    const res = await POST(makeRequest({ template: 'NEWSLETTER', userIds: ['u1'] }))
    expect(res.status).toBe(400)
    expect(mockSendAdminEmails).not.toHaveBeenCalled()
  })

  it('rejects an empty or malformed recipient list', async () => {
    expect((await POST(makeRequest({ template: 'VERIFICATION', userIds: [] }))).status).toBe(400)
    expect((await POST(makeRequest({ template: 'VERIFICATION', userIds: [1, 2] }))).status).toBe(400)
    expect(mockSendAdminEmails).not.toHaveBeenCalled()
  })

  it('rejects more than 100 recipients in a single send', async () => {
    const userIds = Array.from({ length: 101 }, (_, i) => `u${i}`)
    const res = await POST(makeRequest({ template: 'VERIFICATION', userIds }))
    expect(res.status).toBe(400)
    expect(mockSendAdminEmails).not.toHaveBeenCalled()
  })

  it('rejects a custom message missing a subject or body', async () => {
    expect((await POST(makeRequest({ template: 'CUSTOM', userIds: ['u1'], message: 'תוכן' }))).status).toBe(400)
    expect((await POST(makeRequest({ template: 'CUSTOM', userIds: ['u1'], subject: '  ', message: 'תוכן' }))).status).toBe(400)
    expect((await POST(makeRequest({ template: 'CUSTOM', userIds: ['u1'], subject: 'נושא' }))).status).toBe(400)
    expect(mockSendAdminEmails).not.toHaveBeenCalled()
  })

  it('rejects an over-long custom message', async () => {
    const res = await POST(makeRequest({
      template: 'CUSTOM', userIds: ['u1'], subject: 'נושא', message: 'x'.repeat(5001),
    }))
    expect(res.status).toBe(400)
  })

  it('does not require a subject for a verification send', async () => {
    const res = await POST(makeRequest({ template: 'VERIFICATION', userIds: ['u1'] }))
    expect(res.status).toBe(200)
    expect(mockSendAdminEmails).toHaveBeenCalledWith(expect.objectContaining({
      template: 'VERIFICATION',
      userIds: ['u1'],
      admin: { uid: 'admin-1', email: 'admin@example.com' },
    }))
  })

  it('de-duplicates repeated recipient ids so nobody is mailed twice', async () => {
    await POST(makeRequest({ template: 'VERIFICATION', userIds: ['u1', 'u1', 'u2'] }))
    expect(mockSendAdminEmails).toHaveBeenCalledWith(expect.objectContaining({ userIds: ['u1', 'u2'] }))
  })

  it('trims the custom subject and body before sending', async () => {
    await POST(makeRequest({ template: 'CUSTOM', userIds: ['u1'], subject: '  נושא  ', message: '  תוכן  ' }))
    expect(mockSendAdminEmails).toHaveBeenCalledWith(expect.objectContaining({
      subject: 'נושא', message: 'תוכן',
    }))
  })

  it('returns the per-recipient send report', async () => {
    mockSendAdminEmails.mockResolvedValue({
      sent: [{ id: 'u1', email: 'a@example.com' }],
      skipped: [{ id: 'u2', email: 'b@example.com', reason: 'המייל כבר מאומת' }],
      failed: [],
    })
    const res = await POST(makeRequest({ template: 'VERIFICATION', userIds: ['u1', 'u2'] }))
    const json = await res.json()
    expect(json.data.sent).toHaveLength(1)
    expect(json.data.skipped[0].reason).toBe('המייל כבר מאומת')
  })
})
