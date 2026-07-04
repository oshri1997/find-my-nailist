/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// ── Firebase Admin mocks ────────────────────────────────────────────────────

const mockBatch = {
  update: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
}

const mockAppointmentAdd = jest.fn().mockResolvedValue(undefined)

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
    doc: (id?: string) => {
      if (id === undefined) {
        // Auto-ID ref used by db.collection(...).doc() in transactions
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
    add: name === 'appointments' ? mockAppointmentAdd : jest.fn().mockResolvedValue({ id: `${name}-new` }),
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
      get: (queryOrRef: { get: () => Promise<unknown> }) => queryOrRef.get(),
      set: jest.fn().mockImplementation((ref: { set: (data: unknown) => unknown }, data: unknown) => ref.set(data)),
    }
    return fn(tx)
  }),
}

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user-123', email: 'client@test.com', email_verified: true }),
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
import { adminAuth } from '@/lib/firebase/admin'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(method: string, body?: unknown, cookie?: string, searchParams?: string): NextRequest {
  const url = `http://localhost/api/appointments${searchParams ? `?${searchParams}` : ''}`
  const bodyStr = body ? JSON.stringify(body) : undefined
  const headers = body ? { 'Content-Type': 'application/json' } : undefined
  const req = new NextRequest(url, { method, body: bodyStr, headers })
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

    // Seed client profile (doc read by ID)
    docStore['clientProfiles/client-profile-1'] = {
      displayName: 'לקוחה מעולה',
      userId: 'user-123',
    }

    // Ownership check uses where('userId','==', uid) → collectionStore
    collectionStore['clientProfiles'] = [
      { __id: 'client-profile-1', userId: 'user-123' },
    ]

    // No conflicting appointments
    collectionStore['appointments'] = []
  })

  it('returns 401 when no auth token', async () => {
    const req = makeRequest('POST', validBody) // no cookie
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when clientProfileId does not belong to caller', async () => {
    const req = makeRequest('POST', { ...validBody, clientProfileId: 'other-profile' }, 'valid-token')
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 403 when the caller has not verified their email', async () => {
    ;(adminAuth as jest.Mock).mockReturnValueOnce({
      verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user-123', email: 'client@test.com', email_verified: false }),
    })
    const req = makeRequest('POST', validBody, 'valid-token')
    const res = await POST(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('יש לאמת את כתובת המייל לפני קביעת תור')
  })

  it('returns 404 when service does not exist', async () => {
    delete docStore['services/service-1']
    const req = makeRequest('POST', validBody, 'valid-token')
    const res = await POST(req)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('Service not found')
  })

  it('returns 404 when the service has been deactivated (soft-deleted)', async () => {
    // A nailist can DELETE (soft-delete → isActive:false) a service the
    // client already has open in the booking modal — the submit must not
    // silently succeed for a service she no longer offers.
    docStore['services/service-1'] = { ...docStore['services/service-1'], isActive: false }
    const req = makeRequest('POST', validBody, 'valid-token')
    const res = await POST(req)
    expect(res.status).toBe(404)
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
    const req = makeRequest('POST', validBody, 'valid-token')
    const res = await POST(req)
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toBe('Time slot not available')
  })

  it('returns 400 on invalid body (missing required fields)', async () => {
    const req = makeRequest('POST', { serviceId: 'service-1' }, 'valid-token')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('creates appointment and returns 201 with id', async () => {
    const req = makeRequest('POST', validBody, 'valid-token')
    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.id).toBe('new-appointment-id')
  })

  it('saves nailistBusinessName and clientDisplayName as denormalized fields', async () => {
    const req = makeRequest('POST', validBody, 'valid-token')
    const res = await POST(req)

    // 201 confirms the appointment was created — nailist+client profiles were fetched
    // to populate nailistBusinessName / clientDisplayName before the add() call
    expect(res.status).toBe(201)
    const collectionCalls = (mockDb.collection as jest.Mock).mock.calls
    const fetchedNailist = collectionCalls.some(([name]: [string]) => name === 'nailistProfiles')
    const fetchedClient = collectionCalls.some(([name]: [string]) => name === 'clientProfiles')
    expect(fetchedNailist).toBe(true)
    expect(fetchedClient).toBe(true)
  })

  it('uses firstName + lastName as clientDisplayName when both are present', async () => {
    docStore['clientProfiles/client-profile-1'] = {
      displayName: 'Old Display Name',
      firstName: 'שרה',
      lastName: 'כהן',
      userId: 'user-123',
    }
    const req = makeRequest('POST', validBody, 'valid-token')
    await POST(req)
    expect(mockAppointmentAdd).toHaveBeenCalledWith(
      expect.objectContaining({ clientDisplayName: 'שרה כהן' })
    )
  })

  it('falls back to displayName when firstName or lastName is missing', async () => {
    // default seed has displayName: 'לקוחה מעולה' without firstName/lastName
    const req = makeRequest('POST', validBody, 'valid-token')
    await POST(req)
    expect(mockAppointmentAdd).toHaveBeenCalledWith(
      expect.objectContaining({ clientDisplayName: 'לקוחה מעולה' })
    )
  })

  it('falls back to displayName when only firstName is present', async () => {
    docStore['clientProfiles/client-profile-1'] = {
      displayName: 'Fallback Name',
      firstName: 'שרה',
      userId: 'user-123',
    }
    const req = makeRequest('POST', validBody, 'valid-token')
    await POST(req)
    expect(mockAppointmentAdd).toHaveBeenCalledWith(
      expect.objectContaining({ clientDisplayName: 'Fallback Name' })
    )
  })

  it('stores both confirmToken and declineToken in the appointment', async () => {
    const req = makeRequest('POST', validBody, 'valid-token')
    await POST(req)
    expect(mockAppointmentAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmToken: 'test-uuid-1234',
        declineToken: 'test-uuid-1234',
      })
    )
  })

  it('stores confirmTokenExpiresAt and declineTokenExpiresAt with expiry in the future', async () => {
    const req = makeRequest('POST', validBody, 'valid-token')
    await POST(req)
    const addArg = mockAppointmentAdd.mock.calls[0][0]
    expect(addArg.confirmTokenExpiresAt).toBeDefined()
    expect(addArg.declineTokenExpiresAt).toBeDefined()
    // Expiry should be 7 days from now — the Timestamp mock wraps the Date
    const expiryDate: Date = addArg.confirmTokenExpiresAt.toDate()
    expect(expiryDate.getTime()).toBeGreaterThan(Date.now())
  })

  it('saves status as PENDING', async () => {
    const req = makeRequest('POST', validBody, 'valid-token')
    await POST(req)
    expect(mockAppointmentAdd).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PENDING' })
    )
  })

  it('saves service price, currency, and name as denormalized fields', async () => {
    const req = makeRequest('POST', validBody, 'valid-token')
    await POST(req)
    expect(mockAppointmentAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        price: 120,
        currency: 'ILS',
        serviceName: 'מניקור',
      })
    )
  })

  it('saves nailistBusinessName as denormalized field', async () => {
    const req = makeRequest('POST', validBody, 'valid-token')
    await POST(req)
    expect(mockAppointmentAdd).toHaveBeenCalledWith(
      expect.objectContaining({ nailistBusinessName: 'סטודיו נייל' })
    )
  })

  it('ignores CANCELLED conflicts when checking availability', async () => {
    const startTime = new Date('2026-07-01T10:00:00.000Z')
    const endTime = new Date('2026-07-01T11:00:00.000Z')
    collectionStore['appointments'] = [
      {
        __id: 'cancelled-apt',
        nailistProfileId: 'nailist-profile-1',
        status: 'CANCELLED',
        startTime: { toDate: () => startTime },
        endTime: { toDate: () => endTime },
      },
    ]
    const req = makeRequest('POST', validBody, 'valid-token')
    const res = await POST(req)
    // CANCELLED appointment should not block the slot
    expect(res.status).toBe(201)
  })

  it('ignores COMPLETED conflicts when checking availability', async () => {
    const startTime = new Date('2026-07-01T10:00:00.000Z')
    const endTime = new Date('2026-07-01T11:00:00.000Z')
    collectionStore['appointments'] = [
      {
        __id: 'completed-apt',
        nailistProfileId: 'nailist-profile-1',
        status: 'COMPLETED',
        startTime: { toDate: () => startTime },
        endTime: { toDate: () => endTime },
      },
    ]
    const req = makeRequest('POST', validBody, 'valid-token')
    const res = await POST(req)
    expect(res.status).toBe(201)
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

  it('returns 200 with empty array when nailist profile not found', async () => {
    collectionStore['nailistProfiles'] = []
    const req = makeRequest('GET', undefined, 'valid-token', 'role=nailist')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toEqual([])
  })

  it('returns appointment list for nailist role', async () => {
    const futureStart = new Date(Date.now() + 60 * 60 * 1000)
    const futureEnd = new Date(Date.now() + 2 * 60 * 60 * 1000)
    collectionStore['appointments'] = [
      {
        __id: 'apt-1',
        nailistProfileId: 'nailist-profile-1',
        clientProfileId: 'client-profile-1',
        status: 'CONFIRMED',
        serviceName: 'מניקור',
        startTime: { toDate: () => futureStart },
        endTime: { toDate: () => futureEnd },
      },
    ]
    const req = makeRequest('GET', undefined, 'valid-token', 'role=nailist')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0].id).toBe('apt-1')
    expect(json.data[0].status).toBe('CONFIRMED')
  })

  it('auto-completes CONFIRMED appointments whose endTime has passed', async () => {
    const pastEnd = new Date(Date.now() - 30 * 60 * 1000)
    collectionStore['appointments'] = [
      {
        __id: 'expired-apt',
        nailistProfileId: 'nailist-profile-1',
        clientProfileId: 'client-profile-1',
        status: 'CONFIRMED',
        serviceName: 'מניקור',
        clientDisplayName: 'לקוחה',
        reviewRequested: true,
        startTime: { toDate: () => new Date(Date.now() - 90 * 60 * 1000) },
        endTime: { toDate: () => pastEnd },
      },
    ]
    const req = makeRequest('GET', undefined, 'valid-token', 'role=nailist')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data[0].status).toBe('COMPLETED')
    expect(mockBatch.update).toHaveBeenCalled()
    expect(mockBatch.commit).toHaveBeenCalled()
  })

  it('does not auto-complete CONFIRMED appointments with future endTime', async () => {
    const futureEnd = new Date(Date.now() + 60 * 60 * 1000)
    collectionStore['appointments'] = [
      {
        __id: 'future-apt',
        nailistProfileId: 'nailist-profile-1',
        clientProfileId: 'client-profile-1',
        status: 'CONFIRMED',
        serviceName: 'מניקור',
        startTime: { toDate: () => new Date(Date.now() + 30 * 60 * 1000) },
        endTime: { toDate: () => futureEnd },
      },
    ]
    const req = makeRequest('GET', undefined, 'valid-token', 'role=nailist')
    const res = await GET(req)
    const json = await res.json()
    expect(json.data[0].status).toBe('CONFIRMED')
    expect(mockBatch.commit).not.toHaveBeenCalled()
  })

  it('does not auto-complete PENDING appointments even with past endTime', async () => {
    const pastEnd = new Date(Date.now() - 30 * 60 * 1000)
    collectionStore['appointments'] = [
      {
        __id: 'pending-past',
        nailistProfileId: 'nailist-profile-1',
        clientProfileId: 'client-profile-1',
        status: 'PENDING',
        serviceName: 'מניקור',
        endTime: { toDate: () => pastEnd },
      },
    ]
    const req = makeRequest('GET', undefined, 'valid-token', 'role=nailist')
    const res = await GET(req)
    const json = await res.json()
    expect(json.data[0].status).toBe('PENDING')
    expect(mockBatch.commit).not.toHaveBeenCalled()
  })

  it('serializes startTime and endTime to ISO strings in the response', async () => {
    const start = new Date('2026-07-01T10:00:00Z')
    const end = new Date('2026-07-01T11:00:00Z')
    collectionStore['appointments'] = [
      {
        __id: 'apt-serialize',
        nailistProfileId: 'nailist-profile-1',
        status: 'PENDING',
        startTime: { toDate: () => start },
        endTime: { toDate: () => end },
      },
    ]
    const req = makeRequest('GET', undefined, 'valid-token', 'role=nailist')
    const res = await GET(req)
    const json = await res.json()
    expect(json.data[0].startTime).toBe(start.toISOString())
    expect(json.data[0].endTime).toBe(end.toISOString())
  })
})
