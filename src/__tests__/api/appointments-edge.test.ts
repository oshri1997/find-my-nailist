/**
 * @jest-environment node
 *
 * Edge cases for appointment creation and retrieval
 */
import { NextRequest } from 'next/server'

const mockBatch = {
  update: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
}
const mockAppointmentAdd = jest.fn().mockResolvedValue(undefined)

const docStore: Record<string, Record<string, unknown>> = {}
const collectionStore: Record<string, unknown[]> = {}

function makeDocRef(collection: string, id: string) {
  return {
    get: jest.fn().mockResolvedValue({
      exists: !!docStore[`${collection}/${id}`],
      data: () => docStore[`${collection}/${id}`] ?? undefined,
      id,
    }),
    update: jest.fn().mockResolvedValue(undefined),
  }
}

function makeCollectionRef(name: string) {
  let _whereField: string
  let _whereValue: unknown
  return {
    doc: (id?: string) => {
      if (id === undefined) {
        return {
          id: 'new-appointment-id',
          set: mockAppointmentAdd,
          update: jest.fn().mockResolvedValue(undefined),
          get: jest.fn().mockResolvedValue({ exists: false, data: () => undefined }),
        }
      }
      return makeDocRef(name, id)
    },
    where: jest.fn().mockImplementation((field: string, _op: string, value: unknown) => {
      _whereField = field
      _whereValue = value
      return {
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: !(collectionStore[name] ?? []).some((d: unknown) => (d as Record<string, unknown>)[_whereField] === _whereValue),
          docs: (collectionStore[name] ?? [])
            .filter((d: unknown) => (d as Record<string, unknown>)[_whereField] === _whereValue)
            .map((d: unknown) => ({
              id: (d as Record<string, unknown>).__id,
              data: () => d,
              ref: { update: jest.fn().mockResolvedValue(undefined) },
            })),
        }),
        orderBy: jest.fn().mockReturnThis(),
      }
    }),
    add: jest.fn().mockResolvedValue({ id: `${name}-new` }),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ docs: [], empty: true }),
  }
}

const mockDb = {
  collection: jest.fn((name: string) => makeCollectionRef(name)),
  batch: jest.fn(() => mockBatch),
  runTransaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      get: (q: { get: () => Promise<unknown> }) => q.get(),
      set: jest.fn().mockImplementation((_ref: { set: (d: unknown) => unknown }, data: unknown) => {
        if (typeof _ref.set === 'function') _ref.set(data)
      }),
    }
    return fn(tx)
  }),
}

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user-123', email: 'client@test.com' }),
  })),
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
  Timestamp: {
    fromDate: jest.fn((d: Date) => ({ toDate: () => d, seconds: d.getTime() / 1000, nanoseconds: 0 })),
  },
}))

jest.mock('@/lib/email', () => ({
  sendAppointmentRequest: jest.fn().mockResolvedValue(undefined),
  sendReviewRequestEmail: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('crypto', () => ({ randomUUID: jest.fn(() => 'uuid-test') }))

import { POST, GET } from '@/app/api/appointments/route'

function makeRequest(method: string, body?: unknown, cookie?: string, searchParams?: string): NextRequest {
  const url = `http://localhost/api/appointments${searchParams ? `?${searchParams}` : ''}`
  const req = new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
  })
  if (cookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (n: string) => n === 'auth-token' ? { value: cookie } : undefined }),
    })
  }
  return req
}

const validBody = {
  nailistProfileId: 'nailist-profile-1',
  clientProfileId: 'client-profile-1',
  serviceId: 'service-1',
  startTime: new Date('2026-08-01T10:00:00.000Z').toISOString(),
}

