/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockVerifyIdToken = jest.fn()

const docStore: Record<string, Record<string, unknown> | null> = {}

function makeDocRef(collection: string, id: string) {
  const key = `${collection}/${id}`
  return {
    get: jest.fn().mockImplementation(() =>
      Promise.resolve({
        exists: docStore[key] !== null && docStore[key] !== undefined,
        data: () => docStore[key] ?? undefined,
        id,
      })
    ),
  }
}

const mockDb = {
  collection: jest.fn((name: string) => ({
    doc: (id: string) => makeDocRef(name, id),
  })),
}

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({ verifyIdToken: mockVerifyIdToken })),
  adminDb: jest.fn(() => mockDb),
}))

import { GET } from '@/app/api/me/role/route'

function makeRequest(withCookie = true): NextRequest {
  const req = new NextRequest('http://localhost/api/me/role', { method: 'GET' })
  if (withCookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (n: string) => n === 'auth-token' ? { value: 'valid-token' } : undefined }),
    })
  }
  return req
}

describe('GET /api/me/role', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' })
  })

  it('returns 401 when no auth token', async () => {
    const req = makeRequest(false)
    const res = await GET(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.role).toBeNull()
  })

  it('returns 401 when verifyIdToken throws', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('expired'))
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.role).toBeNull()
  })

  it('returns {role: null} when user doc does not exist', async () => {
    docStore['users/user-123'] = null
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.role).toBeNull()
  })

  it('returns NAILIST role when set in user doc', async () => {
    docStore['users/user-123'] = { role: 'NAILIST', email: 'nail@test.com' }
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.role).toBe('NAILIST')
  })

  it('returns CLIENT role when set in user doc', async () => {
    docStore['users/user-123'] = { role: 'CLIENT', email: 'client@test.com' }
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.role).toBe('CLIENT')
  })

  it('defaults to CLIENT when user doc exists but has no role field', async () => {
    docStore['users/user-123'] = { email: 'someone@test.com' }
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.role).toBe('CLIENT')
  })
})
