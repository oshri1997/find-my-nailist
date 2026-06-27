/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// ── Firebase Admin mocks ─────────────────────────────────────────────────────

type DocData = Record<string, unknown>
const docStore: Record<string, DocData> = {}
const collectionStore: Record<string, (DocData & { __id: string })[]> = {}

const mockServiceAdd = jest.fn().mockResolvedValue({ id: 'new-service-id' })
const mockUpdateFn = jest.fn().mockResolvedValue(undefined)

function makeDocRef(collection: string, id: string) {
  return {
    get: jest.fn().mockImplementation(() =>
      Promise.resolve({
        exists: !!docStore[`${collection}/${id}`],
        data: () => docStore[`${collection}/${id}`] ?? undefined,
        id,
      })
    ),
    update: mockUpdateFn,
  }
}

function makeCollectionRef(name: string) {
  return {
    doc: (id?: string) => (id === undefined ? { id: 'new-doc', set: jest.fn(), get: jest.fn() } : makeDocRef(name, id)),
    add: name === 'services' ? mockServiceAdd : jest.fn().mockResolvedValue({ id: 'x' }),
    where: jest.fn().mockImplementation((field: string, _op: string, value: unknown) => {
      const filtered = (collectionStore[name] ?? []).filter((d) => d[field] === value)
      return {
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: filtered.length === 0,
          docs: filtered.map((d) => ({ id: d.__id, data: () => d, ref: makeDocRef(name, d.__id) })),
        }),
      }
    }),
  }
}

const mockDb = { collection: jest.fn((name: string) => makeCollectionRef(name)) }

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'nailist-user-1' }),
  })),
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

import { POST } from '@/app/api/services/route'

function makeRequest(body: unknown, cookie?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/services', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  if (cookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (name: string) => (name === 'auth-token' ? { value: cookie } : undefined) }),
    })
  }
  return req
}

const validBody = {
  nailistProfileId: 'nailist-profile-1',
  name: 'ג\'ל צרפתי',
  durationMinutes: 60,
  price: 150,
  currency: 'ILS',
}

describe('POST /api/services', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    collectionStore['nailistProfiles'] = [
      { __id: 'nailist-profile-1', userId: 'nailist-user-1', businessName: 'סטודיו' },
    ]
  })

  it('returns 401 when no auth token', async () => {
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller does not own the nailist profile', async () => {
    collectionStore['nailistProfiles'] = [
      { __id: 'other-profile', userId: 'nailist-user-1' },
    ]
    const res = await POST(makeRequest(validBody, 'valid-token'))
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid body', async () => {
    const res = await POST(makeRequest({ nailistProfileId: 'x' }, 'valid-token'))
    expect(res.status).toBe(400)
  })

  it('returns 201 and creates service when caller owns the profile', async () => {
    const res = await POST(makeRequest(validBody, 'valid-token'))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.id).toBe('new-service-id')
    expect(mockServiceAdd).toHaveBeenCalledWith(
      expect.objectContaining({ nailistProfileId: 'nailist-profile-1', name: "ג'ל צרפתי", isActive: true })
    )
  })
})
