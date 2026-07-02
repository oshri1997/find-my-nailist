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

function makeRequest(cookie?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/nailists', { method: 'GET' })
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
