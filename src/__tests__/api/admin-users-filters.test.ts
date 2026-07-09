/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

type DocData = Record<string, unknown>
const collectionStore: Record<string, (DocData & { __id: string })[]> = {}

function makeUsersQuery(limitN?: number) {
  return {
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockImplementation((n: number) => makeUsersQuery(n)),
    get: jest.fn().mockImplementation(async () => {
      const all = collectionStore.users ?? []
      const docs = (limitN !== undefined ? all.slice(0, limitN) : all).map((d) => ({ id: d.__id, data: () => d }))
      return { docs }
    }),
  }
}

function makeProfileQuery(name: string, userIds?: string[]) {
  return {
    where: jest.fn().mockImplementation((_field: string, _op: string, values: string[]) => makeProfileQuery(name, values)),
    get: jest.fn().mockImplementation(async () => {
      const all = collectionStore[name] ?? []
      const docs = all
        .filter((d) => !userIds || userIds.includes(d.userId as string))
        .map((d) => ({ id: d.__id, data: () => d }))
      return { docs }
    }),
  }
}

const mockDb = {
  collection: jest.fn((name: string) => name === 'users' ? makeUsersQuery() : makeProfileQuery(name)),
}

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('@/lib/admin-auth', () => ({
  verifyAdmin: jest.fn().mockResolvedValue({ uid: 'admin-1', email: 'admin@test.com' }),
  adminUnauthorized: () => new Response(JSON.stringify({ error: 'אין הרשאה' }), { status: 403 }),
}))

import { GET } from '@/app/api/admin/users/route'

function makeRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/admin/users?${query}`)
}

describe('GET /api/admin/users — filters', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    collectionStore.users = [
      { __id: 'u1', email: 'alice@test.com', displayName: 'Alice', role: 'CLIENT', createdAt: { toDate: () => new Date('2026-01-10') } },
      { __id: 'u2', email: 'bob@test.com', displayName: 'Bob', role: 'NAILIST', createdAt: { toDate: () => new Date('2026-02-15') } },
      { __id: 'u3', email: 'carol@test.com', displayName: 'Carol', role: 'NAILIST', createdAt: { toDate: () => new Date('2026-03-20') } },
    ]
    collectionStore.nailistProfiles = [
      { __id: 'np-u2', userId: 'u2', onboardingCompleted: true },
      { __id: 'np-u3', userId: 'u3', onboardingCompleted: false },
    ]
    collectionStore.clientProfiles = [
      { __id: 'cp-u1', userId: 'u1' }, // no onboardingCompleted field -> counts as completed
    ]
  })

  it('filters by role', async () => {
    const res = await GET(makeRequest('role=NAILIST'))
    const json = await res.json()
    expect(json.data.map((u: { id: string }) => u.id).sort()).toEqual(['u2', 'u3'])
  })

  it('filters by createdFrom/createdTo date range', async () => {
    const res = await GET(makeRequest('createdFrom=2026-02-01&createdTo=2026-02-28'))
    const json = await res.json()
    expect(json.data.map((u: { id: string }) => u.id)).toEqual(['u2'])
  })

  it('includes a createdFrom-boundary user by Israel wall-clock day, not UTC day', async () => {
    // Regression: 2026-01-31T23:00:00Z is 2026-02-01 01:00 in Israel (IST,
    // UTC+2 in winter) — a naive `new Date('2026-02-01')` UTC-midnight
    // threshold would wrongly exclude her from a "created from 2026-02-01" filter.
    collectionStore.users.push({
      __id: 'u4', email: 'dana@test.com', displayName: 'Dana', role: 'CLIENT',
      createdAt: { toDate: () => new Date('2026-01-31T23:00:00Z') },
    })
    const res = await GET(makeRequest('createdFrom=2026-02-01'))
    const json = await res.json()
    expect(json.data.map((u: { id: string }) => u.id)).toContain('u4')
  })

  it('excludes a createdTo-boundary user by Israel wall-clock day, not UTC day', async () => {
    // Regression: 2026-02-28T22:30:00Z is already 2026-03-01 00:30 in Israel
    // — a naive local end-of-day-2026-02-28 threshold would wrongly include
    // her in a "created until 2026-02-28" filter.
    collectionStore.users.push({
      __id: 'u5', email: 'erez@test.com', displayName: 'Erez', role: 'CLIENT',
      createdAt: { toDate: () => new Date('2026-02-28T22:30:00Z') },
    })
    const res = await GET(makeRequest('createdTo=2026-02-28'))
    const json = await res.json()
    expect(json.data.map((u: { id: string }) => u.id)).not.toContain('u5')
  })

  it('filters by onboardingStatus=completed, treating a missing field as completed', async () => {
    const res = await GET(makeRequest('onboardingStatus=completed'))
    const json = await res.json()
    expect(json.data.map((u: { id: string }) => u.id).sort()).toEqual(['u1', 'u2'])
  })

  it('filters by onboardingStatus=incomplete', async () => {
    const res = await GET(makeRequest('onboardingStatus=incomplete'))
    const json = await res.json()
    expect(json.data.map((u: { id: string }) => u.id)).toEqual(['u3'])
  })

  it('combines role and onboardingStatus filters', async () => {
    const res = await GET(makeRequest('role=NAILIST&onboardingStatus=completed'))
    const json = await res.json()
    expect(json.data.map((u: { id: string }) => u.id)).toEqual(['u2'])
  })
})
