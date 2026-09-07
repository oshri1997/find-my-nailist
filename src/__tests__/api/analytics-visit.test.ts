/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockAdd = jest.fn().mockResolvedValue({ id: 'visit-1' })
const mockCollection = jest.fn(() => ({ add: mockAdd }))

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: jest.fn(() => ({ collection: mockCollection })),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'server-time') },
}))

import { POST } from '@/app/api/analytics/visit/route'

let requestNumber = 0

function makeRequest(body: unknown, options: { origin?: string; cookie?: string; networkIdentity?: string; url?: string } = {}): NextRequest {
  requestNumber += 1
  return new NextRequest(options.url ?? 'https://nailistiot.fun/api/analytics/visit', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      origin: options.origin ?? 'https://nailistiot.fun',
      'x-forwarded-for': options.networkIdentity ?? `198.51.100.${requestNumber}`,
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  requestNumber = 0
  process.env.VISIT_ANALYTICS_COOKIE_SECRET = 'test-visit-analytics-secret'
})

describe('POST /api/analytics/visit', () => {
  it('stores only an allowed coarse source category', async () => {
    const res = await POST(makeRequest({ source: 'google' }))

    expect(res.status).toBe(201)
    expect(mockCollection).toHaveBeenCalledWith('visitEvents')
    expect(mockAdd).toHaveBeenCalledWith({ source: 'google', createdAt: 'server-time' })
  })

  it('rejects unknown sources', async () => {
    const res = await POST(makeRequest({ source: 'facebook' }))

    expect(res.status).toBe(400)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('rejects requests without a first-party Origin header', async () => {
    const res = await POST(makeRequest({ source: 'direct' }, { origin: 'https://attacker.example' }))

    expect(res.status).toBe(403)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it.each([
    'https://dev.nailistiot.fun',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ])('rejects non-production origin %s', async (origin) => {
    const res = await POST(makeRequest({ source: 'direct' }, { origin }))

    expect(res.status).toBe(403)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('rejects a dev-host request with forged production Origin', async () => {
    const res = await POST(makeRequest(
      { source: 'direct' },
      { origin: 'https://nailistiot.fun', url: 'https://dev.nailistiot.fun/api/analytics/visit' },
    ))

    expect(res.status).toBe(403)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('requires analytics cookie signing configuration instead of logging unguarded visits', async () => {
    delete process.env.VISIT_ANALYTICS_COOKIE_SECRET
    const res = await POST(makeRequest({ source: 'direct' }))

    expect(res.status).toBe(503)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('limits a signed anonymous browser cookie to three visits per ten minutes', async () => {
    let cookie: string | undefined
    for (let index = 0; index < 3; index++) {
      const res = await POST(makeRequest({ source: 'direct' }, { cookie }))
      expect(res.status).toBe(201)
      cookie = res.headers.get('set-cookie')?.split(';')[0]
    }

    const limited = await POST(makeRequest({ source: 'direct' }, { cookie }))
    expect(limited.status).toBe(429)
    expect(mockAdd).toHaveBeenCalledTimes(3)
  })

  it('rejects a tampered rate-limit cookie instead of resetting its allowance', async () => {
    const res = await POST(makeRequest({ source: 'direct' }, { cookie: 'visit-rate=1.3.not-a-valid-signature' }))

    expect(res.status).toBe(429)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('limits four same-origin requests from one network even when each omits the cookie', async () => {
    const networkIdentity = '203.0.113.7'
    for (let index = 0; index < 3; index++) {
      const res = await POST(makeRequest({ source: 'direct' }, { networkIdentity }))
      expect(res.status).toBe(201)
    }

    const limited = await POST(makeRequest({ source: 'direct' }, { networkIdentity }))
    expect(limited.status).toBe(429)
    expect(mockAdd).toHaveBeenCalledTimes(3)
  })
})
