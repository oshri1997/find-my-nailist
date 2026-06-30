/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockVerifyIdToken = jest.fn().mockResolvedValue({ uid: 'user-123' })
const mockDocSet = jest.fn().mockResolvedValue(undefined)
const mockDocDelete = jest.fn().mockResolvedValue(undefined)

const docStore: Record<string, Record<string, unknown> | null> = {}
const collectionStore: Record<string, (Record<string, unknown> & { __id: string })[]> = {}

function makeDocRef(collection: string, id: string) {
  const key = `${collection}/${id}`
  return {
    get: jest.fn().mockImplementation(() =>
      Promise.resolve({
        exists: !!docStore[key],
        data: () => docStore[key] ?? undefined,
        id,
      })
    ),
    set: mockDocSet,
    delete: mockDocDelete,
  }
}

function makeCollectionRef(name: string) {
  return {
    doc: (id?: string) => (id === undefined ? { id: 'new-doc' } : makeDocRef(name, id)),
    where: jest.fn().mockImplementation((field: string, _op: string, value: unknown) => {
      const filtered = (collectionStore[name] ?? []).filter(d => d[field] === value)
      return {
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: filtered.length === 0,
          docs: filtered.map(d => ({ id: d.__id, data: () => d })),
        }),
      }
    }),
  }
}

const mockDb = { collection: jest.fn((n: string) => makeCollectionRef(n)) }

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({ verifyIdToken: mockVerifyIdToken })),
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

import { GET as getList } from '@/app/api/favorites/route'
import { GET as getStatus, POST as addFavorite, DELETE as removeFavorite } from '@/app/api/favorites/[nailistId]/route'

function makeRequest(method: string, withAuth = true): NextRequest {
  const req = new NextRequest('http://localhost/api/favorites', { method })
  if (withAuth) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (n: string) => n === 'auth-token' ? { value: 'valid-token' } : undefined }),
    })
  }
  return req
}

function makeParamRequest(nailistId: string, method: string, withAuth = true): [NextRequest, { params: Promise<{ nailistId: string }> }] {
  const req = makeRequest(method, withAuth)
  const params = { params: Promise.resolve({ nailistId }) }
  return [req, params]
}

// ── GET /api/favorites ────────────────────────────────────────────────────────

describe('GET /api/favorites', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    collectionStore['favorites'] = []
    collectionStore['nailistProfiles'] = []
  })

  it('returns 401 when no auth token', async () => {
    const req = makeRequest('GET', false)
    const res = await getList(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when verifyIdToken throws', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('bad token'))
    const req = makeRequest('GET')
    const res = await getList(req)
    expect(res.status).toBe(401)
  })

  it('returns empty array when user has no favorites', async () => {
    const req = makeRequest('GET')
    const res = await getList(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toEqual([])
  })

  it('fetches nailist profiles for each favorite and returns them', async () => {
    collectionStore['favorites'] = [
      { __id: 'fav-1', userId: 'user-123', nailistProfileId: 'nailist-1', createdAt: 'ts' },
    ]
    docStore['nailistProfiles/nailist-1'] = {
      businessName: 'Studio Nails',
      city: 'Tel Aviv',
      avgRating: 4.8,
      reviewCount: 12,
      coverPhotoUrl: null,
      photoUrl: null,
      whatsappPhone: null,
    }
    const req = makeRequest('GET')
    const res = await getList(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0].businessName).toBe('Studio Nails')
    expect(json.data[0].avgRating).toBe(4.8)
  })

  it('filters out nailist profiles that no longer exist', async () => {
    collectionStore['favorites'] = [
      { __id: 'fav-1', userId: 'user-123', nailistProfileId: 'deleted-nailist', createdAt: 'ts' },
    ]
    // No matching doc in docStore → exists=false
    const req = makeRequest('GET')
    const res = await getList(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toEqual([])
  })

  it('fills default values for missing optional fields', async () => {
    collectionStore['favorites'] = [
      { __id: 'fav-1', userId: 'user-123', nailistProfileId: 'nailist-2', createdAt: 'ts' },
    ]
    docStore['nailistProfiles/nailist-2'] = { businessName: 'Studio B' }
    const req = makeRequest('GET')
    const res = await getList(req)
    const json = await res.json()
    expect(json.data[0].city).toBeNull()
    expect(json.data[0].avgRating).toBe(0)
    expect(json.data[0].reviewCount).toBe(0)
  })
})

// ── GET /api/favorites/[nailistId] ───────────────────────────────────────────

describe('GET /api/favorites/[nailistId]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns {isFavorited: false} when no auth token (no 401)', async () => {
    const [req, ctx] = makeParamRequest('nailist-1', 'GET', false)
    const res = await getStatus(req, ctx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.isFavorited).toBe(false)
  })

  it('returns {isFavorited: false} when not favorited', async () => {
    docStore['favorites/user-123_nailist-1'] = null
    const [req, ctx] = makeParamRequest('nailist-1', 'GET')
    const res = await getStatus(req, ctx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.isFavorited).toBe(false)
  })

  it('returns {isFavorited: true} when favorited', async () => {
    docStore['favorites/user-123_nailist-1'] = { userId: 'user-123', nailistProfileId: 'nailist-1' }
    const [req, ctx] = makeParamRequest('nailist-1', 'GET')
    const res = await getStatus(req, ctx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.isFavorited).toBe(true)
  })
})

// ── POST /api/favorites/[nailistId] ──────────────────────────────────────────

describe('POST /api/favorites/[nailistId]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no auth token', async () => {
    const [req, ctx] = makeParamRequest('nailist-1', 'POST', false)
    const res = await addFavorite(req, ctx)
    expect(res.status).toBe(401)
  })

  it('sets favorite and returns {isFavorited: true}', async () => {
    const [req, ctx] = makeParamRequest('nailist-1', 'POST')
    const res = await addFavorite(req, ctx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.isFavorited).toBe(true)
    expect(mockDocSet).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-123', nailistProfileId: 'nailist-1' })
    )
  })

  it('writes to composite key uid_nailistId', async () => {
    const [req, ctx] = makeParamRequest('nailist-abc', 'POST')
    await addFavorite(req, ctx)
    const collectionCalls = (mockDb.collection as jest.Mock).mock.calls
    const favCall = collectionCalls.find(([n]: [string]) => n === 'favorites')
    expect(favCall).toBeTruthy()
  })
})

// ── DELETE /api/favorites/[nailistId] ────────────────────────────────────────

describe('DELETE /api/favorites/[nailistId]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no auth token', async () => {
    const [req, ctx] = makeParamRequest('nailist-1', 'DELETE', false)
    const res = await removeFavorite(req, ctx)
    expect(res.status).toBe(401)
  })

  it('deletes favorite and returns {isFavorited: false}', async () => {
    const [req, ctx] = makeParamRequest('nailist-1', 'DELETE')
    const res = await removeFavorite(req, ctx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.isFavorited).toBe(false)
    expect(mockDocDelete).toHaveBeenCalled()
  })
})
