/** @jest-environment node */
import { NextRequest } from 'next/server'

type StoredDoc = Record<string, unknown>
const announcements: Record<string, StoredDoc> = {}
const auditEntries: StoredDoc[] = []
let autoId = 1

function documentRef(collection: string, id: string) {
  return { collection, id }
}

function makeDocRef(collection: string, id: string) {
  return {
    id,
    collection,
    set: jest.fn(async (data: StoredDoc) => {
      if (collection === 'announcements') announcements[id] = { ...announcements[id], ...data }
    }),
    get: jest.fn(async () => ({
      exists: collection === 'announcements' && Boolean(announcements[id]),
      data: () => announcements[id],
      id,
    })),
  }
}

const mockDb = {
  collection: jest.fn((collection: string) => ({
    doc: jest.fn((id?: string) => makeDocRef(collection, id ?? `auto-${autoId++}`)),
    add: jest.fn(async (data: StoredDoc) => {
      const id = `auto-${autoId++}`
      if (collection === 'auditLogs') auditEntries.push({ ...data, id })
      return { id }
    }),
  })),
  runTransaction: jest.fn(async (callback: (tx: {
    get: (ref: ReturnType<typeof documentRef>) => Promise<{ exists: boolean; data: () => StoredDoc | undefined }>
    update: (ref: ReturnType<typeof documentRef>, updates: StoredDoc) => void
    set: (ref: ReturnType<typeof documentRef>, data: StoredDoc) => void
  }) => Promise<unknown>) => {
    const writes: Array<{ id: string; updates: StoredDoc }> = []
    const auditWrites: StoredDoc[] = []
    const result = await callback({
      get: async (ref) => ({ exists: ref.collection === 'announcements' && Boolean(announcements[ref.id]), data: () => announcements[ref.id] }),
      update: (ref, updates) => writes.push({ id: ref.id, updates }),
      set: (ref, data) => {
        if (ref.collection === 'auditLogs') auditWrites.push({ ...data, id: ref.id })
      },
    })
    writes.forEach(({ id, updates }) => { announcements[id] = { ...announcements[id], ...updates } })
    auditEntries.push(...auditWrites)
    return result
  }),
}

