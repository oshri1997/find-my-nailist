/**
 * @jest-environment node
 *
 * Covers GET /api/announcements — the endpoint the global modal polls once
 * per session. It must: resolve the caller's audience from her role, filter
 * to PUBLISHED + MAJOR items published after her watermark, cap the modal's
 * digest, and never surface anything to an ADMIN account or an anonymous
 * caller.
 */
import { NextRequest } from 'next/server'

type Filter = { field: string; op: string; value: unknown }
type DocData = Record<string, unknown> & { __id: string }
const collectionStore: Record<string, DocData[]> = {}
const docStore: Record<string, Record<string, unknown>> = {}

function applyFilter(doc: DocData, filter: Filter): boolean {
  const value = doc[filter.field]
  if (filter.op === '==') return value === filter.value
  if (filter.op === 'in') return Array.isArray(filter.value) && filter.value.includes(value)
  if (filter.op === '>') {
    const a = value as { toDate?: () => Date } | undefined
    const b = filter.value as { toDate?: () => Date }
    const av = a?.toDate ? a.toDate().getTime() : -Infinity
    const bv = b?.toDate ? b.toDate().getTime() : 0
    return av > bv
  }
  return true
}

function makeQuery(name: string, filters: Filter[] = []) {
  return {
    where: (field: string, op: string, value: unknown) => makeQuery(name, [...filters, { field, op, value }]),
    orderBy: () => makeQuery(name, filters),
    limit: (n: number) => ({
      get: async () => {
        const docs = (collectionStore[name] ?? [])
          .filter((d) => filters.every((f) => applyFilter(d, f)))
          .sort((a, b) => {
            const av = (a.publishedAt as { toDate?: () => Date } | undefined)?.toDate?.().getTime() ?? 0
            const bv = (b.publishedAt as { toDate?: () => Date } | undefined)?.toDate?.().getTime() ?? 0
            return av - bv
          })
          .slice(0, n)
        return { docs: docs.map((d) => ({ id: d.__id, data: () => d })) }
      },
    }),
  }
}

function makeCollectionRef(name: string) {
  return {
    doc: (id: string) => ({
      get: async () => ({
        exists: !!docStore[`${name}/${id}`],
        data: () => docStore[`${name}/${id}`],
        id,
      }),
    }),
    ...makeQuery(name),
  }
}

const mockDb = { collection: jest.fn((name: string) => makeCollectionRef(name)) }
const verifyIdTokenMock = jest.fn()

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({ verifyIdToken: (...args: unknown[]) => verifyIdTokenMock(...args) })),
  adminDb: jest.fn(() => mockDb),
}))

import { GET } from '@/app/api/announcements/route'

function ts(iso: string) {
  return { toDate: () => new Date(iso) }
}

function makeRequest(cookie?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/announcements', { method: 'GET' })
  if (cookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (name: string) => (name === 'auth-token' ? { value: cookie } : undefined) }),
    })
  }
  return req
}

beforeEach(() => {
  jest.clearAllMocks()
  verifyIdTokenMock.mockResolvedValue({ uid: 'nailist-user-1' })
  docStore['users/nailist-user-1'] = {
    role: 'NAILIST',
    createdAt: ts('2026-01-01T00:00:00.000Z'),
    lastSeenAnnouncementsAt: ts('2026-09-10T00:00:00.000Z'),
  }
  collectionStore['announcements'] = []
})

describe('GET /api/announcements', () => {
  it('returns 401 for an anonymous caller', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns null for an ADMIN account — admins publish, they never consume', async () => {
    docStore['users/nailist-user-1'].role = 'ADMIN'
    collectionStore['announcements'] = [{
      __id: 'a1', status: 'PUBLISHED', priority: 'MAJOR', audience: 'ALL', publishedAt: ts('2026-09-18T00:00:00.000Z'),
    }]
    const res = await GET(makeRequest('token'))
    const json = await res.json()
    expect(json.data).toBeNull()
  })

  it('only returns MAJOR items published after the watermark, matching the caller audience', async () => {
    collectionStore['announcements'] = [
      { __id: 'seen', status: 'PUBLISHED', priority: 'MAJOR', audience: 'ALL', title: 'ישן', body: '', publishedAt: ts('2026-09-05T00:00:00.000Z') },
      { __id: 'minor', status: 'PUBLISHED', priority: 'MINOR', audience: 'ALL', title: 'קטן', body: '', publishedAt: ts('2026-09-15T00:00:00.000Z') },
      { __id: 'wrong-audience', status: 'PUBLISHED', priority: 'MAJOR', audience: 'CLIENT', title: 'ללקוחות', body: '', publishedAt: ts('2026-09-16T00:00:00.000Z') },
      { __id: 'retracted', status: 'RETRACTED', priority: 'MAJOR', audience: 'ALL', title: 'בוטל', body: '', publishedAt: ts('2026-09-17T00:00:00.000Z') },
      { __id: 'keep', status: 'PUBLISHED', priority: 'MAJOR', audience: 'NAILIST', title: 'שעות מפוצלות', body: 'תיאור', publishedAt: ts('2026-09-18T00:00:00.000Z') },
    ]

    const res = await GET(makeRequest('token'))
    const json = await res.json()
    expect(json.data.items).toHaveLength(1)
    expect(json.data.items[0].id).toBe('keep')
    expect(json.data.hasMore).toBe(false)
  })

  it('caps the digest at 5 items and reports hasMore', async () => {
    collectionStore['announcements'] = Array.from({ length: 7 }, (_, i) => ({
      __id: `major-${i}`,
      status: 'PUBLISHED',
      priority: 'MAJOR',
      audience: 'ALL',
      title: `עדכון ${i}`,
      body: '',
      publishedAt: ts(`2026-09-1${i}T00:00:00.000Z`),
    }))

    const res = await GET(makeRequest('token'))
    const json = await res.json()
    expect(json.data.items).toHaveLength(5)
    expect(json.data.hasMore).toBe(true)
  })

  it('falls back to the account creation date when there is no watermark yet', async () => {
    docStore['users/nailist-user-1'].lastSeenAnnouncementsAt = undefined
    collectionStore['announcements'] = [
      { __id: 'before-signup', status: 'PUBLISHED', priority: 'MAJOR', audience: 'ALL', title: 'לפני ההרשמה', body: '', publishedAt: ts('2025-12-31T00:00:00.000Z') },
      { __id: 'after-signup', status: 'PUBLISHED', priority: 'MAJOR', audience: 'ALL', title: 'אחרי ההרשמה', body: '', publishedAt: ts('2026-01-02T00:00:00.000Z') },
    ]

    const res = await GET(makeRequest('token'))
    const json = await res.json()
    expect(json.data.items.map((i: { id: string }) => i.id)).toEqual(['after-signup'])
  })

  it('returns null when there is nothing unseen', async () => {
    const res = await GET(makeRequest('token'))
    const json = await res.json()
    expect(json.data).toBeNull()
  })
})
