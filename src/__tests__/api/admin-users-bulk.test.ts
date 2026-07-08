/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

type DocData = Record<string, unknown>
const collectionStore: Record<string, (DocData & { __id: string })[]> = {}
const addedDocs: Record<string, DocData[]> = {}
const mockUpdateFn = jest.fn().mockResolvedValue(undefined)
const mockUpdateUser = jest.fn().mockResolvedValue(undefined)
const mockDeleteUser = jest.fn().mockResolvedValue(undefined)

function makeQuery(name: string, whereField?: string, whereValue?: unknown) {
  const filtered = () => (collectionStore[name] ?? []).filter(
    (d) => whereField === undefined || d[whereField] === whereValue
  )
  return {
    where: jest.fn().mockImplementation((field: string, _op: string, value: unknown) => makeQuery(name, field, value)),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockImplementation(async () => ({
      empty: filtered().length === 0,
      size: filtered().length,
      docs: filtered().map((d) => ({ id: d.__id, data: () => d, ref: { delete: jest.fn(), update: mockUpdateFn } })),
    })),
  }
}

function makeCollectionRef(name: string) {
  return {
    ...makeQuery(name, undefined, undefined),
    doc: (id: string) => ({
      get: jest.fn().mockImplementation(async () => {
        const d = collectionStore[name]?.find((x) => x.__id === id)
        return { exists: !!d, id, data: () => d, ref: { delete: jest.fn(), update: mockUpdateFn } }
      }),
      update: mockUpdateFn,
      delete: jest.fn(),
    }),
    add: jest.fn().mockImplementation(async (data: DocData) => {
      addedDocs[name] = [...(addedDocs[name] ?? []), data]
      return { id: 'new-doc-id' }
    }),
  }
}

const mockDb = {
  collection: jest.fn((name: string) => makeCollectionRef(name)),
  batch: jest.fn(() => ({ delete: jest.fn(), update: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) })),
}

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: jest.fn(() => mockDb),
  adminAuth: jest.fn(() => ({ updateUser: mockUpdateUser, deleteUser: mockDeleteUser })),
  adminStorage: jest.fn(() => ({ bucket: () => ({ file: () => ({ delete: jest.fn().mockResolvedValue(undefined) }) }) })),
}))

jest.mock('@/lib/admin-auth', () => ({
  verifyAdmin: jest.fn().mockResolvedValue({ uid: 'admin-1', email: 'admin@test.com' }),
  adminUnauthorized: () => new Response(JSON.stringify({ error: 'אין הרשאה' }), { status: 403 }),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

import { verifyAdmin } from '@/lib/admin-auth'
import { POST } from '@/app/api/admin/users/bulk/route'

const mockVerifyAdmin = verifyAdmin as jest.Mock

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/users/bulk', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/users/bulk', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    for (const key of Object.keys(collectionStore)) delete collectionStore[key]
    for (const key of Object.keys(addedDocs)) delete addedDocs[key]
    mockVerifyAdmin.mockResolvedValue({ uid: 'admin-1', email: 'admin@test.com' })
    collectionStore.users = [
      { __id: 'u1', email: 'u1@test.com', role: 'CLIENT' },
      { __id: 'u2', email: 'u2@test.com', role: 'CLIENT' },
      { __id: 'admin-2', email: 'admin2@test.com', role: 'NAILIST', isAdmin: true },
    ]
  })

  it('returns 403 when not an admin', async () => {
    mockVerifyAdmin.mockResolvedValue(null)
    const res = await POST(makeRequest({ action: 'suspend', userIds: ['u1'] }))
    expect(res.status).toBe(403)
  })

  it('returns 400 for an invalid action', async () => {
    const res = await POST(makeRequest({ action: 'ban', userIds: ['u1'] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for an empty userIds array', async () => {
    const res = await POST(makeRequest({ action: 'suspend', userIds: [] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when more than 100 ids are provided', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => `u${i}`)
    const res = await POST(makeRequest({ action: 'suspend', userIds: ids }))
    expect(res.status).toBe(400)
  })

  it('suspends multiple users via Firestore flag and Firebase Auth disable', async () => {
    const res = await POST(makeRequest({ action: 'suspend', userIds: ['u1', 'u2'] }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.succeeded.sort()).toEqual(['u1', 'u2'])
    expect(json.data.failed).toEqual([])
    expect(mockUpdateFn).toHaveBeenCalledWith(expect.objectContaining({ suspended: true }))
    expect(mockUpdateUser).toHaveBeenCalledWith('u1', { disabled: true })
    expect(mockUpdateUser).toHaveBeenCalledWith('u2', { disabled: true })
  })

  it('reports a failure (not a thrown error) when a selected user is an admin', async () => {
    const res = await POST(makeRequest({ action: 'suspend', userIds: ['u1', 'admin-2'] }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.succeeded).toEqual(['u1'])
    expect(json.data.failed).toEqual([{ id: 'admin-2', error: 'לא ניתן להשעות חשבון אדמין' }])
  })

  it('refuses to let an admin suspend their own account (checked independently of the isAdmin guard)', async () => {
    collectionStore.users.push({ __id: 'admin-1', email: 'admin@test.com', role: 'NAILIST' })
    const res = await POST(makeRequest({ action: 'suspend', userIds: ['admin-1'] }))
    const json = await res.json()
    expect(json.data.failed).toEqual([{ id: 'admin-1', error: 'לא ניתן להשעות את החשבון שלך' }])
  })

  it('unsuspends multiple users', async () => {
    const res = await POST(makeRequest({ action: 'unsuspend', userIds: ['u1', 'u2'] }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.succeeded.sort()).toEqual(['u1', 'u2'])
    expect(mockUpdateFn).toHaveBeenCalledWith(expect.objectContaining({ suspended: false }))
    expect(mockUpdateUser).toHaveBeenCalledWith('u1', { disabled: false })
  })

  it('bulk deletes multiple users via the shared cascade helper', async () => {
    const res = await POST(makeRequest({ action: 'delete', userIds: ['u1', 'u2'] }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.succeeded.sort()).toEqual(['u1', 'u2'])
    expect(mockDeleteUser).toHaveBeenCalledWith('u1')
    expect(mockDeleteUser).toHaveBeenCalledWith('u2')
  })

  it('reports failure for a nonexistent user id without failing the whole batch', async () => {
    const res = await POST(makeRequest({ action: 'suspend', userIds: ['u1', 'does-not-exist'] }))
    const json = await res.json()
    expect(json.data.succeeded).toEqual(['u1'])
    expect(json.data.failed).toEqual([{ id: 'does-not-exist', error: 'משתמש לא נמצא' }])
  })
})
