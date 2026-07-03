/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// ── Firebase Admin mocks ────────────────────────────────────────────────────

const mockVerifyIdToken = jest.fn()

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: () => ({ verifyIdToken: mockVerifyIdToken, deleteUser: jest.fn().mockResolvedValue(undefined) }),
  adminDb: () => mockDb,
}))

type DocData = Record<string, unknown>
const collectionStore: Record<string, (DocData & { __id: string })[]> = {}

function makeRef(col: string, id: string) {
  return {
    exists: !!(collectionStore[col]?.find(d => d.__id === id)),
    id,
    data: () => collectionStore[col]?.find(d => d.__id === id),
    delete: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    ref: { delete: jest.fn().mockResolvedValue(undefined), update: jest.fn().mockResolvedValue(undefined) },
  }
}

function makeCollectionRef(name: string) {
  return {
    doc: (id: string) => {
      const row = collectionStore[name]?.find(d => d.__id === id)
      return {
        get: jest.fn().mockResolvedValue({
          exists: !!row,
          id,
          data: () => row,
          ref: { delete: jest.fn().mockResolvedValue(undefined), update: jest.fn().mockResolvedValue(undefined) },
        }),
        delete: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
      }
    },
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      size: (collectionStore[name] ?? []).length,
      docs: (collectionStore[name] ?? []).map(d => ({
        id: d.__id,
        data: () => d,
        ref: { delete: jest.fn().mockResolvedValue(undefined), update: jest.fn().mockResolvedValue(undefined) },
      })),
    }),
  }
}

const mockDb = {
  collection: jest.fn((name: string) => makeCollectionRef(name)),
  batch: jest.fn(() => ({
    delete: jest.fn(),
    update: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
  })),
}

// ── Admin auth mock ────────────────────────────────────────────────────────

// verifyAdmin now looks up the caller's isAdmin flag from Firestore rather
// than comparing a hardcoded email, so these helpers seed a `users` doc for
// the token's uid alongside whatever business data each describe block set up.
function seedCallerUser(uid: string, role: string, isAdmin: boolean) {
  collectionStore.users = [
    ...(collectionStore.users ?? []).filter(u => u.__id !== uid),
    { __id: uid, email: `${uid}@test.com`, role, isAdmin },
  ]
}

function adminRequest(path = '/api/admin/stats') {
  mockVerifyIdToken.mockResolvedValue({ uid: 'admin-uid', email: 'oshri19970@gmail.com' })
  seedCallerUser('admin-uid', 'NAILIST', true)
  const req = new NextRequest(`http://localhost${path}`)
  Object.defineProperty(req, 'cookies', {
    value: { get: (key: string) => key === 'auth-token' ? { value: 'valid-token' } : undefined },
  })
  return req
}

function nonAdminRequest(path = '/api/admin/stats') {
  mockVerifyIdToken.mockResolvedValue({ uid: 'other-uid', email: 'other@gmail.com' })
  seedCallerUser('other-uid', 'CLIENT', false)
  const req = new NextRequest(`http://localhost${path}`)
  Object.defineProperty(req, 'cookies', {
    value: { get: (key: string) => key === 'auth-token' ? { value: 'non-admin-token' } : undefined },
  })
  return req
}

function unauthRequest(path = '/api/admin/stats') {
  const req = new NextRequest(`http://localhost${path}`)
  Object.defineProperty(req, 'cookies', {
    value: { get: () => undefined },
  })
  return req
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('GET /api/admin/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    collectionStore.users = [
      { __id: 'u1', email: 'a@test.com', role: 'CLIENT', createdAt: { toDate: () => new Date() } },
      { __id: 'u2', email: 'b@test.com', role: 'NAILIST', createdAt: { toDate: () => new Date() } },
    ]
    collectionStore.nailistProfiles = [
      { __id: 'n1', isActive: true, avgRating: 4.5 },
    ]
    collectionStore.clientProfiles = [{ __id: 'c1' }]
    collectionStore.appointments = [
      { __id: 'a1', status: 'PENDING', price: 100 },
      { __id: 'a2', status: 'COMPLETED', price: 150 },
    ]
    collectionStore.reviews = [{ __id: 'r1', rating: 5 }]
  })

  it('returns 403 for unauthenticated request', async () => {
    const { GET } = await import('@/app/api/admin/stats/route')
    const res = await GET(unauthRequest())
    expect(res.status).toBe(403)
  })

  it('returns 403 for non-admin user', async () => {
    const { GET } = await import('@/app/api/admin/stats/route')
    const res = await GET(nonAdminRequest())
    expect(res.status).toBe(403)
  })

  it('returns stats for admin user', async () => {
    const { GET } = await import('@/app/api/admin/stats/route')
    const res = await GET(adminRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveProperty('totalUsers')
    expect(json.data).toHaveProperty('totalNailists')
    expect(json.data).toHaveProperty('totalAppointments')
    expect(json.data).toHaveProperty('appointmentsByStatus')
  })
})

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    collectionStore.users = [
      { __id: 'u1', email: 'alice@test.com', displayName: 'Alice', role: 'CLIENT', createdAt: { toDate: () => new Date() } },
      { __id: 'u2', email: 'bob@test.com', displayName: 'Bob', role: 'NAILIST', createdAt: { toDate: () => new Date() } },
    ]
  })

  it('returns 403 for non-admin', async () => {
    const { GET } = await import('@/app/api/admin/users/route')
    const res = await GET(nonAdminRequest('/api/admin/users'))
    expect(res.status).toBe(403)
  })

  it('returns user list for admin', async () => {
    const { GET } = await import('@/app/api/admin/users/route')
    const res = await GET(adminRequest('/api/admin/users'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.data)).toBe(true)
  })

  it('includes isAdmin: true for a user with the flag set, false otherwise', async () => {
    collectionStore.users = [
      { __id: 'u1', email: 'alice@test.com', displayName: 'Alice', role: 'CLIENT', createdAt: { toDate: () => new Date() } },
      { __id: 'u2', email: 'admin2@test.com', displayName: 'Admin2', role: 'NAILIST', isAdmin: true, createdAt: { toDate: () => new Date() } },
    ]
    const { GET } = await import('@/app/api/admin/users/route')
    const res = await GET(adminRequest('/api/admin/users'))
    const json = await res.json()
    const alice = json.data.find((u: { email: string }) => u.email === 'alice@test.com')
    const admin2 = json.data.find((u: { email: string }) => u.email === 'admin2@test.com')
    expect(alice.isAdmin).toBe(false)
    expect(admin2.isAdmin).toBe(true)
  })
})

describe('GET /api/admin/nailists', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    collectionStore.nailistProfiles = [
      { __id: 'n1', businessName: 'Test Nails', city: 'Tel Aviv', isActive: true, avgRating: 4.8, reviewCount: 10, createdAt: { toDate: () => new Date() } },
    ]
  })

  it('returns 403 for non-admin', async () => {
    const { GET } = await import('@/app/api/admin/nailists/route')
    const res = await GET(nonAdminRequest('/api/admin/nailists'))
    expect(res.status).toBe(403)
  })

  it('returns nailist list for admin', async () => {
    const { GET } = await import('@/app/api/admin/nailists/route')
    const res = await GET(adminRequest('/api/admin/nailists'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.data)).toBe(true)
  })
})
