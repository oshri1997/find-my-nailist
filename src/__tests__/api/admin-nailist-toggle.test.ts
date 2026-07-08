/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

type DocData = Record<string, unknown>
const collectionStore: Record<string, (DocData & { __id: string })[]> = {}
const addedDocs: Record<string, DocData[]> = {}
const mockUpdateFn = jest.fn().mockResolvedValue(undefined)

function makeCollectionRef(name: string) {
  return {
    doc: (id: string) => ({
      get: jest.fn().mockImplementation(async () => {
        const d = collectionStore[name]?.find((x) => x.__id === id)
        return { exists: !!d, id, data: () => d }
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
import { PATCH } from '@/app/api/admin/nailists/[id]/route'

const mockVerifyAdmin = verifyAdmin as jest.Mock
const mockParams = { params: Promise.resolve({ id: 'profile-1' }) }

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/nailists/profile-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/admin/nailists/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    for (const key of Object.keys(collectionStore)) delete collectionStore[key]
    for (const key of Object.keys(addedDocs)) delete addedDocs[key]
    mockVerifyAdmin.mockResolvedValue({ uid: 'admin-1', email: 'admin@test.com' })
  })

  it('returns 403 when not an admin', async () => {
    mockVerifyAdmin.mockResolvedValue(null)
    const res = await PATCH(makeRequest({ isActive: false }), mockParams)
    expect(res.status).toBe(403)
  })

  it('returns 400 when isActive is not a boolean', async () => {
    const res = await PATCH(makeRequest({ isActive: 'nope' }), mockParams)
    expect(res.status).toBe(400)
  })

  it('toggles isActive and writes an audit log entry', async () => {
    const res = await PATCH(makeRequest({ isActive: false }), mockParams)
    expect(res.status).toBe(200)

    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false, updatedAt: 'SERVER_TIMESTAMP' })
    )

    expect(addedDocs.auditLogs).toEqual([
      expect.objectContaining({
        actorUid: 'admin-1',
        actorEmail: 'admin@test.com',
        action: 'NAILIST_TOGGLE_ACTIVE',
        targetType: 'nailistProfile',
        targetId: 'profile-1',
        metadata: { isActive: false },
      }),
    ])
  })

  it('returns 400 when neither isActive nor isVerified is provided', async () => {
    const res = await PATCH(makeRequest({}), mockParams)
    expect(res.status).toBe(400)
  })

  it('returns 400 when isVerified is not a boolean', async () => {
    const res = await PATCH(makeRequest({ isVerified: 'yes' }), mockParams)
    expect(res.status).toBe(400)
  })

  it('toggles isVerified independently and writes its own audit log entry', async () => {
    const res = await PATCH(makeRequest({ isVerified: true }), mockParams)
    expect(res.status).toBe(200)

    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({ isVerified: true, updatedAt: 'SERVER_TIMESTAMP' })
    )
    // isActive was not part of this request, so it must not appear in the update
    expect(mockUpdateFn).not.toHaveBeenCalledWith(expect.objectContaining({ isActive: expect.anything() }))

    expect(addedDocs.auditLogs).toEqual([
      expect.objectContaining({
        action: 'NAILIST_TOGGLE_VERIFIED',
        targetType: 'nailistProfile',
        targetId: 'profile-1',
        metadata: { isVerified: true },
      }),
    ])
  })

  it('setting both isActive and isVerified in one call updates both and writes two audit log entries', async () => {
    const res = await PATCH(makeRequest({ isActive: true, isVerified: true }), mockParams)
    expect(res.status).toBe(200)

    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true, isVerified: true })
    )
    expect(addedDocs.auditLogs).toHaveLength(2)
    expect(addedDocs.auditLogs.map((e) => e.action).sort()).toEqual(['NAILIST_TOGGLE_ACTIVE', 'NAILIST_TOGGLE_VERIFIED'])
  })
})
