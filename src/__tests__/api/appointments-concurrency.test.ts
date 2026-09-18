/**
 * @jest-environment node
 *
 * Concurrency test for the booking transaction on a split-shift
 * (multiple-intervals) day: two customers racing for the exact same slot
 * must never both succeed. This mocks Firestore's real per-document
 * transaction isolation with an explicit serialization queue around
 * `runTransaction` — each transaction's body (including its fresh
 * conflict-check read) only starts once the previous transaction has fully
 * committed or failed, exactly like Firestore serializes transactions that
 * touch overlapping documents. Without this, two same-process async
 * `POST` calls interleave unpredictably at unrelated `await` points and the
 * test would be flaky rather than proving the guarantee.
 */
import { NextRequest } from 'next/server'

const mockBatch = { update: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) }

const docStore: Record<string, Record<string, unknown>> = {}
const collectionStore: Record<string, Array<Record<string, unknown>>> = {}

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
  return {
    doc: (id?: string) => {
      if (id === undefined) {
        // Auto-ID ref for a new appointment — id only needs to be unique
        // among documents that actually get created (the loser of a race
        // never reaches tx.set at all).
        return { id: `new-${Math.random().toString(36).slice(2)}`, get: jest.fn().mockResolvedValue({ exists: false, data: () => undefined }) }
      }
      return makeDocRef(name, id)
    },
    where: jest.fn().mockImplementation((field: string, _op: string, value: unknown) => ({
      limit: jest.fn().mockReturnThis(),
      // Deliberately NOT snapshotted here — computed only when awaited
      // below, inside the (now-serialized) transaction turn, so it always
      // reflects every write committed by an earlier transaction.
      get: jest.fn().mockImplementation(async () => ({
        empty: !(collectionStore[name] ?? []).some((d) => d[field] === value),
        docs: (collectionStore[name] ?? [])
          .filter((d) => d[field] === value)
          .map((d) => ({ id: d.__id, data: () => d, ref: { update: jest.fn().mockResolvedValue(undefined) } })),
      })),
      orderBy: jest.fn().mockReturnThis(),
    })),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ docs: [], empty: true }),
  }
}

// Serializes every runTransaction call end-to-end (queued strictly one at a
// time), mirroring Firestore's real guarantee that transactions touching
// the same documents never interleave their reads and writes.
let txQueue: Promise<unknown> = Promise.resolve()

const mockDb = {
  collection: jest.fn((name: string) => makeCollectionRef(name)),
  batch: jest.fn(() => mockBatch),
  runTransaction: jest.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) => {
    const run = async () => {
      const tx = {
        get: (q: { get: () => Promise<unknown> }) => q.get(),
        set: jest.fn().mockImplementation((ref: { id: string }, data: Record<string, unknown>) => {
          collectionStore['appointments'] = [...(collectionStore['appointments'] ?? []), { __id: ref.id, ...data }]
        }),
      }
      return fn(tx)
    }
    const result = txQueue.then(run, run)
    txQueue = result.then(() => undefined, () => undefined)
    return result
  }),
}

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user-123', email: 'client@test.com', email_verified: true }),
  })),
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'), delete: jest.fn(() => 'FIELD_DELETE') },
  Timestamp: { fromDate: jest.fn((d: Date) => ({ toDate: () => d, seconds: d.getTime() / 1000, nanoseconds: 0 })) },
}))

jest.mock('@/lib/email', () => ({
  sendAppointmentRequest: jest.fn().mockResolvedValue(undefined),
  sendReviewRequestEmail: jest.fn().mockResolvedValue(undefined),
}))

let uuidCounter = 0
jest.mock('crypto', () => ({ randomUUID: jest.fn(() => `uuid-${++uuidCounter}`) }))

import { POST } from '@/app/api/appointments/route'
import { israelWallClockToUtc } from '@/lib/booking-utils'

function makeRequest(startTime: string): NextRequest {
  const req = new NextRequest('http://localhost/api/appointments', {
    method: 'POST',
    body: JSON.stringify({
      nailistProfileId: 'nailist-profile-1',
      clientProfileId: 'client-profile-1',
      serviceId: 'service-1',
      startTime,
    }),
    headers: { 'Content-Type': 'application/json' },
  })
  Object.defineProperty(req, 'cookies', {
    get: () => ({ get: (n: string) => (n === 'auth-token' ? { value: 'token' } : undefined) }),
  })
  return req
}

describe('POST /api/appointments — concurrency (double-booking prevention)', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'))
    jest.clearAllMocks()
    txQueue = Promise.resolve()
    uuidCounter = 0
    docStore['services/service-1'] = {
      name: "ג'ל", durationMinutes: 60, price: 130, currency: 'ILS', nailistProfileId: 'nailist-profile-1',
    }
    docStore['nailistProfiles/nailist-profile-1'] = { businessName: 'Studio', userId: 'nailist-user' }
    docStore['clientProfiles/client-profile-1'] = { displayName: 'Client', userId: 'user-123' }
    collectionStore['clientProfiles'] = [{ __id: 'client-profile-1', userId: 'user-123' }]
    collectionStore['appointments'] = []
    // Split-shift Saturday (dayOfWeek 6, matching 2026-08-01): 09:00-13:00
    // and 15:00-19:00, with a 13:00-15:00 break.
    collectionStore['workingHours'] = [{
      __id: 'hours-1', nailistProfileId: 'nailist-profile-1', dayOfWeek: 6, isActive: true,
      startTime: '09:00', endTime: '19:00',
      intervals: [{ start: '09:00', end: '13:00' }, { start: '15:00', end: '19:00' }],
    }]
  })

  afterEach(() => jest.useRealTimers())

  it('two customers racing for the same afternoon-interval slot: exactly one succeeds, the other conflicts', async () => {
    const slotStart = israelWallClockToUtc('2026-08-01', '15:00').toISOString()

    const [resA, resB] = await Promise.all([
      POST(makeRequest(slotStart)),
      POST(makeRequest(slotStart)),
    ])

    const statuses = [resA.status, resB.status].sort()
    expect(statuses).toEqual([201, 409])
    // Exactly one appointment was actually written.
    expect(collectionStore['appointments']).toHaveLength(1)
  })

  it('two customers racing for adjacent-but-non-overlapping slots both succeed', async () => {
    // 09:00 (morning interval) and 15:00 (afternoon interval) — no overlap,
    // no shared resource contention, both must go through.
    const morningStart = israelWallClockToUtc('2026-08-01', '09:00').toISOString()
    const afternoonStart = israelWallClockToUtc('2026-08-01', '15:00').toISOString()

    const [resA, resB] = await Promise.all([
      POST(makeRequest(morningStart)),
      POST(makeRequest(afternoonStart)),
    ])

    expect(resA.status).toBe(201)
    expect(resB.status).toBe(201)
    expect(collectionStore['appointments']).toHaveLength(2)
  })

  it('a request for a slot inside the break loses to nothing but is still rejected on its own merits, even concurrently with a valid booking', async () => {
    const breakStart = new Date(israelWallClockToUtc('2026-08-01', '15:00').getTime() - 60 * 60 * 1000) // 14:00 — inside the 13:00-15:00 break
    const validStart = israelWallClockToUtc('2026-08-01', '15:00').toISOString()

    const [resBreak, resValid] = await Promise.all([
      POST(makeRequest(breakStart.toISOString())),
      POST(makeRequest(validStart)),
    ])

    expect(resBreak.status).toBe(409)
    expect(resValid.status).toBe(201)
    expect(collectionStore['appointments']).toHaveLength(1)
  })
})
