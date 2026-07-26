/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockVerifyIdToken = jest.fn()
const docStore: Record<string, Record<string, unknown>> = {}

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({ verifyIdToken: mockVerifyIdToken })),
  adminDb: jest.fn(() => ({
    collection: () => ({
      doc: (uid: string) => ({
        get: async () => ({ data: () => docStore[uid] }),
      }),
    }),
  })),
}))

import { GET } from '@/app/api/me/google-calendar/route'

function makeRequest(cookie?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/me/google-calendar')
  if (cookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (name: string) => (name === 'auth-token' ? { value: cookie } : undefined) }),
    })
  }
  return req
}

describe('GET /api/me/google-calendar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    for (const key of Object.keys(docStore)) delete docStore[key]
  })

  it('returns 401 + connected:false with no auth-token cookie', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    expect((await res.json()).connected).toBe(false)
  })

  it('returns connected:false when the user has no tokens on file', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-1' })
    docStore['user-1'] = {}
    const res = await GET(makeRequest('valid-token'))
    expect(res.status).toBe(200)
    expect((await res.json()).connected).toBe(false)
  })

  it('returns connected:true when googleCalendarTokens is present, without leaking the tokens', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-1' })
    docStore['user-1'] = { googleCalendarTokens: { accessToken: 'secret', refreshToken: 'super-secret' } }
    const res = await GET(makeRequest('valid-token'))
    const json = await res.json()
    expect(json).toEqual({ connected: true })
  })
})
