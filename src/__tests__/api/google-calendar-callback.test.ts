/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockVerifyIdToken = jest.fn()
const mockSet = jest.fn().mockResolvedValue(undefined)
const mockDoc = jest.fn(() => ({ set: mockSet }))
const mockCollection = jest.fn(() => ({ doc: mockDoc }))

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({ verifyIdToken: mockVerifyIdToken })),
  adminDb: jest.fn(() => ({ collection: mockCollection })),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

const mockExchangeGoogleCalendarCode = jest.fn()
jest.mock('@/lib/google-calendar', () => ({
  exchangeGoogleCalendarCode: (code: string) => mockExchangeGoogleCalendarCode(code),
}))

import { GET } from '@/app/api/auth/google-calendar/callback/route'

function makeRequest(url: string, cookies: Record<string, string> = {}): NextRequest {
  const req = new NextRequest(url)
  Object.defineProperty(req, 'cookies', {
    get: () => ({ get: (name: string) => (name in cookies ? { value: cookies[name] } : undefined) }),
  })
  return req
}

describe('GET /api/auth/google-calendar/callback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://nailistiot.fun'
  })

  it('redirects to `next` (no-op) when the state cookie is missing entirely', async () => {
    const req = makeRequest('http://localhost/api/auth/google-calendar/callback?code=abc&state=nonce-1')
    const res = await GET(req)
    expect(res.headers.get('location')).toBe('https://nailistiot.fun/')
    expect(mockExchangeGoogleCalendarCode).not.toHaveBeenCalled()
  })

  it('redirects to `next` without connecting when state does not match the cookie nonce (CSRF)', async () => {
    const req = makeRequest(
      'http://localhost/api/auth/google-calendar/callback?code=abc&state=wrong-nonce',
      { 'gcal-oauth-state': 'real-nonce|/settings' }
    )
    const res = await GET(req)
    expect(res.headers.get('location')).toBe('https://nailistiot.fun/settings')
    expect(mockExchangeGoogleCalendarCode).not.toHaveBeenCalled()
  })

  it('redirects to `next` when the user declined consent (error param, no code)', async () => {
    const req = makeRequest(
      'http://localhost/api/auth/google-calendar/callback?error=access_denied&state=real-nonce',
      { 'gcal-oauth-state': 'real-nonce|/settings' }
    )
    const res = await GET(req)
    expect(res.headers.get('location')).toBe('https://nailistiot.fun/settings')
    expect(mockExchangeGoogleCalendarCode).not.toHaveBeenCalled()
  })

  it('redirects to `next` when there is no auth-token session cookie', async () => {
    const req = makeRequest(
      'http://localhost/api/auth/google-calendar/callback?code=abc&state=real-nonce',
      { 'gcal-oauth-state': 'real-nonce|/settings' }
    )
    const res = await GET(req)
    expect(res.headers.get('location')).toBe('https://nailistiot.fun/settings')
    expect(mockExchangeGoogleCalendarCode).not.toHaveBeenCalled()
  })

  it('exchanges the code, stores tokens on the user doc, and redirects to `next` with gcal=connected', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-1' })
    mockExchangeGoogleCalendarCode.mockResolvedValueOnce({
      accessToken: 'access-1', refreshToken: 'refresh-1', expiryDate: 123, scope: 'calendar.events',
    })
    const req = makeRequest(
      'http://localhost/api/auth/google-calendar/callback?code=abc&state=real-nonce',
      { 'gcal-oauth-state': 'real-nonce|/settings', 'auth-token': 'valid-token' }
    )
    const res = await GET(req)

    expect(mockExchangeGoogleCalendarCode).toHaveBeenCalledWith('abc')
    expect(mockCollection).toHaveBeenCalledWith('users')
    expect(mockDoc).toHaveBeenCalledWith('user-1')
    expect(mockSet).toHaveBeenCalledWith(
      { googleCalendarTokens: { accessToken: 'access-1', refreshToken: 'refresh-1', expiryDate: 123, scope: 'calendar.events' }, updatedAt: 'SERVER_TIMESTAMP' },
      { merge: true }
    )

    const location = res.headers.get('location') ?? ''
    expect(location).toBe('https://nailistiot.fun/settings?gcal=connected')
  })

  it('clears the state cookie on every outcome', async () => {
    const req = makeRequest('http://localhost/api/auth/google-calendar/callback?code=abc&state=nonce-1')
    const res = await GET(req)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('gcal-oauth-state=')
    expect(setCookie).toContain('Max-Age=0')
  })

  it('redirects to `next` (without failing) when token exchange throws', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-1' })
    mockExchangeGoogleCalendarCode.mockRejectedValueOnce(new Error('boom'))
    const req = makeRequest(
      'http://localhost/api/auth/google-calendar/callback?code=abc&state=real-nonce',
      { 'gcal-oauth-state': 'real-nonce|/settings', 'auth-token': 'valid-token' }
    )
    const res = await GET(req)
    expect(res.headers.get('location')).toBe('https://nailistiot.fun/settings')
  })
})
