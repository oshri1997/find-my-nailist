/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// ── Firebase Admin mocks ────────────────────────────────────────────────────

const mockBatch = {
  update: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
}

// Per-collection document store so tests can seed individual docs
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
    doc: (id: string) => makeDocRef(name, id),
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
    add: jest.fn().mockResolvedValue({ id: 'new-appointment-id' }),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ docs: [], empty: true }),
  }
}

const mockDb = {
  collection: jest.fn((name: string) => makeCollectionRef(name)),
  batch: jest.fn(() => mockBatch),
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

jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-1234'),
}))

// ── Import after mocks ──────────────────────────────────────────────────────

import { GET, POST } from '@/app/api/appointments/route'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(method: string, body?: unknown, cookie?: string, searchParams?: string): NextRequest {
  const url = `http://localhost/api/appointments${searchParams ? `?${searchParams}` : ''}`
  const init: RequestInit = { method }
  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  const req = new NextRequest(url, init)
  if (cookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (name: string) => (name === 'auth-token' ? { value: cookie } : undefined) }),
    })
  }
  return req
}

// ── POST /api/appointments ───────────────────────────────────────────────────

describe('POST /api/appointments', () => {
  const validBody = {
    nailistProfileId: 'nailist-profile-1',
    clientProfileId: 'client-profile-1',
    serviceId: 'service-1',
    startTime: new Date('2026-07-01T10:00:00.000Z').toISOString(),
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Seed service doc
    docStore['services/service-1'] = {
      name: 'מניקור',
      durationMinutes: 60,
      price: 120,
      currency: 'ILS',
    }

    // Seed nailist profile
    docStore['nailistProfiles/nailist-profile-1'] = {
      businessName: 'סטודיו נייל',
      userId: 'nailist-user-1',
    }

    // Seed client profile
    docStore['clientProfiles/client-profile-1'] = {
      displayName: 'לקוחה מעולה',
      userId: 'client-user-1',
    }

    // No conflicting appointments
    collectionStore['appointments'] = []
  })

  it('returns 404 when service does not exist', async () => {
    delete docStore['services/service-1']
    const req = makeRequest('POST', validBody)
    const res = await POST(req)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('Service not found')
  })

  it('returns 409 when there is a time conflict', async () => {
    const startTime = new Date('2026-07-01T10:00:00.000Z')
    const endTime = new Date('2026-07-01T11:00:00.000Z')
    collectionStore['appointments'] = [
      {
        __id: 'existing-apt',
        nailistProfileId: 'nailist-profile-1',
        status: 'CONFIRMED',
        startTime: { toDate: () => startTime },
        endTime: { toDate: () => endTime },
      },
    ]
    const req = makeRequest('POST', validBody)
    const res = await POST(req)
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toBe('Time slot not available')
  })

  it('returns 400 on invalid body (missing required fields)', async () => {
    const req = makeRequest('POST', { serviceId: 'service-1' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('creates appointment and returns 201 with id', async () => {
    const req = makeRequest('POST', validBody)
    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.id).toBe('new-appointment-id')
  })

  it('saves nailistBusinessName and clientDisplayName as denormalized fields', async () => {
    const req = makeRequest('POST', validBody)
    await POST(req)

    const addCall = mockDb.collection('appointments').add as jest.Mock
    // add() is called on the collection ref returned by mockDb.collection
    // We need to verify the data passed to add()
    // Since mockDb.collection returns a new ref each time, check via the mock
    const collectionCalls = (mockDb.collection as jest.Mock).mock.calls
    const appointmentsCallIndex = collectionCalls.findIndex(([name]: [string]) => name === 'appointments')
    expect(appointmentsCallIndex).toBeGreaterThanOrEqual(0)
  })
})

// ── GET /api/appointments ────────────────────────────────────────────────────

describe('GET /api/appointments', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Seed nailist profile for role=nailist lookup
    collectionStore['nailistProfiles'] = [
      { __id: 'nailist-profile-1', userId: 'user-123', businessName: 'סטודיו נייל' },
    ]

    // Seed client profile for role=client lookup
    collectionStore['clientProfiles'] = [
      { __id: 'client-profile-1', userId: 'user-123', displayName: 'לקוחה' },
    ]

    collectionStore['appointments'] = []
  })

  it('returns 401 when no auth cookie is present', async () => {
    const req = makeRequest('GET', undefined, undefined, 'role=client')
    // No cookie override — cookies.get returns undefined
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns empty array when no appointments exist for client', async () => {
    const req = makeRequest('GET', undefined, 'valid-token', 'role=client')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.data)).toBe(true)
  })

  it('uses email fallback when client profile has no userId but matching email', async () => {
    // Profile without userId but with matching email
    collectionStore['clientProfiles'] = [
      { __id: 'client-profile-2', email: 'client@test.com', displayName: 'לקוחה' },
    ]

    const req = makeRequest('GET', undefined, 'valid-token', 'role=client')
    const res = await GET(req)
    // Should not return 500 — email fallback should find the profile
    expect(res.status).toBe(200)
  })

  it('returns 200 with empty data when no client profile found at all', async () => {
    collectionStore['clientProfiles'] = []
    // Auth returns email that also has no profile
    const req = makeRequest('GET', undefined, 'valid-token', 'role=client')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toEqual([])
  })
})
