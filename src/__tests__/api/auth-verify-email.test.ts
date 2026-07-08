/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockVerifyIdToken = jest.fn()
const mockGenerateEmailVerificationLink = jest.fn()

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({
    verifyIdToken: mockVerifyIdToken,
    generateEmailVerificationLink: mockGenerateEmailVerificationLink,
  })),
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('@/lib/email', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

type DocData = Record<string, unknown>
const docStore: Record<string, DocData | undefined> = {}
const mockSetFn = jest.fn().mockResolvedValue(undefined)

function makeCollectionRef(name: string) {
  return {
    doc: (id: string) => ({
      get: jest.fn().mockImplementation(() =>
        Promise.resolve({
          exists: !!docStore[`${name}/${id}`],
          data: () => docStore[`${name}/${id}`],
          id,
        })
      ),
      set: mockSetFn,
    }),
  }
}

const mockDb = { collection: jest.fn((name: string) => makeCollectionRef(name)) }

import { POST } from '@/app/api/auth/verify-email/route'
import { sendVerificationEmail } from '@/lib/email'
const mockSendVerificationEmail = sendVerificationEmail as jest.Mock

function makeRequest(cookie?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/auth/verify-email', { method: 'POST' })
  if (cookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (name: string) => (name === 'auth-token' ? { value: cookie } : undefined) }),
    })
  }
  return req
}

describe('POST /api/auth/verify-email', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    for (const key of Object.keys(docStore)) delete docStore[key]
  })

  it('returns 401 when no auth cookie is provided', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    expect(mockGenerateEmailVerificationLink).not.toHaveBeenCalled()
  })

  it('returns 401 when the token fails verification', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('invalid'))
    const res = await POST(makeRequest('bad-token'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when the account has no email', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'u1', email_verified: false })
    const res = await POST(makeRequest('token'))
    expect(res.status).toBe(400)
  })

  it('returns ok without sending when already verified', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'user@example.com', email_verified: true })
    const res = await POST(makeRequest('token'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ ok: true, alreadyVerified: true })
    expect(mockGenerateEmailVerificationLink).not.toHaveBeenCalled()
    expect(mockSendVerificationEmail).not.toHaveBeenCalled()
  })

  it('generates a link and sends the custom Hebrew email when unverified', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'user@example.com', email_verified: false })
    mockGenerateEmailVerificationLink.mockResolvedValueOnce('https://verify.link/abc')
    const res = await POST(makeRequest('token'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ ok: true })
    expect(mockGenerateEmailVerificationLink).toHaveBeenCalledWith('user@example.com')
    expect(mockSendVerificationEmail).toHaveBeenCalledWith({
      email: 'user@example.com',
      verifyLink: 'https://verify.link/abc',
    })
    // The attempt is marked before the send is even attempted
    expect(mockSetFn).toHaveBeenCalledWith({ lastVerificationEmailSentAt: 'SERVER_TIMESTAMP' }, { merge: true })
  })

  it('returns 500 when the link/email send fails', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'user@example.com', email_verified: false })
    mockGenerateEmailVerificationLink.mockRejectedValueOnce(new Error('boom'))
    const res = await POST(makeRequest('token'))
    expect(res.status).toBe(500)
  })

  it('returns 429 with minutes remaining when resent within the 10-minute cooldown', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'user@example.com', email_verified: false })
    docStore['users/u1'] = {
      lastVerificationEmailSentAt: { toDate: () => new Date(Date.now() - 60 * 1000) }, // 1 minute ago
    }
    const res = await POST(makeRequest('token'))
    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.error).toContain('דקות')
    expect(json.retryAfterSeconds).toBeGreaterThan(0)
    expect(mockGenerateEmailVerificationLink).not.toHaveBeenCalled()
  })

  it('allows resending once the 10-minute cooldown has fully elapsed', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'user@example.com', email_verified: false })
    docStore['users/u1'] = {
      lastVerificationEmailSentAt: { toDate: () => new Date(Date.now() - 11 * 60 * 1000) }, // 11 minutes ago
    }
    mockGenerateEmailVerificationLink.mockResolvedValueOnce('https://verify.link/abc')
    const res = await POST(makeRequest('token'))
    expect(res.status).toBe(200)
    expect(mockGenerateEmailVerificationLink).toHaveBeenCalled()
  })
})
