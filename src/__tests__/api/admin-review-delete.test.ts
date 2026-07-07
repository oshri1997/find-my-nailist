/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

type DocData = Record<string, unknown>
const collectionStore: Record<string, (DocData & { __id: string })[]> = {}
const addedDocs: Record<string, DocData[]> = {}
const deletedDocIds: Record<string, string[]> = {}
const mockUpdateFn = jest.fn().mockResolvedValue(undefined)

function makeQuery(name: string, whereField?: string, whereValue?: unknown) {
  const filtered = () => (collectionStore[name] ?? []).filter(
    (d) => whereField === undefined || d[whereField] === whereValue
  )
  return {
    where: jest.fn().mockImplementation((field: string, _op: string, value: unknown) => makeQuery(name, field, value)),
    get: jest.fn().mockImplementation(async () => ({
      size: filtered().length,
      docs: filtered().map((d) => ({ id: d.__id, data: () => d })),
    })),
  }
}

function makeCollectionRef(name: string) {
  return {
    ...makeQuery(name, undefined, undefined),
    doc: (id: string) => ({
      get: jest.fn().mockImplementation(async () => {
        const d = collectionStore[name]?.find((x) => x.__id === id)
        return {
          exists: !!d,
          id,
          data: () => d,
          ref: {
            delete: jest.fn().mockImplementation(() => {
              deletedDocIds[name] = [...(deletedDocIds[name] ?? []), id]
              collectionStore[name] = (collectionStore[name] ?? []).filter((x) => x.__id !== id)
            }),
          },
        }
      }),
      update: mockUpdateFn,
    }),
    add: jest.fn().mockImplementation(async (data: DocData) => {
      addedDocs[name] = [...(addedDocs[name] ?? []), data]
      return { id: 'new-doc-id' }
    }),
  }
}

const mockDb = { collection: jest.fn((name: string) => makeCollectionRef(name)) }

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('@/lib/admin-auth', () => ({
  verifyAdmin: jest.fn().mockResolvedValue({ uid: 'admin-1', email: 'admin@test.com' }),
  adminUnauthorized: () => new Response(JSON.stringify({ error: 'אין הרשאה' }), { status: 403 }),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

import { verifyAdmin } from '@/lib/admin-auth'
import { DELETE } from '@/app/api/admin/reviews/[id]/route'

const mockVerifyAdmin = verifyAdmin as jest.Mock
const mockParams = { params: Promise.resolve({ id: 'review-1' }) }

function makeRequest() {
  return new NextRequest('http://localhost/api/admin/reviews/review-1', { method: 'DELETE' })
}

describe('DELETE /api/admin/reviews/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    for (const key of Object.keys(collectionStore)) delete collectionStore[key]
    for (const key of Object.keys(addedDocs)) delete addedDocs[key]
    for (const key of Object.keys(deletedDocIds)) delete deletedDocIds[key]
    mockVerifyAdmin.mockResolvedValue({ uid: 'admin-1', email: 'admin@test.com' })
  })

  it('returns 403 when not an admin', async () => {
    mockVerifyAdmin.mockResolvedValue(null)
    const res = await DELETE(makeRequest(), mockParams)
    expect(res.status).toBe(403)
  })

  it('returns 404 when the review does not exist', async () => {
    const res = await DELETE(makeRequest(), mockParams)
    expect(res.status).toBe(404)
  })

  it('deletes the review, recalculates the rating, and writes an audit log entry', async () => {
    collectionStore.reviews = [
      { __id: 'review-1', nailistProfileId: 'nailist-A', rating: 2, clientDisplayName: 'דנה כ.' },
      { __id: 'review-2', nailistProfileId: 'nailist-A', rating: 4 },
    ]

    const res = await DELETE(makeRequest(), mockParams)
    expect(res.status).toBe(200)

    expect(deletedDocIds.reviews).toEqual(['review-1'])
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({ avgRating: 4, reviewCount: 1 })
    )

    expect(addedDocs.auditLogs).toEqual([
      expect.objectContaining({
        actorUid: 'admin-1',
        actorEmail: 'admin@test.com',
        action: 'REVIEW_DELETE',
        targetType: 'review',
        targetId: 'review-1',
        metadata: { nailistProfileId: 'nailist-A', rating: 2, clientDisplayName: 'דנה כ.' },
      }),
    ])
  })
})
