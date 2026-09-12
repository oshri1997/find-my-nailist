/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// ── Firebase Admin mocks ─────────────────────────────────────────────────────

type DocData = Record<string, unknown>
const docStore: Record<string, DocData> = {}
const collectionStore: Record<string, (DocData & { __id: string })[]> = {}

const mockPhotoCreate = jest.fn()
const mockDeleteFn = jest.fn().mockResolvedValue(undefined)

function makeDocRef(collection: string, id: string) {
  return {
    id,
    get: jest.fn().mockImplementation(() =>
      Promise.resolve({
        exists: !!docStore[`${collection}/${id}`],
        data: () => docStore[`${collection}/${id}`] ?? undefined,
        id,
      })
    ),
    delete: mockDeleteFn,
    update: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
  }
}

function makeCollectionRef(name: string) {
  return {
    doc: (id?: string) => makeDocRef(name, id ?? (name === 'portfolioPhotos' ? 'new-photo-id' : 'new-doc')),
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

const mockDb = {
  collection: jest.fn((name: string) => makeCollectionRef(name)),
  runTransaction: jest.fn(async (callback: (transaction: { get: (ref: { get: () => Promise<unknown> }) => Promise<unknown>; create: typeof mockPhotoCreate }) => Promise<void>) => {
    await callback({ get: (ref) => ref.get(), create: mockPhotoCreate })
  }),
}

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'nailist-user-1' }),
  })),
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

import { POST } from '@/app/api/portfolio/route'
import { DELETE } from '@/app/api/portfolio/[id]/route'

function makePostRequest(body: unknown, cookie?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/portfolio', {
    method: 'POST',
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

const storageKey = 'portfolio/nailist-profile-1/123e4567-e89b-12d3-a456-426614174000.jpg'
const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/test-bucket/o/${encodeURIComponent(storageKey)}?alt=media&token=123e4567-e89b-12d3-a456-426614174000`

function validPhotoBody(overrides: Record<string, unknown> = {}) {
  return { nailistProfileId: 'nailist-profile-1', url: uploadUrl, storageKey, ...overrides }
}

function makeDeleteRequest(cookie?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/portfolio/photo-1', { method: 'DELETE' })
  if (cookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (name: string) => (name === 'auth-token' ? { value: cookie } : undefined) }),
    })
  }
  return req
}

const mockParams = { params: Promise.resolve({ id: 'photo-1' }) }

describe('POST /api/portfolio', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    collectionStore['nailistProfiles'] = [
      { __id: 'nailist-profile-1', userId: 'nailist-user-1' },
    ]
    docStore['uploadQuotas/user-nailist-user-1'] = { entries: [{ key: storageKey, bytes: 123, ready: true }] }
  })

  it('returns 401 when no auth token', async () => {
    const res = await POST(makePostRequest(validPhotoBody()))
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller does not own the nailist profile', async () => {
    collectionStore['nailistProfiles'] = [{ __id: 'other-profile', userId: 'nailist-user-1' }]
    const res = await POST(makePostRequest(validPhotoBody(), 'token'))
    expect(res.status).toBe(403)
  })

  it('returns 400 when missing required fields', async () => {
    const res = await POST(makePostRequest({ nailistProfileId: 'nailist-profile-1' }, 'token'))
    expect(res.status).toBe(400)
  })

  it('returns 201 and creates photo when caller owns the profile', async () => {
    const res = await POST(makePostRequest(validPhotoBody(), 'token'))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.id).toBe('new-photo-id')
    expect(mockPhotoCreate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'new-photo-id' }),
      expect.objectContaining({ nailistProfileId: 'nailist-profile-1', url: uploadUrl, storageKey })
    )
  })

  it('returns 409 and does not create a photo once the nailist already has MAX_PORTFOLIO_PHOTOS (20)', async () => {
    collectionStore['portfolioPhotos'] = Array.from({ length: 20 }, (_, i) => ({
      __id: `photo-${i}`, nailistProfileId: 'nailist-profile-1', url: `https://ex.com/${i}.jpg`,
    }))
    const res = await POST(makePostRequest(validPhotoBody(), 'token'))
    expect(res.status).toBe(409)
    expect(mockPhotoCreate).not.toHaveBeenCalled()
  })

  it('still allows the 20th photo when the nailist has 19 already', async () => {
    collectionStore['portfolioPhotos'] = Array.from({ length: 19 }, (_, i) => ({
      __id: `photo-${i}`, nailistProfileId: 'nailist-profile-1', url: `https://ex.com/${i}.jpg`,
    }))
    const res = await POST(makePostRequest(validPhotoBody(), 'token'))
    expect(res.status).toBe(201)
    expect(mockPhotoCreate).toHaveBeenCalled()
  })

  it('does not count another nailist\'s photos toward this nailist\'s limit', async () => {
    collectionStore['portfolioPhotos'] = Array.from({ length: 20 }, (_, i) => ({
      __id: `other-photo-${i}`, nailistProfileId: 'some-other-profile', url: `https://ex.com/${i}.jpg`,
    }))
    const res = await POST(makePostRequest(validPhotoBody(), 'token'))
    expect(res.status).toBe(201)
  })

  it('rejects reuse of a completed upload', async () => {
    collectionStore['portfolioPhotos'] = [{
      __id: 'photo-1', nailistProfileId: 'nailist-profile-1', url: uploadUrl, storageKey,
    }]
    const res = await POST(makePostRequest(validPhotoBody(), 'token'))
    expect(res.status).toBe(409)
    expect(mockPhotoCreate).not.toHaveBeenCalled()
  })

  it('rejects a URL that does not refer to the completed upload key', async () => {
    const res = await POST(makePostRequest(validPhotoBody({ url: 'https://example.com/image.jpg' }), 'token'))
    expect(res.status).toBe(400)
    expect(mockPhotoCreate).not.toHaveBeenCalled()
  })

  it('rejects an unrecorded or unfinished upload', async () => {
    docStore['uploadQuotas/user-nailist-user-1'] = { entries: [{ key: storageKey, bytes: 123, ready: false }] }
    const res = await POST(makePostRequest(validPhotoBody(), 'token'))
    expect(res.status).toBe(400)
    expect(mockPhotoCreate).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/portfolio/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    docStore['portfolioPhotos/photo-1'] = { nailistProfileId: 'nailist-profile-1' }
    collectionStore['nailistProfiles'] = [
      { __id: 'nailist-profile-1', userId: 'nailist-user-1' },
    ]
  })

  it('returns 401 when no auth token', async () => {
    const res = await DELETE(makeDeleteRequest(), mockParams)
    expect(res.status).toBe(401)
  })

  it('returns 404 when photo does not exist', async () => {
    delete docStore['portfolioPhotos/photo-1']
    const res = await DELETE(makeDeleteRequest('token'), mockParams)
    expect(res.status).toBe(404)
  })

  it('returns 403 when caller does not own the nailist profile', async () => {
    collectionStore['nailistProfiles'] = [{ __id: 'other-profile', userId: 'nailist-user-1' }]
    const res = await DELETE(makeDeleteRequest('token'), mockParams)
    expect(res.status).toBe(403)
  })

  it('returns 200 and deletes photo when caller owns it', async () => {
    const res = await DELETE(makeDeleteRequest('token'), mockParams)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(mockDeleteFn).toHaveBeenCalled()
  })
})
