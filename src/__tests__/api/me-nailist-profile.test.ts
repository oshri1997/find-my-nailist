/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockVerifyIdToken = jest.fn()
const mockAdd = jest.fn().mockResolvedValue({ id: 'auto-created-profile' })
const mockDocUpdate = jest.fn().mockResolvedValue(undefined)

const docStore: Record<string, Record<string, unknown> | null> = {}
const collectionStore: Record<string, (Record<string, unknown> & { __id: string })[]> = {}

function makeDocRef(collection: string, id: string) {
  return {
    get: jest.fn().mockImplementation(() =>
      Promise.resolve({
        exists: !!docStore[`${collection}/${id}`],
        data: () => docStore[`${collection}/${id}`] ?? undefined,
        id,
      })
    ),
    update: mockDocUpdate,
  }
}

function makeCollectionRef(name: string) {
  return {
    doc: (id?: string) => (id ? makeDocRef(name, id) : { id: 'new-doc' }),
    add: mockAdd,
    where: jest.fn().mockImplementation((field: string, _op: string, value: unknown) => {
      const filtered = (collectionStore[name] ?? []).filter(d => d[field] === value)
      return {
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: filtered.length === 0,
          docs: filtered.map(d => ({
            id: d.__id,
            data: () => d,
            ref: makeDocRef(name, d.__id),
          })),
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

import { GET } from '@/app/api/me/nailist-profile/route'

function makeRequest(withCookie = true): NextRequest {
  const req = new NextRequest('http://localhost/api/me/nailist-profile', { method: 'GET' })
  if (withCookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (n: string) => n === 'auth-token' ? { value: 'valid-token' } : undefined }),
    })
  }
  return req
}

describe('GET /api/me/nailist-profile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123', email: 'nail@test.com', name: 'Test User' })
    collectionStore['nailistProfiles'] = []
    docStore['users/user-123'] = { role: 'NAILIST' }
  })

  it('returns 401 when no auth token', async () => {
    const req = makeRequest(false)
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns existing nailist profile with id when found', async () => {
    collectionStore['nailistProfiles'] = [
      { __id: 'nailist-profile-1', userId: 'user-123', businessName: 'Studio Nails', photoUrl: '/photo.jpg' },
    ]
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.id).toBe('nailist-profile-1')
    expect(json.data.businessName).toBe('Studio Nails')
  })

  it('backfills photoUrl from token when profile exists but has no photoUrl', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123', picture: 'https://google.com/photo.jpg' })
    collectionStore['nailistProfiles'] = [
      { __id: 'nailist-profile-1', userId: 'user-123', businessName: 'Studio', photoUrl: null },
    ]
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockDocUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ photoUrl: 'https://google.com/photo.jpg' })
    )
  })

  it('does NOT backfill photoUrl when profile already has one', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123', picture: 'https://new-photo.jpg' })
    collectionStore['nailistProfiles'] = [
      { __id: 'nailist-profile-1', userId: 'user-123', photoUrl: '/existing-photo.jpg' },
    ]
    const req = makeRequest()
    await GET(req)
    expect(mockDocUpdate).not.toHaveBeenCalled()
  })

  it('returns {data: null} when no profile and user is CLIENT', async () => {
    docStore['users/user-123'] = { role: 'CLIENT' }
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toBeNull()
  })

  it('auto-creates profile for NAILIST user who has no profile yet', async () => {
    docStore['users/user-123'] = { role: 'NAILIST' }
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.id).toBe('auto-created-profile')
    expect(mockAdd).toHaveBeenCalled()
  })

  it('auto-created profile is marked isActive: false', async () => {
    docStore['users/user-123'] = { role: 'NAILIST' }
    const req = makeRequest()
    await GET(req)
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false })
    )
  })

  it('auto-created profile is marked onboardingCompleted: false, so OnboardingGuard redirects her back into the wizard', async () => {
    docStore['users/user-123'] = { role: 'NAILIST' }
    const req = makeRequest()
    await GET(req)
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ onboardingCompleted: false })
    )
  })

  it('auto-created profile uses email from token', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123', email: 'auto@test.com' })
    docStore['users/user-123'] = { role: 'NAILIST' }
    const req = makeRequest()
    await GET(req)
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'auto@test.com' })
    )
  })

  it('returns 500 when verifyIdToken throws an unexpected error', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Firebase down'))
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(500)
  })
})
