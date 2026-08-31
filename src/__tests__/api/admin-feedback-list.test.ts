/** @jest-environment node */
import { NextRequest } from 'next/server'

type StoredFeedback = Record<string, unknown> & { __id: string }
const feedback: StoredFeedback[] = []

interface FakeQuery {
  where: (field: string, operator: string, expected: unknown) => FakeQuery
  orderBy: () => FakeQuery
  startAfter: (snap: { id: string }) => FakeQuery
  limit: (value: number) => FakeQuery
  get: () => Promise<{ docs: Array<{ id: string; exists: boolean; data: () => StoredFeedback }> }>
  count: () => { get: () => Promise<{ data: () => { count: number } }> }
}

function dateValue(value: unknown) {
  return value && typeof value === 'object' && 'toDate' in value
    ? (value as { toDate: () => Date }).toDate().getTime()
    : 0
}

function matches(doc: StoredFeedback, filters: Array<[string, string, unknown]>) {
  return filters.every(([field, operator, expected]) => {
    if (operator === '==') return doc[field] === expected
    if (operator === 'array-contains') return Array.isArray(doc[field]) && doc[field].includes(expected)
    return false
  })
}

function collectionRef() {
  const filters: Array<[string, string, unknown]> = []
  let max: number | undefined
  let cursorId: string | undefined
  const query: FakeQuery = {
    where: jest.fn((field: string, operator: string, expected: unknown) => {
      filters.push([field, operator, expected])
      return query
    }),
    orderBy: jest.fn(() => query),
    startAfter: jest.fn((snap: { id: string }) => {
      cursorId = snap.id
      return query
    }),
    limit: jest.fn((value: number) => {
      max = value
      return query
    }),
    get: jest.fn(async () => {
      let docs = feedback
        .filter((doc) => matches(doc, filters))
        .sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt) || b.__id.localeCompare(a.__id))
      if (cursorId) {
        const index = docs.findIndex((doc) => doc.__id === cursorId)
        docs = index >= 0 ? docs.slice(index + 1) : docs
      }
      if (max !== undefined) docs = docs.slice(0, max)
      return {
        docs: docs.map((doc) => ({ id: doc.__id, exists: true, data: () => doc })),
      }
    }),
    count: jest.fn(() => ({
      get: async () => ({ data: () => ({ count: feedback.filter((doc) => matches(doc, filters)).length }) }),
    })),
  }
  return query
}

const mockDb = {
  collection: jest.fn(() => ({
    ...collectionRef(),
    doc: jest.fn((id: string) => ({
      id,
      get: async () => {
        const doc = feedback.find((entry) => entry.__id === id)
        return { id, exists: Boolean(doc), data: () => doc }
      },
    })),
  })),
}

jest.mock('@/lib/firebase/admin', () => ({ adminDb: jest.fn(() => mockDb) }))
jest.mock('@/lib/admin-auth', () => ({
  verifyAdmin: jest.fn().mockResolvedValue({ uid: 'admin-1', email: 'admin@test.com' }),
  adminUnauthorized: () => new Response(JSON.stringify({ error: 'אין הרשאה' }), { status: 403 }),
}))
jest.mock('firebase-admin/firestore', () => ({ FieldPath: { documentId: () => '__name__' } }))

import { verifyAdmin } from '@/lib/admin-auth'
import { GET } from '@/app/api/admin/feedback/route'

const mockVerifyAdmin = verifyAdmin as jest.Mock
const timestamp = (iso: string) => ({ toDate: () => new Date(iso) })

function addFeedback(id: string, overrides: Record<string, unknown> = {}) {
  feedback.push({
    __id: id,
    reporterUid: 'user-1',
    reporterEmail: 'user@example.com',
    reporterDisplayName: 'אושרי',
    type: 'BUG',
    subject: 'התור לא נשמר',
    description: 'פרטי תקלה',
    status: 'NEW',
    priority: 'NORMAL',
    pageUrl: '/appointments',
    searchTerms: ['ת', 'תו', 'תור', 'a', 'os', 'oshri'],
    userAgent: 'private browser fingerprint',
    createdAt: timestamp('2026-08-01T00:00:00.000Z'),
    updatedAt: timestamp('2026-08-01T00:00:00.000Z'),
    ...overrides,
  })
}

function request(query = '') {
  return new NextRequest(`http://localhost/api/admin/feedback${query}`)
}

