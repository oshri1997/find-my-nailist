/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// ── Firebase Admin mocks ─────────────────────────────────────────────────────

type DocData = Record<string, unknown>
const docStore: Record<string, DocData> = {}
const collectionStore: Record<string, (DocData & { __id: string })[]> = {}

const mockUpdateFn = jest.fn().mockResolvedValue(undefined)

function makeDocRef(collection: string, id: string) {
  return {
    get: jest.fn().mockImplementation(() =>
      Promise.resolve({
        exists: !!docStore[`${collection}/${id}`],
        data: () => docStore[`${collection}/${id}`] ?? undefined,
        id,
      })
    ),
    update: mockUpdateFn,
  }
}

function makeCollectionRef(name: string) {
  return {
    doc: (id: string) => makeDocRef(name, id),
    where: jest.fn().mockImplementation((field: string, _op: string, value: unknown) => {
      const filtered = (collectionStore[name] ?? []).filter((d) => d[field] === value)
      return {
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: filtered.length === 0,
          docs: filtered.map((d) => ({ id: d.__id, data: () => d, ref: makeDocRef(name, d.__id) })),
        }),
      }
    }),
  }
}

const mockDb = { collection: jest.fn((name: string) => makeCollectionRef(name)) }

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'nailist-user-1' }),
  })),
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

jest.mock('@/lib/geocoding', () => ({ geocodeAddress: jest.fn().mockResolvedValue(null) }))

import { PATCH } from '@/app/api/nailists/[id]/route'

function makeRequest(body: unknown, cookie?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/nailists/nailist-profile-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  if (cookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (name: string) => (name === 'auth-token' ? { value: cookie } : undefined) }),
    })
  }
  return req
}

const mockParams = { params: Promise.resolve({ id: 'nailist-profile-1' }) }

describe('PATCH /api/nailists/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    docStore['nailistProfiles/nailist-profile-1'] = { userId: 'nailist-user-1', businessName: 'סטודיו' }
    collectionStore['nailistProfiles'] = [
      { __id: 'nailist-profile-1', userId: 'nailist-user-1' },
    ]
  })

  it('returns 401 when no auth token', async () => {
    const res = await PATCH(makeRequest({ businessName: 'New Name' }), mockParams)
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller does not own the nailist profile', async () => {
    collectionStore['nailistProfiles'] = [{ __id: 'other-profile', userId: 'nailist-user-1' }]
    const res = await PATCH(makeRequest({ businessName: 'Hacked' }, 'token'), mockParams)
    expect(res.status).toBe(403)
  })

  it('returns 200 and updates profile when caller owns it', async () => {
    const res = await PATCH(makeRequest({ businessName: 'Updated Studio' }, 'token'), mockParams)
    expect(res.status).toBe(200)
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({ businessName: 'Updated Studio' })
    )
  })

  it('rejects mass-assignment of trust fields (isVerified, avgRating, reviewCount, userId)', async () => {
    const res = await PATCH(
      makeRequest({ businessName: 'Updated Studio', isVerified: true, avgRating: 5, reviewCount: 9999, userId: 'attacker-uid' }, 'token'),
      mockParams
    )
    expect(res.status).toBe(400)
    expect(mockUpdateFn).not.toHaveBeenCalled()
  })

  it('accepts every field the settings/onboarding forms actually send', async () => {
    const res = await PATCH(
      makeRequest({
        businessName: 'Studio', bio: 'Bio', city: 'תל אביב', address: 'הרצל 1',
        phoneNumber: '0501234567', whatsappPhone: '0501234567',
        instagramUrl: 'https://instagram.com/x', tiktokUrl: 'https://tiktok.com/@x',
        photoUrl: 'https://example.com/avatar.jpg', coverPhotoUrl: 'https://example.com/cover.jpg',
        isActive: true, latitude: 32.08, longitude: 34.78,
      }, 'token'),
      mockParams
    )
    expect(res.status).toBe(200)
  })

  it('accepts coverPhotoUrl: null to clear the search-card image', async () => {
    const res = await PATCH(
      makeRequest({ businessName: 'Studio', coverPhotoUrl: null }, 'token'),
      mockParams
    )
    expect(res.status).toBe(200)
  })
})
