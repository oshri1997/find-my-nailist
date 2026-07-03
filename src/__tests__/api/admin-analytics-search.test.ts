/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockVerifyIdToken = jest.fn()

type DocData = Record<string, unknown>
const collectionStore: Record<string, (DocData & { __id: string })[]> = {}

function makeCollectionRef(name: string) {
  return {
    doc: (id: string) => ({
      get: jest.fn().mockResolvedValue({
        exists: !!collectionStore[name]?.find(d => d.__id === id),
        data: () => collectionStore[name]?.find(d => d.__id === id),
      }),
    }),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      docs: (collectionStore[name] ?? []).map(d => ({ id: d.__id, data: () => d })),
    }),
  }
}

const mockDb = { collection: jest.fn((name: string) => makeCollectionRef(name)) }

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: () => ({ verifyIdToken: mockVerifyIdToken }),
  adminDb: () => mockDb,
}))

import { GET } from '@/app/api/admin/analytics/search/route'

function seedCallerUser(uid: string, isAdmin: boolean) {
  collectionStore.users = [
    ...(collectionStore.users ?? []).filter(u => u.__id !== uid),
    { __id: uid, email: `${uid}@test.com`, role: 'NAILIST', isAdmin },
  ]
}

function adminRequest() {
  mockVerifyIdToken.mockResolvedValue({ uid: 'admin-uid' })
  seedCallerUser('admin-uid', true)
  const req = new NextRequest('http://localhost/api/admin/analytics/search')
  Object.defineProperty(req, 'cookies', {
    value: { get: (k: string) => k === 'auth-token' ? { value: 'valid-token' } : undefined },
  })
  return req
}

function nonAdminRequest() {
  mockVerifyIdToken.mockResolvedValue({ uid: 'other-uid' })
  seedCallerUser('other-uid', false)
  const req = new NextRequest('http://localhost/api/admin/analytics/search')
  Object.defineProperty(req, 'cookies', {
    value: { get: (k: string) => k === 'auth-token' ? { value: 'token' } : undefined },
  })
  return req
}

beforeEach(() => {
  jest.clearAllMocks()
  collectionStore.searchEvents = [
    { __id: 'e1', query: 'רחובות', filter: 'הכל', resultsCount: 1 },
    { __id: 'e2', query: 'רחובות', filter: 'הכל', resultsCount: 1 },
    { __id: 'e3', query: 'תל אביב', filter: "ג'ל", resultsCount: 4 },
    { __id: 'e4', query: null, filter: "ג'ל", resultsCount: 4 },
    { __id: 'e5', query: 'אקסטנשן ברמלה', filter: 'הכל', resultsCount: 0 },
    { __id: 'e6', query: 'אקסטנשן ברמלה', filter: 'הכל', resultsCount: 0 },
  ]
})

describe('GET /api/admin/analytics/search', () => {
  it('returns 403 for non-admin', async () => {
    const res = await GET(nonAdminRequest())
    expect(res.status).toBe(403)
  })

  it('returns 403 for unauthenticated request', async () => {
    const req = new NextRequest('http://localhost/api/admin/analytics/search')
    Object.defineProperty(req, 'cookies', { value: { get: () => undefined } })
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('aggregates top queries by frequency, case-insensitively normalized', async () => {
    const res = await GET(adminRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.topQueries[0]).toEqual({ value: 'רחובות', count: 2 })
  })

  it('aggregates filter usage counts', async () => {
    const res = await GET(adminRequest())
    const json = await res.json()
    const gel = json.data.topFilters.find((f: { value: string }) => f.value === "ג'ל")
    expect(gel.count).toBe(2)
  })

  it('surfaces zero-result queries separately, excluding null queries', async () => {
    const res = await GET(adminRequest())
    const json = await res.json()
    expect(json.data.zeroResultQueries).toEqual([{ value: 'אקסטנשן ברמלה', count: 2 }])
  })

  it('reports the sampled event count', async () => {
    const res = await GET(adminRequest())
    const json = await res.json()
    expect(json.data.sampledEvents).toBe(6)
  })
})