describe('GET /api/admin/feedback', () => {
  beforeEach(() => {
    feedback.length = 0
    jest.clearAllMocks()
    mockVerifyAdmin.mockResolvedValue({ uid: 'admin-1', email: 'admin@test.com' })
  })

  it('requires an administrator', async () => {
    mockVerifyAdmin.mockResolvedValue(null)
    expect((await GET(request())).status).toBe(403)
  })

  it('returns a safe latest-first page with header counts', async () => {
    addFeedback('older')
    addFeedback('newer', {
      status: 'IN_REVIEW', priority: 'HIGH', type: 'IDEA', subject: 'רעיון',
      createdAt: timestamp('2026-08-02T00:00:00.000Z'),
    })

    const response = await GET(request())
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data.map((entry: { id: string }) => entry.id)).toEqual(['newer', 'older'])
    expect(json.data[0]).toEqual(expect.objectContaining({ id: 'newer' }))
    expect(json.data[0]).not.toHaveProperty('userAgent')
    expect(json.data[0]).not.toHaveProperty('searchTerms')
    expect(json.counts).toEqual(expect.objectContaining({ NEW: 1, IN_REVIEW: 1, total: 2 }))
  })

  it('uses an opaque cursor without duplicate records', async () => {
    addFeedback('one', { createdAt: timestamp('2026-08-03T00:00:00.000Z') })
    addFeedback('two', { createdAt: timestamp('2026-08-02T00:00:00.000Z') })
    addFeedback('three', { createdAt: timestamp('2026-08-01T00:00:00.000Z') })

    const first = await GET(request('?pageSize=2'))
    const firstJson = await first.json()
    expect(firstJson.data.map((entry: { id: string }) => entry.id)).toEqual(['one', 'two'])
    expect(firstJson.pagination.hasMore).toBe(true)

    const second = await GET(request(`?pageSize=2&cursor=${encodeURIComponent(firstJson.pagination.nextCursor)}`))
    const secondJson = await second.json()
    expect(secondJson.data.map((entry: { id: string }) => entry.id)).toEqual(['three'])
    expect(secondJson.pagination.hasMore).toBe(false)
  })

  it('rejects a cursor replayed under different canonical filters or page size', async () => {
    addFeedback('one', { status: 'NEW', createdAt: timestamp('2026-08-03T00:00:00.000Z') })
    addFeedback('two', { status: 'NEW', createdAt: timestamp('2026-08-02T00:00:00.000Z') })
    addFeedback('three', { status: 'IN_REVIEW', createdAt: timestamp('2026-08-01T00:00:00.000Z') })

    const first = await GET(request('?status=NEW&pageSize=1'))
    const { pagination } = await first.json()

    expect((await GET(request(`?status=IN_REVIEW&pageSize=1&cursor=${encodeURIComponent(pagination.nextCursor)}`))).status).toBe(400)
    expect((await GET(request(`?status=NEW&pageSize=2&cursor=${encodeURIComponent(pagination.nextCursor)}`))).status).toBe(400)
  })

  it('applies indexed status/type/priority and token-prefix search filters', async () => {
    addFeedback('match', { status: 'IN_REVIEW', type: 'BUG', priority: 'HIGH', searchTerms: ['ת', 'תו', 'תור'] })
    addFeedback('wrong-status', { status: 'NEW', type: 'BUG', priority: 'HIGH', searchTerms: ['ת', 'תו', 'תור'] })
    addFeedback('wrong-search', { status: 'IN_REVIEW', type: 'BUG', priority: 'HIGH', searchTerms: ['ר', 'רע', 'רעיון'] })

    const response = await GET(request('?status=IN_REVIEW&type=BUG&priority=HIGH&q=%D7%AA%D7%95%D7%A8'))
    const json = await response.json()
    expect(json.data.map((entry: { id: string }) => entry.id)).toEqual(['match'])
    // Counts intentionally remain useful for the header cards while a status
    // filter is active, so they include every matching type/priority/search
    // report split by status rather than merely the current list page.
    expect(json.counts).toEqual(expect.objectContaining({ NEW: 1, IN_REVIEW: 1, total: 2 }))
  })

  it.each([
    ['?status=NOPE'],
    ['?type=NOPE'],
    ['?priority=NOPE'],
    ['?pageSize=0'],
    ['?pageSize=51'],
    ['?cursor=not-a-cursor'],
    ['?q=two%20words'],
  ])('rejects an invalid query: %s', async (query) => {
    expect((await GET(request(query))).status).toBe(400)
  })

  it('rejects an opaque cursor that no longer points to a report', async () => {
    const cursor = Buffer.from(JSON.stringify({ v: 2, id: 'missing', scope: JSON.stringify({ status: null, type: null, priority: null, q: null, pageSize: 25 }) })).toString('base64url')
    expect((await GET(request(`?cursor=${cursor}`))).status).toBe(400)
  })
})