describe('POST /api/appointments — edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    docStore['services/service-1'] = { name: 'ג׳ל', durationMinutes: 60, price: 130, currency: 'ILS' }
    docStore['nailistProfiles/nailist-profile-1'] = { businessName: 'Studio', userId: 'nailist-user' }
    docStore['clientProfiles/client-profile-1'] = { displayName: 'Client', userId: 'user-123' }
    collectionStore['clientProfiles'] = [{ __id: 'client-profile-1', userId: 'user-123' }]
    collectionStore['appointments'] = []
  })

  it('allows adjacent appointments (non-overlapping) to be booked', async () => {
    // Existing appointment ends at 11:00; new one starts at 11:00 — no conflict
    collectionStore['appointments'] = [{
      __id: 'existing',
      nailistProfileId: 'nailist-profile-1',
      status: 'CONFIRMED',
      startTime: { toDate: () => new Date('2026-08-01T09:00:00Z') },
      endTime: { toDate: () => new Date('2026-08-01T10:00:00Z') },
    }]
    const req = makeRequest('POST', validBody, 'token')
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('conflicts with PENDING appointment at the same time', async () => {
    collectionStore['appointments'] = [{
      __id: 'existing',
      nailistProfileId: 'nailist-profile-1',
      status: 'PENDING',
      startTime: { toDate: () => new Date('2026-08-01T10:00:00Z') },
      endTime: { toDate: () => new Date('2026-08-01T11:00:00Z') },
    }]
    const req = makeRequest('POST', validBody, 'token')
    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it('stores optional notes when provided', async () => {
    const req = makeRequest('POST', { ...validBody, notes: 'פרנץ׳ מניקור' }, 'token')
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(mockAppointmentAdd).toHaveBeenCalledWith(
      expect.objectContaining({ notes: 'פרנץ׳ מניקור' })
    )
  })

  it('returns 400 when startTime is not an ISO datetime', async () => {
    const req = makeRequest('POST', { ...validBody, startTime: '2026-08-01' }, 'token')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('calculates endTime correctly based on service duration', async () => {
    const req = makeRequest('POST', validBody, 'token')
    await POST(req)
    const callArg = mockAppointmentAdd.mock.calls[0]?.[0]
    // startTime = 10:00 UTC, duration = 60 min → endTime = 11:00 UTC
    const expectedEnd = new Date('2026-08-01T11:00:00.000Z')
    expect(callArg.endTime.toDate()).toEqual(expectedEnd)
  })

  it('does not conflict with appointment for a different nailist', async () => {
    // Conflict query only filters by nailistProfileId — this appointment belongs to a different nailist
    collectionStore['appointments'] = [{
      __id: 'other',
      nailistProfileId: 'other-nailist',
      status: 'CONFIRMED',
      startTime: { toDate: () => new Date('2026-08-01T10:00:00Z') },
      endTime: { toDate: () => new Date('2026-08-01T11:00:00Z') },
    }]
    const req = makeRequest('POST', validBody, 'token')
    const res = await POST(req)
    // No conflict because the existing appointment is for a different nailist
    expect(res.status).toBe(201)
  })

  it('falls back to empty string for nailistBusinessName when nailist profile has none', async () => {
    docStore['nailistProfiles/nailist-profile-1'] = { userId: 'nailist-user' } // no businessName
    const req = makeRequest('POST', validBody, 'token')
    await POST(req)
    expect(mockAppointmentAdd).toHaveBeenCalledWith(
      expect.objectContaining({ nailistBusinessName: '' })
    )
  })

  it('falls back to empty string for clientDisplayName when client has no name fields', async () => {
    docStore['clientProfiles/client-profile-1'] = { userId: 'user-123' } // no name fields
    const req = makeRequest('POST', validBody, 'token')
    await POST(req)
    expect(mockAppointmentAdd).toHaveBeenCalledWith(
      expect.objectContaining({ clientDisplayName: '' })
    )
  })
})

describe('GET /api/appointments — edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    collectionStore['nailistProfiles'] = [{ __id: 'nailist-profile-1', userId: 'user-123' }]
    collectionStore['clientProfiles'] = [{ __id: 'client-profile-1', userId: 'user-123' }]
    collectionStore['appointments'] = []
  })

  it('auto-cancels PENDING appointments older than 3 days', async () => {
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    collectionStore['appointments'] = [{
      __id: 'stale-apt',
      nailistProfileId: 'nailist-profile-1',
      status: 'PENDING',
      createdAt: { toDate: () => fourDaysAgo },
      startTime: { toDate: () => new Date(Date.now() + 60 * 60 * 1000) },
      endTime: { toDate: () => new Date(Date.now() + 2 * 60 * 60 * 1000) },
    }]
    const req = makeRequest('GET', undefined, 'valid-token', 'role=nailist')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data[0].status).toBe('CANCELLED')
    expect(mockBatch.update).toHaveBeenCalled()
  })

  it('does NOT auto-cancel PENDING appointments within 3 days', async () => {
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    collectionStore['appointments'] = [{
      __id: 'recent-apt',
      nailistProfileId: 'nailist-profile-1',
      status: 'PENDING',
      createdAt: { toDate: () => oneDayAgo },
      startTime: { toDate: () => new Date(Date.now() + 60 * 60 * 1000) },
      endTime: { toDate: () => new Date(Date.now() + 2 * 60 * 60 * 1000) },
    }]
    const req = makeRequest('GET', undefined, 'valid-token', 'role=nailist')
    const res = await GET(req)
    const json = await res.json()
    expect(json.data[0].status).toBe('PENDING')
  })

  it('does not auto-complete PENDING past endTime (only CONFIRMED)', async () => {
    const pastEnd = new Date(Date.now() - 60 * 60 * 1000)
    const pastStart = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const createdAt = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago (not stale)
    collectionStore['appointments'] = [{
      __id: 'pending-past',
      nailistProfileId: 'nailist-profile-1',
      status: 'PENDING',
      createdAt: { toDate: () => createdAt },
      startTime: { toDate: () => pastStart },
      endTime: { toDate: () => pastEnd },
    }]
    const req = makeRequest('GET', undefined, 'valid-token', 'role=nailist')
    const res = await GET(req)
    const json = await res.json()
    expect(json.data[0].status).toBe('PENDING')
  })

  it('serializes createdAt and updatedAt to ISO strings', async () => {
    const created = new Date('2026-06-01T12:00:00Z')
    const updated = new Date('2026-06-02T12:00:00Z')
    collectionStore['appointments'] = [{
      __id: 'apt-1',
      nailistProfileId: 'nailist-profile-1',
      status: 'CONFIRMED',
      startTime: { toDate: () => new Date(Date.now() + 60 * 60 * 1000) },
      endTime: { toDate: () => new Date(Date.now() + 2 * 60 * 60 * 1000) },
      createdAt: { toDate: () => created },
      updatedAt: { toDate: () => updated },
    }]
    const req = makeRequest('GET', undefined, 'valid-token', 'role=nailist')
    const res = await GET(req)
    const json = await res.json()
    expect(json.data[0].createdAt).toBe(created.toISOString())
    expect(json.data[0].updatedAt).toBe(updated.toISOString())
  })

  it('defaults to role=nailist when role param is not provided', async () => {
    const req = makeRequest('GET', undefined, 'valid-token') // no role param
    const res = await GET(req)
    expect(res.status).toBe(200)
    // Should use nailist profile (collectionStore has nailist-profile-1)
    const calledCollections = (mockDb.collection as jest.Mock).mock.calls.map(([n]: [string]) => n)
    expect(calledCollections).toContain('nailistProfiles')
  })
})
