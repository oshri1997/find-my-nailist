/**
 * @jest-environment node
 *
 * Covers the bugfix where GET /api/nailists/[id] leaked contact info
 * (whatsappPhone/instagramUrl/tiktokUrl) to unauthenticated callers even
 * though the UI hides the corresponding buttons behind a login gate.
 */
import { NextRequest } from 'next/server'

type DocData = Record<string, unknown>
const docStore: Record<string, DocData> = {}

function makeDocRef(collection: string, id: string) {
  return {
    get: jest.fn().mockImplementation(() =>
      Promise.resolve({
        exists: !!docStore[`${collection}/${id}`],
        data: () => docStore[`${collection}/${id}`] ?? undefined,
        id,
      })
    ),
  }
}

function makeCollectionRef(name: string) {
  return {
    doc: (id: string) => makeDocRef(name, id),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ docs: [] }),
  }
}

const mockDb = { collection: jest.fn((name: string) => makeCollectionRef(name)) }
const verifyIdTokenMock = jest.fn()

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({ verifyIdToken: (...args: unknown[]) => verifyIdTokenMock(...args) })),
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('@/lib/geocoding', () => ({ geocodeAddress: jest.fn().mockResolvedValue(null) }))

import { GET } from '@/app/api/nailists/[id]/route'

function makeRequest(cookie?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/nailists/nailist-profile-1', { method: 'GET' })
  if (cookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (name: string) => (name === 'auth-token' ? { value: cookie } : undefined) }),
    })
  }
  return req
}

const mockParams = { params: Promise.resolve({ id: 'nailist-profile-1' }) }

describe('GET /api/nailists/[id] — contact info gating', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    verifyIdTokenMock.mockResolvedValue({ uid: 'some-user' })
    docStore['nailistProfiles/nailist-profile-1'] = {
      businessName: 'סטודיו יופי',
      bio: 'נייליסטית מקצועית',
      whatsappPhone: '+972501234567',
      instagramUrl: 'https://instagram.com/studio',
      tiktokUrl: 'https://tiktok.com/@studio',
    }
  })

  it('strips contact fields for anonymous callers (no auth cookie)', async () => {
    const res = await GET(makeRequest(), mockParams)
    const json = await res.json()
    expect(json.data.businessName).toBe('סטודיו יופי')
    expect(json.data.bio).toBe('נייליסטית מקצועית')
    expect(json.data.whatsappPhone).toBeUndefined()
    expect(json.data.instagramUrl).toBeUndefined()
    expect(json.data.tiktokUrl).toBeUndefined()
  })

  it('strips contact fields when the auth token is invalid or expired', async () => {
    verifyIdTokenMock.mockRejectedValue(new Error('invalid token'))
    const res = await GET(makeRequest('bad-token'), mockParams)
    const json = await res.json()
    expect(json.data.whatsappPhone).toBeUndefined()
    expect(json.data.instagramUrl).toBeUndefined()
    expect(json.data.tiktokUrl).toBeUndefined()
  })

  it('includes contact fields for authenticated callers', async () => {
    const res = await GET(makeRequest('valid-token'), mockParams)
    const json = await res.json()
    expect(json.data.whatsappPhone).toBe('+972501234567')
    expect(json.data.instagramUrl).toBe('https://instagram.com/studio')
    expect(json.data.tiktokUrl).toBe('https://tiktok.com/@studio')
  })

  it('returns 404 when the profile does not exist, regardless of auth', async () => {
    const res = await GET(makeRequest('valid-token'), { params: Promise.resolve({ id: 'missing-profile' }) })
    expect(res.status).toBe(404)
  })
})
