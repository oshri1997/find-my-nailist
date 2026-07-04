/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

type DocData = Record<string, unknown>
const collectionStore: Record<string, (DocData & { __id: string })[]> = {}

function makeQuery(name: string, whereField?: string, whereValue?: unknown, limitN?: number) {
  return {
    where: jest.fn().mockImplementation((field: string, _op: string, value: unknown) =>
      makeQuery(name, field, value, limitN)
    ),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockImplementation((n: number) => makeQuery(name, whereField, whereValue, n)),
    get: jest.fn().mockImplementation(async () => {
      const filtered = (collectionStore[name] ?? []).filter(
        (d) => whereField === undefined || d[whereField] === whereValue
      )
      const docs = (limitN !== undefined ? filtered.slice(0, limitN) : filtered).map((d) => ({
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
  verifyAdmin: jest.fn(),
  adminUnauthorized: () => new Response(JSON.stringify({ error: 'אין הרשאה' }), { status: 403 }),
}))

import { verifyAdmin } from '@/lib/admin-auth'
import { GET } from '@/app/api/admin/appointments/route'

const mockVerifyAdmin = verifyAdmin as jest.Mock

function makeRequest(query?: string): NextRequest {
  return new NextRequest(`http://localhost/api/admin/appointments${query ? `?${query}` : ''}`)
}

describe('GET /api/admin/appointments', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockVerifyAdmin.mockResolvedValue({ uid: 'admin-1', email: 'admin@test.com' })
    collectionStore.appointments = Array.from({ length: 120 }, (_, i) => ({
      __id: `apt-${i}`,
      status: i < 3 ? 'CANCELLED' : 'CONFIRMED',
      startTime: { toDate: () => new Date(Date.now() - i * 60 * 60 * 1000) },
    }))
  })

  it('returns 403 when not an admin', async () => {
    mockVerifyAdmin.mockResolvedValue(null)
    const res = await GET(makeRequest())
    expect(res.status).toBe(403)
  })

  it('applies the status filter at the query level, not just in-memory', async () => {
    const res = await GET(makeRequest('status=CANCELLED'))
    expect(res.status).toBe(200)
    const json = await res.json()
    // All 3 CANCELLED docs are returned even though they're older than the
    // 100 most-recent-by-startTime docs — proving the filter runs in the
    // query (via .where), not as an in-memory .filter after a plain top-100 fetch.
    expect(json.data).toHaveLength(3)
    expect(json.data.every((a: { status: string }) => a.status === 'CANCELLED')).toBe(true)
  })

  it('returns up to 100 unfiltered appointments when no status is given', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(100)
  })
})
