/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockVerifyIdToken = jest.fn()

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({ verifyIdToken: mockVerifyIdToken })),
}))

import { POST, DELETE } from '@/app/api/auth/session/route'

function makeRequest(method: string, body?: unknown): NextRequest {
  const url = 'http://localhost/api/auth/session'
  const bodyStr = body !== undefined ? JSON.stringify(body) : undefined
  return new NextRequest(url, {
    method,
    body: bodyStr,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
  })
}

describe('POST /api/auth/session', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 400 when token is missing from body', async () => {
    const req = makeRequest('POST', {})
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Missing token')
  })

  it('returns 401 when token is invalid (verifyIdToken throws)', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('invalid token'))
    const req = makeRequest('POST', { token: 'bad-token' })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Invalid token')
  })

  it('returns 200 and sets auth-token cookie on valid token', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-123' })
    const req = makeRequest('POST', { token: 'valid-id-token' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toContain('auth-token=valid-id-token')
  })

  it('cookie has httpOnly flag', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-123' })
    const req = makeRequest('POST', { token: 'valid-token' })
    const res = await POST(req)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie.toLowerCase()).toContain('httponly')
  })

  it('cookie has path=/', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-123' })
    const req = makeRequest('POST', { token: 'valid-token' })
    const res = await POST(req)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('Path=/')
  })

  it('returns 400 when body is null token', async () => {
    const req = makeRequest('POST', { token: null })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/auth/session', () => {
  it('returns 200 and clears the auth-token cookie', async () => {
    const req = new NextRequest('http://localhost/api/auth/session', { method: 'DELETE' })
    const res = await DELETE()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    const setCookie = res.headers.get('set-cookie') ?? ''
    // Cookie cleared by setting maxAge=0
    expect(setCookie).toContain('auth-token=')
    expect(setCookie).toContain('Max-Age=0')
  })

  it('always succeeds regardless of whether user was logged in', async () => {
    const res = await DELETE()
    expect(res.status).toBe(200)
  })
})
