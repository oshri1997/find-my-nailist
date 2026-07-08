/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockVerifyIdToken = jest.fn()
const mockSendRoleAwareVerificationEmail = jest.fn().mockResolvedValue(undefined)

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({ verifyIdToken: mockVerifyIdToken })),
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('@/lib/verification-email', () => ({
  sendRoleAwareVerificationEmail: (...args: unknown[]) => mockSendRoleAwareVerificationEmail(...args),
}))

type DocData = Record<string, unknown>
const docStore: Record<string, DocData | undefined> = {}

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
    }),
  }
}

const mockDb = { collection: jest.fn((name: string) => makeCollectionRef(name)) }

import { POST } from '@/app/api/auth/verify-email/route'

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
    expect(mockSendRoleAwareVerificationEmail).not.toHaveBeenCalled()
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
    expect(mockSendRoleAwareVerificationEmail).not.toHaveBeenCalled()
  })

  it('sends a CLIENT-flavored email by default when the user has no role field yet', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'user@example.com', email_verified: false })
    const res = await POST(makeRequest('token'))
    expect(res.status).toBe(200)
    expect(mockSendRoleAwareVerificationEmail).toHaveBeenCalledWith('u1', 'user@example.com', 'CLIENT')
  })

  it('sends a NAILIST-flavored email when the user doc has role: NAILIST', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'nail@example.com', email_verified: false })
    docStore['users/u1'] = { role: 'NAILIST' }
    const res = await POST(makeRequest('token'))
    expect(res.status).toBe(200)
    expect(mockSendRoleAwareVerificationEmail).toHaveBeenCalledWith('u1', 'nail@example.com', 'NAILIST')
  })

  it('returns 500 when the send fails', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'user@example.com', email_verified: false })
    mockSendRoleAwareVerificationEmail.mockRejectedValueOnce(new Error('boom'))
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
    expect(mockSendRoleAwareVerificationEmail).not.toHaveBeenCalled()
  })

  it('allows resending once the 10-minute cooldown has fully elapsed', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'user@example.com', email_verified: false })
    docStore['users/u1'] = {
      lastVerificationEmailSentAt: { toDate: () => new Date(Date.now() - 11 * 60 * 1000) }, // 11 minutes ago
    }
    const res = await POST(makeRequest('token'))
    expect(res.status).toBe(200)
    expect(mockSendRoleAwareVerificationEmail).toHaveBeenCalled()
  })
})
