/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockVerifyIdToken = jest.fn()
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({ verifyIdToken: mockVerifyIdToken })),
}))

const mockGetGoogleCalendarAuthUrl = jest.fn((state: string) => `https://accounts.google.com/o/oauth2/auth?state=${state}`)
const mockIsGoogleCalendarConfigured = jest.fn(() => true)
jest.mock('@/lib/google-calendar', () => ({
  getGoogleCalendarAuthUrl: (state: string) => mockGetGoogleCalendarAuthUrl(state),
  isGoogleCalendarConfigured: () => mockIsGoogleCalendarConfigured(),
}))

import { GET } from '@/app/api/auth/google-calendar/connect/route'

function makeRequest(url: string, cookie?: string): NextRequest {
  const req = new NextRequest(url)
  if (cookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (name: string) => (name === 'auth-token' ? { value: cookie } : undefined) }),
    })
  }
  return req
}

describe('GET /api/auth/google-calendar/connect', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsGoogleCalendarConfigured.mockReturnValue(true)
    process.env.NEXT_PUBLIC_APP_URL = 'https://nailistiot.fun'
  })

  it('redirects to /login when there is no auth-token cookie', async () => {
    const req = makeRequest('http://localhost/api/auth/google-calendar/connect?next=/settings')
    const res = await GET(req)
    expect(res.headers.get('location')).toBe('https://nailistiot.fun/login')
  })

  it('redirects to /login when the token is invalid', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('bad token'))
    const req = makeRequest('http://localhost/api/auth/google-calendar/connect?next=/settings', 'bad-token')
    const res = await GET(req)
    expect(res.headers.get('location')).toBe('https://nailistiot.fun/login')
  })

  it('skips straight to `next` when Calendar sync is not configured', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-1' })
    mockIsGoogleCalendarConfigured.mockReturnValue(false)
    const req = makeRequest('http://localhost/api/auth/google-calendar/connect?next=/settings', 'valid-token')
    const res = await GET(req)
    expect(res.headers.get('location')).toBe('https://nailistiot.fun/settings')
    expect(mockGetGoogleCalendarAuthUrl).not.toHaveBeenCalled()
  })

  it('redirects to the Google auth URL and sets a state cookie carrying the nonce + next', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-1' })
    const req = makeRequest('http://localhost/api/auth/google-calendar/connect?next=/onboarding/welcome', 'valid-token')
    const res = await GET(req)

    expect(mockGetGoogleCalendarAuthUrl).toHaveBeenCalledTimes(1)
    const [stateArg] = mockGetGoogleCalendarAuthUrl.mock.calls[0]
    expect(res.headers.get('location')).toBe(`https://accounts.google.com/o/oauth2/auth?state=${stateArg}`)

    const stateCookie = res.cookies.get('gcal-oauth-state')
    expect(stateCookie?.value).toBe(`${stateArg}|/onboarding/welcome`)

    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie.toLowerCase()).toContain('httponly')
  })

  it('defaults `next` to "/" when not provided', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-1' })
    const req = makeRequest('http://localhost/api/auth/google-calendar/connect', 'valid-token')
    const res = await GET(req)
    const [stateArg] = mockGetGoogleCalendarAuthUrl.mock.calls[0]
    expect(res.cookies.get('gcal-oauth-state')?.value).toBe(`${stateArg}|/`)
  })

  it('ignores an unsafe `next` value (open-redirect guard)', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-1' })
    const req = makeRequest('http://localhost/api/auth/google-calendar/connect?next=https://evil.com', 'valid-token')
    const res = await GET(req)
    const [stateArg] = mockGetGoogleCalendarAuthUrl.mock.calls[0]
    expect(res.cookies.get('gcal-oauth-state')?.value).toBe(`${stateArg}|/`)
  })
})
