/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

type DocData = Record<string, unknown>
const collectionStore: Record<string, (DocData & { __id: string })[]> = {}
const addedDocs: Record<string, DocData[]> = {}
const mockUpdateFn = jest.fn().mockResolvedValue(undefined)

function makeQuery(name: string, whereField?: string, whereValue?: unknown) {
  const filtered = () => (collectionStore[name] ?? []).filter(
    (d) => whereField === undefined || d[whereField] === whereValue
  )
  return {
    where: jest.fn().mockImplementation((field: string, _op: string, value: unknown) => makeQuery(name, field, value)),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockImplementation(async () => ({
      empty: filtered().length === 0,
      docs: filtered().map((d) => ({ id: d.__id, data: () => d, ref: { update: mockUpdateFn } })),
    })),
  }
}

function makeCollectionRef(name: string) {
  return {
    ...makeQuery(name, undefined, undefined),
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
import { PATCH } from '@/app/api/admin/users/[id]/route'

const mockVerifyAdmin = verifyAdmin as jest.Mock
const mockParams = { params: Promise.resolve({ id: 'target-uid' }) }

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/users/target-uid', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/admin/users/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    for (const key of Object.keys(collectionStore)) delete collectionStore[key]
    for (const key of Object.keys(addedDocs)) delete addedDocs[key]
    mockVerifyAdmin.mockResolvedValue({ uid: 'admin-1', email: 'admin@test.com' })
  })

  it('returns 403 when not an admin', async () => {
    mockVerifyAdmin.mockResolvedValue(null)
    const res = await PATCH(makeRequest({ role: 'NAILIST' }), mockParams)
    expect(res.status).toBe(403)
  })

  it('returns 400 for an invalid role', async () => {
    collectionStore.users = [{ __id: 'target-uid', email: 'u@test.com', role: 'CLIENT' }]
    const res = await PATCH(makeRequest({ role: 'SUPERUSER' }), mockParams)
    expect(res.status).toBe(400)
  })

  it('returns 404 when the user does not exist', async () => {
    const res = await PATCH(makeRequest({ role: 'NAILIST' }), mockParams)
    expect(res.status).toBe(404)
  })

  it('changes the role and writes an audit log entry with old/new role', async () => {
    collectionStore.users = [{ __id: 'target-uid', email: 'u@test.com', role: 'CLIENT' }]

    const res = await PATCH(makeRequest({ role: 'NAILIST' }), mockParams)
    expect(res.status).toBe(200)

    expect(mockUpdateFn).toHaveBeenCalledWith({ role: 'NAILIST' })

    expect(addedDocs.auditLogs).toEqual([
      expect.objectContaining({
        actorUid: 'admin-1',
        actorEmail: 'admin@test.com',
        action: 'USER_ROLE_CHANGE',
        targetType: 'user',
        targetId: 'target-uid',
        metadata: { targetEmail: 'u@test.com', oldRole: 'CLIENT', newRole: 'NAILIST' },
      }),
    ])
  })

  it('deactivates the nailist profile when demoting NAILIST → CLIENT', async () => {
    collectionStore.users = [{ __id: 'target-uid', email: 'n@test.com', role: 'NAILIST' }]
    collectionStore.nailistProfiles = [{ __id: 'profile-1', userId: 'target-uid', isActive: true }]

    const res = await PATCH(makeRequest({ role: 'CLIENT' }), mockParams)
    expect(res.status).toBe(200)

    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false, updatedAt: 'SERVER_TIMESTAMP' })
    )
  })

  it('promotes a NAILIST to ADMIN, sets isAdmin, and deactivates the nailist profile', async () => {
    collectionStore.users = [{ __id: 'target-uid', email: 'n@test.com', role: 'NAILIST' }]
    collectionStore.nailistProfiles = [{ __id: 'profile-1', userId: 'target-uid', isActive: true }]

    const res = await PATCH(makeRequest({ role: 'ADMIN' }), mockParams)
    expect(res.status).toBe(200)

    expect(mockUpdateFn).toHaveBeenCalledWith({ role: 'ADMIN', isAdmin: true })
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false, updatedAt: 'SERVER_TIMESTAMP' })
    )

    expect(addedDocs.auditLogs).toEqual([
      expect.objectContaining({
        action: 'USER_ROLE_CHANGE',
        metadata: { targetEmail: 'n@test.com', oldRole: 'NAILIST', newRole: 'ADMIN' },
      }),
    ])
  })

  it('promotes a CLIENT to ADMIN without touching any nailist profile', async () => {
    collectionStore.users = [{ __id: 'target-uid', email: 'c@test.com', role: 'CLIENT' }]

    const res = await PATCH(makeRequest({ role: 'ADMIN' }), mockParams)
    expect(res.status).toBe(200)
    expect(mockUpdateFn).toHaveBeenCalledWith({ role: 'ADMIN', isAdmin: true })
  })

  it('blocks demoting a pure-ADMIN account away from ADMIN', async () => {
    collectionStore.users = [{ __id: 'target-uid', email: 'a@test.com', role: 'ADMIN' }]

    const res = await PATCH(makeRequest({ role: 'CLIENT' }), mockParams)
    expect(res.status).toBe(403)
    expect(mockUpdateFn).not.toHaveBeenCalled()
  })
})
