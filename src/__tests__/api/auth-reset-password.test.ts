/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockGeneratePasswordResetLink = jest.fn()

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({
    generatePasswordResetLink: mockGeneratePasswordResetLink,
  })),
}))

jest.mock('@/lib/email', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}))

import { POST } from '@/app/api/auth/reset-password/route'
import { sendPasswordResetEmail } from '@/lib/email'
const mockSendPasswordResetEmail = sendPasswordResetEmail as jest.Mock

function makeRequest(body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/reset-password', {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 400 when email is missing', async () => {
    const req = makeRequest({})
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('invalid email')
  })

  it('returns 400 when email is invalid format', async () => {
    const req = makeRequest({ email: 'not-an-email' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for empty string email', async () => {
    const req = makeRequest({ email: '' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 and sends reset email when user exists', async () => {
    mockGeneratePasswordResetLink.mockResolvedValueOnce('https://reset.link/abc123')
    const req = makeRequest({ email: 'user@example.com' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith({
      email: 'user@example.com',
      resetLink: 'https://reset.link/abc123',
    })
  })

  it('returns 200 even when user does not exist (auth/user-not-found)', async () => {
    const err = Object.assign(new Error('user not found'), { code: 'auth/user-not-found' })
    mockGeneratePasswordResetLink.mockRejectedValueOnce(err)
    const req = makeRequest({ email: 'nouser@example.com' })
    const res = await POST(req)
    // Must not leak account existence — always return 200
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('returns 200 even when generatePasswordResetLink throws unexpected error', async () => {
    mockGeneratePasswordResetLink.mockRejectedValueOnce(new Error('network error'))
    const req = makeRequest({ email: 'user@example.com' })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('returns 200 even when sendPasswordResetEmail fails (fire-and-forget)', async () => {
    mockGeneratePasswordResetLink.mockResolvedValueOnce('https://reset.link/xyz')
    mockSendPasswordResetEmail.mockRejectedValueOnce(new Error('email send failed'))
    const req = makeRequest({ email: 'user@example.com' })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('returns 400 when body is malformed JSON', async () => {
    const req = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('calls generatePasswordResetLink with the correct email', async () => {
    mockGeneratePasswordResetLink.mockResolvedValueOnce('https://link')
    const req = makeRequest({ email: 'test@domain.com' })
    await POST(req)
    expect(mockGeneratePasswordResetLink).toHaveBeenCalledWith('test@domain.com')
  })
})
