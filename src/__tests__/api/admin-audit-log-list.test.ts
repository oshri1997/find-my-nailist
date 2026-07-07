/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

type DocData = Record<string, unknown>
const collectionStore: Record<string, (DocData & { __id: string })[]> = {}

function makeCollectionRef(name: string) {
  return {
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      docs: (collectionStore[name] ?? []).map((d) => ({ id: d.__id, data: () => d })),
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

import { verifyAdmin } from '@/lib/admin-auth'
import { GET } from '@/app/api/admin/audit-log/route'

const mockVerifyAdmin = verifyAdmin as jest.Mock

function makeRequest() {
  return new NextRequest('http://localhost/api/admin/audit-log')
}

describe('GET /api/admin/audit-log', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    for (const key of Object.keys(collectionStore)) delete collectionStore[key]
    mockVerifyAdmin.mockResolvedValue({ uid: 'admin-1', email: 'admin@test.com' })
  })

  it('returns 403 when not an admin', async () => {
    mockVerifyAdmin.mockResolvedValue(null)
    const res = await GET(makeRequest())
    expect(res.status).toBe(403)
  })

  it('returns the audit log entries for an admin', async () => {
    collectionStore.auditLogs = [
      {
        __id: 'log-1', actorUid: 'admin-1', actorEmail: 'admin@test.com',
        action: 'USER_DELETE', targetType: 'user', targetId: 'u1',
        metadata: { email: 'gone@test.com' },
        createdAt: { toDate: () => new Date('2026-01-01T00:00:00.000Z') },
      },
    ]

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toEqual([
      expect.objectContaining({
        id: 'log-1',
        actorEmail: 'admin@test.com',
        action: 'USER_DELETE',
        targetType: 'user',
        targetId: 'u1',
        metadata: { email: 'gone@test.com' },
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    ])
  })
})
