/** @jest-environment node */
import { NextRequest } from 'next/server'

type StoredDoc = Record<string, unknown>
const feedback: Record<string, StoredDoc> = {}
const auditEntries: StoredDoc[] = []
let auditId = 1
let failAuditWrite = false

function documentRef(collection: string, id: string) {
  return { collection, id }
}

const mockDb = {
  collection: jest.fn((collection: string) => ({
    doc: jest.fn((id?: string) => documentRef(collection, id ?? `audit-${auditId++}`)),
  })),
  runTransaction: jest.fn(async (callback: (tx: {
    get: (ref: ReturnType<typeof documentRef>) => Promise<{ exists: boolean; data: () => StoredDoc | undefined }>
    update: (ref: ReturnType<typeof documentRef>, updates: StoredDoc) => void
    set: (ref: ReturnType<typeof documentRef>, data: StoredDoc) => void
  }) => Promise<unknown>) => {
    const writes: Array<{ id: string; updates: StoredDoc }> = []
    const auditWrites: StoredDoc[] = []
    const result = await callback({
      get: async (ref) => ({ exists: ref.collection === 'feedback' && Boolean(feedback[ref.id]), data: () => feedback[ref.id] }),
      update: (ref, updates) => writes.push({ id: ref.id, updates }),
      set: (ref, data) => {
        if (ref.collection === 'auditLogs' && failAuditWrite) throw new Error('audit write failed')
        if (ref.collection === 'auditLogs') auditWrites.push({ ...data, id: ref.id })
      },
    })
    writes.forEach(({ id, updates }) => { feedback[id] = { ...feedback[id], ...updates } })
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
import { PATCH } from '@/app/api/admin/feedback/[id]/route'

const mockVerifyAdmin = verifyAdmin as jest.Mock
const timestamp = (iso: string) => ({ toDate: () => new Date(iso) })

function seed(id = 'report-1', overrides: StoredDoc = {}) {
  feedback[id] = {
    reporterUid: 'user-1', reporterEmail: 'user@example.com', reporterDisplayName: 'משתמשת',
    type: 'BUG', subject: 'תקלה', description: 'פרטים', pageUrl: '/search',
    status: 'NEW', priority: 'NORMAL', createdAt: timestamp('2026-08-01T00:00:00.000Z'),
    updatedAt: timestamp('2026-08-01T00:00:00.000Z'),
    ...overrides,
  }
}

function request(body: unknown) {
  return new NextRequest('http://localhost/api/admin/feedback/report-1', {
    method: 'PATCH', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  })
}
const context = { params: Promise.resolve({ id: 'report-1' }) }

describe('PATCH /api/admin/feedback/[id]', () => {
  beforeEach(() => {
    for (const key of Object.keys(feedback)) delete feedback[key]
    auditEntries.length = 0
    auditId = 1
    failAuditWrite = false
    jest.clearAllMocks()
    mockVerifyAdmin.mockResolvedValue({ uid: 'admin-1', email: 'admin@test.com' })
  })

  it('requires an administrator', async () => {
    mockVerifyAdmin.mockResolvedValue(null)
    expect((await PATCH(request({ status: 'IN_REVIEW' }), context)).status).toBe(403)
  })

  it('updates only manager fields transactionally and writes a redacted audit entry', async () => {
    seed()
    const response = await PATCH(request({ status: 'IN_REVIEW', priority: 'HIGH', internalNote: 'לבדוק בדחיפות' }), context)

    expect(response.status).toBe(200)
    expect(feedback['report-1']).toEqual(expect.objectContaining({
      status: 'IN_REVIEW', priority: 'HIGH', internalNote: 'לבדוק בדחיפות', reporterUid: 'user-1', subject: 'תקלה',
    }))
    expect(auditEntries).toEqual([expect.objectContaining({
      action: 'FEEDBACK_UPDATE', targetType: 'feedback', targetId: 'report-1',
      metadata: expect.objectContaining({
        status: { from: 'NEW', to: 'IN_REVIEW' }, priority: { from: 'NORMAL', to: 'HIGH' }, internalNoteChanged: true,
      }),
    })])
    expect(auditEntries[0].metadata).not.toHaveProperty('internalNote')
  })

  it('rejects immutable report fields and malformed manager updates', async () => {
    seed()
    expect((await PATCH(request({ subject: 'שינוי אסור' }), context)).status).toBe(400)
    expect((await PATCH(request({}), context)).status).toBe(400)
    expect((await PATCH(request({ internalNote: 'a'.repeat(2001) }), context)).status).toBe(400)
    expect(feedback['report-1'].subject).toBe('תקלה')
  })

  it('enforces the status lifecycle using the fresh transaction snapshot', async () => {
    seed('report-1', { status: 'NEW' })
    const response = await PATCH(request({ status: 'RESOLVED' }), context)
    expect(response.status).toBe(409)
    expect(feedback['report-1'].status).toBe('NEW')
    expect(auditEntries).toHaveLength(0)
  })

  it('is a no-op for unchanged values and does not audit it', async () => {
    seed('report-1', { status: 'IN_REVIEW', priority: 'HIGH', internalNote: 'כבר קיים' })
    const response = await PATCH(request({ status: 'IN_REVIEW', priority: 'HIGH', internalNote: 'כבר קיים' }), context)
    expect(response.status).toBe(200)
    expect((await response.json()).changed).toBe(false)
    expect(auditEntries).toHaveLength(0)
  })

  it('commits neither the report change nor an incomplete audit record when the audit write fails', async () => {
    seed()
    failAuditWrite = true

    const response = await PATCH(request({ status: 'IN_REVIEW' }), context)

    expect(response.status).toBe(500)
    expect(feedback['report-1'].status).toBe('NEW')
    expect(auditEntries).toHaveLength(0)
  })

  it('returns 404 for a missing report', async () => {
    const missingContext = { params: Promise.resolve({ id: 'missing' }) }
    expect((await PATCH(request({ status: 'IN_REVIEW' }), missingContext)).status).toBe(404)
  })
})
