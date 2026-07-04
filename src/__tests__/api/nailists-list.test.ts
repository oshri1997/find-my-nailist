/**
 * @jest-environment node
 *
 * Covers the bugfix where the unauthenticated search/list endpoint
 * GET /api/nailists leaked contact info (whatsappPhone/instagramUrl/tiktokUrl/
 * phoneNumber/email/address/userId) for every returned nailist, bypassing the
 * login gate enforced on GET /api/nailists/[id].
 */
import { NextRequest } from 'next/server'

type DocData = Record<string, unknown> & { __id: string }
const collectionStore: Record<string, DocData[]> = {}

function makeCollectionRef(name: string) {
  return {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      docs: (collectionStore[name] ?? []).map((d) => ({ id: d.__id, data: () => d })),
    }),
  }
}

const mockDb = { collection: jest.fn((name: string) => makeCollectionRef(name)) }
const verifyIdTokenMock = jest.fn()

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({ verifyIdToken: (...args: unknown[]) => verifyIdTokenMock(...args) })),
  adminDb: jest.fn(() => mockDb),
}))

import { GET } from '@/app/api/nailists/route'

function makeRequest(cookie?: string, searchParams?: string): NextRequest {
  const url = `http://localhost/api/nailists${searchParams ? `?${searchParams}` : ''}`
  const req = new NextRequest(url, { method: 'GET' })
  if (cookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (name: string) => (name === 'auth-token' ? { value: cookie } : undefined) }),
    })
  }
  return req
}

describe('GET /api/nailists — contact info gating on list results', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    verifyIdTokenMock.mockResolvedValue({ uid: 'some-user' })
    collectionStore['nailistProfiles'] = [{
      __id: 'nailist-1',
      businessName: 'סטודיו יופי',
      isActive: true,
      whatsappPhone: '+972501234567',
      instagramUrl: 'https://instagram.com/studio',
      tiktokUrl: 'https://tiktok.com/@studio',
      phoneNumber: '0501234567',
      email: 'owner@example.com',
      address: 'הרצל 1, תל אביב',
      userId: 'firebase-uid-secret',
    }]
    collectionStore['services'] = []
  })

  it('strips contact fields from every result for anonymous callers', async () => {
    const res = await GET(makeRequest())
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0].businessName).toBe('סטודיו יופי')
    expect(json.data[0].whatsappPhone).toBeUndefined()
    expect(json.data[0].instagramUrl).toBeUndefined()
    expect(json.data[0].tiktokUrl).toBeUndefined()
    expect(json.data[0].phoneNumber).toBeUndefined()
    expect(json.data[0].email).toBeUndefined()
    expect(json.data[0].address).toBeUndefined()
    expect(json.data[0].userId).toBeUndefined()
    expect(json.data[0].hasContactInfo).toBe(true)
  })

  it('includes contact fields for authenticated callers', async () => {
    const res = await GET(makeRequest('valid-token'))
    const json = await res.json()
    expect(json.data[0].whatsappPhone).toBe('+972501234567')
    expect(json.data[0].email).toBe('owner@example.com')
  })

  it('strips contact fields when the auth token is invalid', async () => {
    verifyIdTokenMock.mockRejectedValue(new Error('invalid'))
    const res = await GET(makeRequest('bad-token'))
    const json = await res.json()
    expect(json.data[0].whatsappPhone).toBeUndefined()
  })
})

describe('GET /api/nailists — pagination (no location)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    verifyIdTokenMock.mockResolvedValue({ uid: 'some-user' })
    collectionStore['nailistProfiles'] = Array.from({ length: 15 }, (_, i) => ({
      __id: `nailist-${i}`,
      businessName: `סטודיו ${i}`,
      isActive: true,
    }))
    collectionStore['services'] = []
  })

  it('defaults to a page of 12 with hasMore: true when more results exist', async () => {
    const res = await GET(makeRequest())
    const json = await res.json()
    expect(json.data).toHaveLength(12)
    expect(json.hasMore).toBe(true)
  })

  it('returns the next page via offset, with hasMore: false once exhausted', async () => {
    const res = await GET(makeRequest(undefined, 'offset=12'))
    const json = await res.json()
    expect(json.data).toHaveLength(3)
    expect(json.hasMore).toBe(false)
  })

  it('returns an empty page with hasMore: false when offset exceeds the result count', async () => {
    const res = await GET(makeRequest(undefined, 'offset=100'))
    const json = await res.json()
    expect(json.data).toHaveLength(0)
    expect(json.hasMore).toBe(false)
  })

  it('respects a custom pageSize', async () => {
    const res = await GET(makeRequest(undefined, 'pageSize=5'))
    const json = await res.json()
    expect(json.data).toHaveLength(5)
    expect(json.hasMore).toBe(true)
  })

  it('sorts by a deterministic field so repeated "load more" calls cannot duplicate or skip results', async () => {
    await GET(makeRequest())
    const profileRefs = mockDb.collection.mock.results
      .filter((r, i) => mockDb.collection.mock.calls[i][0] === 'nailistProfiles')
      .map((r) => r.value)
    expect(profileRefs.some((ref) => ref.orderBy.mock.calls.length > 0)).toBe(true)
  })
})