jest.mock('@/lib/firebase/admin', () => ({ adminDb: jest.fn(() => mockDb) }))
jest.mock('@/lib/admin-auth', () => ({
  verifyAdmin: jest.fn().mockResolvedValue({ uid: 'admin-1', email: 'admin@test.com' }),
  adminUnauthorized: () => new Response(JSON.stringify({ error: 'אין הרשאה' }), { status: 403 }),
}))
jest.mock('firebase-admin/firestore', () => ({ FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') } }))

import { verifyAdmin } from '@/lib/admin-auth'
import { POST } from '@/app/api/admin/announcements/route'
import { PATCH } from '@/app/api/admin/announcements/[id]/route'

const mockVerifyAdmin = verifyAdmin as jest.Mock

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/announcements', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  })
}

function patchRequest(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/admin/announcements/${id}`, {
    method: 'PATCH', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  for (const key of Object.keys(announcements)) delete announcements[key]
  auditEntries.length = 0
  autoId = 1
  jest.clearAllMocks()
  mockVerifyAdmin.mockResolvedValue({ uid: 'admin-1', email: 'admin@test.com' })
})

describe('POST /api/admin/announcements', () => {
  it('requires an administrator', async () => {
    mockVerifyAdmin.mockResolvedValue(null)
    const res = await POST(postRequest({ title: 'x', body: 'y', audience: 'ALL', priority: 'MAJOR' }))
    expect(res.status).toBe(403)
  })

  it('publishes immediately — no draft state — and writes an audit entry', async () => {
    const res = await POST(postRequest({
      title: 'שעות עבודה מפוצלות', body: 'אפשר להגדיר כמה חלונות זמינות ביום', audience: 'NAILIST', priority: 'MAJOR',
    }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data).toEqual(expect.objectContaining({
      title: 'שעות עבודה מפוצלות', audience: 'NAILIST', priority: 'MAJOR', status: 'PUBLISHED', createdBy: 'admin-1',
    }))
    expect(auditEntries).toEqual([expect.objectContaining({
      action: 'ANNOUNCEMENT_PUBLISH', targetType: 'announcement', actorUid: 'admin-1',
    })])
  })

  it('rejects an empty title or body', async () => {
    expect((await POST(postRequest({ title: '', body: 'y', audience: 'ALL', priority: 'MAJOR' }))).status).toBe(400)
    expect((await POST(postRequest({ title: 'x', body: '', audience: 'ALL', priority: 'MAJOR' }))).status).toBe(400)
  })

  it('rejects an unrecognized audience or priority', async () => {
    expect((await POST(postRequest({ title: 'x', body: 'y', audience: 'EVERYONE', priority: 'MAJOR' }))).status).toBe(400)
    expect((await POST(postRequest({ title: 'x', body: 'y', audience: 'ALL', priority: 'URGENT' }))).status).toBe(400)
  })

  it('rejects unknown fields, including an attempt to set status directly', async () => {
    const res = await POST(postRequest({ title: 'x', body: 'y', audience: 'ALL', priority: 'MAJOR', status: 'PUBLISHED' }))
    expect(res.status).toBe(400)
  })

  it('accepts a well-formed rich-text body from the editor and stores it as-is', async () => {
    const richBody = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'כותרת פנימית' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'מודגש', marks: [{ type: 'bold' }] }] },
      ],
    }
    const res = await POST(postRequest({ title: 'x', body: richBody, audience: 'ALL', priority: 'MAJOR' }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data.body).toEqual(richBody)
  })

  it('rejects a rich body with a node type outside the whitelist', async () => {
    const res = await POST(postRequest({
      title: 'x', body: { type: 'doc', content: [{ type: 'image', attrs: { src: 'x' } }] }, audience: 'ALL', priority: 'MAJOR',
    }))
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/admin/announcements/[id] (retract)', () => {
  function seed(id = 'ann-1', overrides: StoredDoc = {}) {
    announcements[id] = { title: 'כותרת', body: 'תוכן', audience: 'ALL', priority: 'MAJOR', status: 'PUBLISHED', ...overrides }
  }

  it('requires an administrator', async () => {
    mockVerifyAdmin.mockResolvedValue(null)
    const res = await PATCH(patchRequest('ann-1', { status: 'RETRACTED' }), { params: Promise.resolve({ id: 'ann-1' }) })
    expect(res.status).toBe(403)
  })

  it('retracts a PUBLISHED announcement and audits it', async () => {
    seed()
    const res = await PATCH(patchRequest('ann-1', { status: 'RETRACTED' }), { params: Promise.resolve({ id: 'ann-1' }) })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.status).toBe('RETRACTED')
    expect(announcements['ann-1'].status).toBe('RETRACTED')
    expect(auditEntries).toEqual([expect.objectContaining({ action: 'ANNOUNCEMENT_RETRACT', targetId: 'ann-1' })])
  })

  it('rejects retracting an already-retracted announcement', async () => {
    seed('ann-1', { status: 'RETRACTED' })
    const res = await PATCH(patchRequest('ann-1', { status: 'RETRACTED' }), { params: Promise.resolve({ id: 'ann-1' }) })
    expect(res.status).toBe(409)
  })

  it('returns 404 for a missing announcement', async () => {
    const res = await PATCH(patchRequest('missing', { status: 'RETRACTED' }), { params: Promise.resolve({ id: 'missing' }) })
    expect(res.status).toBe(404)
  })

  it('rejects any body other than {status: "RETRACTED"} — title/body are immutable once published', async () => {
    seed()
    const res = await PATCH(patchRequest('ann-1', { title: 'שינוי אסור' }), { params: Promise.resolve({ id: 'ann-1' }) })
    expect(res.status).toBe(400)
    expect(announcements['ann-1'].title).toBe('כותרת')
  })
})
