/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

type DocData = Record<string, unknown>
const collectionStore: Record<string, (DocData & { __id: string })[]> = {}

function makeQuery(name: string, limitN?: number) {
  return {
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockImplementation((n: number) => makeQuery(name, n)),
    get: jest.fn().mockImplementation(async () => {
      const all = collectionStore[name] ?? []
      const docs = (limitN !== undefined ? all.slice(0, limitN) : all).map((d) => ({
        id: d.__id,
        data: () => d,
      }))
      return { docs }
    }),
  }
}

const mockDb = {
  collection: jest.fn((name: string) => makeQuery(name)),
}

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('@/lib/admin-auth', () => ({
  verifyAdmin: jest.fn().mockResolvedValue({ uid: 'admin-1', email: 'admin@test.com' }),
  adminUnauthorized: () => new Response(JSON.stringify({ error: 'אין הרשאה' }), { status: 403 }),
}))

import { GET } from '@/app/api/admin/users/route'

function makeRequest(query?: string): NextRequest {
  return new NextRequest(`http://localhost/api/admin/users${query ? `?${query}` : ''}`)
}

describe('GET /api/admin/users — search beyond the recent-200 window', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // 199 recent filler users, then one old match at the very end (index 199,
    // outside a naive top-200-then-filter approach would still include it —
    // so push the target further back to genuinely sit outside any small cap).
    collectionStore.users = [
      ...Array.from({ length: 250 }, (_, i) => ({
        __id: `filler-${i}`,
        email: `filler${i}@test.com`,
        displayName: `Filler ${i}`,
        role: 'CLIENT',
        createdAt: { toDate: () => new Date(Date.now() - i * 60 * 60 * 1000) },
      })),
      {
        __id: 'old-match',
        email: 'target@test.com',
        displayName: 'Target User',
        role: 'CLIENT',
        createdAt: { toDate: () => new Date(Date.now() - 400 * 60 * 60 * 1000) },
      },
    ]
  })

  it('finds a match older than the 200-most-recent window when searching', async () => {
    const res = await GET(makeRequest('search=target'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.some((u: { email: string }) => u.email === 'target@test.com')).toBe(true)
  })

  it('still caps the unfiltered listing at 200 when no search term is given', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(200)
  })
})
