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
}))

jest.mock('@/lib/email', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}))

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
  beforeEach(() => jest.clearAllMocks())

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
    mockVerifyIdToken.mockResolvedValueOnce({ email_verified: false })
    const res = await POST(makeRequest('token'))
    expect(res.status).toBe(400)
  })

  it('returns ok without sending when already verified', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ email: 'user@example.com', email_verified: true })
    const res = await POST(makeRequest('token'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ ok: true, alreadyVerified: true })
    expect(mockGenerateEmailVerificationLink).not.toHaveBeenCalled()
    expect(mockSendVerificationEmail).not.toHaveBeenCalled()
  })

  it('generates a link and sends the custom Hebrew email when unverified', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ email: 'user@example.com', email_verified: false })
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
  })

  it('returns 500 when the link/email send fails', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ email: 'user@example.com', email_verified: false })
    mockGenerateEmailVerificationLink.mockRejectedValueOnce(new Error('boom'))
    const res = await POST(makeRequest('token'))
    expect(res.status).toBe(500)
  })
})
