/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('@/lib/email', () => ({
  sendAppointmentRequest: jest.fn().mockResolvedValue(undefined),
  sendClientConfirmedEmail: jest.fn().mockResolvedValue(undefined),
}))

import { GET } from '@/app/api/debug/email/route'

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/debug/email')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

describe('GET /api/debug/email', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true })
  })

  it('returns 404 in production', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true })
    const res = await GET(makeRequest({ secret: 'any-secret' }))
    expect(res.status).toBe(404)
  })

  it('returns 404 in test environment', async () => {
    // NODE_ENV is 'test' by default in Jest
    const res = await GET(makeRequest({ secret: 'any-secret' }))
    expect(res.status).toBe(404)
  })

  it('returns 403 in development with wrong secret', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true })
    process.env.DEBUG_EMAIL_SECRET = 'correct-secret'
    const res = await GET(makeRequest({ secret: 'wrong-secret' }))
    expect(res.status).toBe(403)
    delete process.env.DEBUG_EMAIL_SECRET
  })
})
