/**
 * @jest-environment node
 *
 * Covers two bugfixes: the role-based query limit (nailist=1000, client=50)
 * and chunking Firestore batch writes to stay under the 500-op-per-batch cap.
 */
import { NextRequest } from 'next/server'

const limitSpy = jest.fn()

const mockBatch = {
  update: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
}
const batchSpy = jest.fn(() => mockBatch)

const collectionStore: Record<string, Record<string, unknown>[]> = {}

function makeDocRef(collection: string, id: string) {
  return {
    get: jest.fn().mockResolvedValue({
      exists: false,
      data: () => undefined,
      id,
    }),
    update: jest.fn().mockResolvedValue(undefined),
  }
}

function makeCollectionRef(name: string) {
  return {
    doc: (id: string) => makeDocRef(name, id),
    where: jest.fn().mockImplementation((field: string, _op: string, value: unknown) => ({
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockImplementation((n: number) => {
        limitSpy(n)
        return {
          get: jest.fn().mockResolvedValue({
            docs: (collectionStore[name] ?? [])
              .filter((d) => d[field] === value)
              .map((d) => ({
                id: d.__id,
                data: () => d,
                ref: { update: jest.fn().mockResolvedValue(undefined) },
              })),
          }),
        }
      }),
    })),
  }
}

const mockDb = {
  collection: jest.fn((name: string) => makeCollectionRef(name)),
  batch: batchSpy,
}

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user-123', email: 'client@test.com' }),
  })),
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

jest.mock('@/lib/email', () => ({
  sendAppointmentRequest: jest.fn().mockResolvedValue(undefined),
  sendReviewRequestEmail: jest.fn().mockResolvedValue(undefined),
}))

import { GET } from '@/app/api/appointments/route'

function makeRequest(cookie: string | undefined, searchParams?: string): NextRequest {
  const url = `http://localhost/api/appointments${searchParams ? `?${searchParams}` : ''}`
  const req = new NextRequest(url, { method: 'GET' })
  if (cookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (n: string) => (n === 'auth-token' ? { value: cookie } : undefined) }),
    })
  }
  return req
}

describe('GET /api/appointments — query limit by role', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    collectionStore['nailistProfiles'] = [{ __id: 'nailist-profile-1', userId: 'user-123' }]
    collectionStore['clientProfiles'] = [{ __id: 'client-profile-1', userId: 'user-123' }]
    collectionStore['appointments'] = []
  })

  it('requests up to 1000 appointments for role=nailist so all-time stats are accurate', async () => {
    const res = await GET(makeRequest('token', 'role=nailist'))
    expect(res.status).toBe(200)
    expect(limitSpy).toHaveBeenCalledWith(1000)
  })

  it('requests only 50 appointments for role=client', async () => {
    const res = await GET(makeRequest('token', 'role=client'))
    expect(res.status).toBe(200)
    expect(limitSpy).toHaveBeenCalledWith(50)
  })
})

describe('GET /api/appointments — batch write chunking', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    collectionStore['nailistProfiles'] = [{ __id: 'nailist-profile-1', userId: 'user-123' }]
    collectionStore['clientProfiles'] = []
  })

  it('splits auto-complete writes into chunks of at most 500 to respect the Firestore batch limit', async () => {
    const past = new Date(Date.now() - 60 * 60 * 1000)
    collectionStore['appointments'] = Array.from({ length: 620 }, (_, i) => ({
      __id: `apt-${i}`,
      nailistProfileId: 'nailist-profile-1',
      status: 'CONFIRMED',
      reviewRequested: true, // skip the fire-and-forget email side effect
      startTime: { toDate: () => new Date(Date.now() - 2 * 60 * 60 * 1000) },
      endTime: { toDate: () => past },
      createdAt: { toDate: () => past },
    }))

    const res = await GET(makeRequest('token', 'role=nailist'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(620)
    expect(json.data.every((a: { status: string }) => a.status === 'COMPLETED')).toBe(true)

    // 620 docs -> ceil(620 / 500) = 2 batches, never exceeding the 500-op cap
    expect(batchSpy).toHaveBeenCalledTimes(2)
    expect(mockBatch.commit).toHaveBeenCalledTimes(2)
    expect(mockBatch.update).toHaveBeenCalledTimes(620)
  })

  it('splits auto-cancel writes into chunks of at most 500 to respect the Firestore batch limit', async () => {
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    collectionStore['appointments'] = Array.from({ length: 550 }, (_, i) => ({
      __id: `stale-${i}`,
      nailistProfileId: 'nailist-profile-1',
      status: 'PENDING',
      createdAt: { toDate: () => fourDaysAgo },
      startTime: { toDate: () => new Date(Date.now() + 60 * 60 * 1000) },
      endTime: { toDate: () => new Date(Date.now() + 2 * 60 * 60 * 1000) },
    }))

    const res = await GET(makeRequest('token', 'role=nailist'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.every((a: { status: string }) => a.status === 'CANCELLED')).toBe(true)

    // 550 docs -> ceil(550 / 500) = 2 batches
    expect(batchSpy).toHaveBeenCalledTimes(2)
    expect(mockBatch.commit).toHaveBeenCalledTimes(2)
  })

  it('uses a single batch when the update set is well under the 500-op limit', async () => {
    const past = new Date(Date.now() - 60 * 60 * 1000)
    collectionStore['appointments'] = Array.from({ length: 3 }, (_, i) => ({
      __id: `apt-${i}`,
      nailistProfileId: 'nailist-profile-1',
      status: 'CONFIRMED',
      reviewRequested: true,
      startTime: { toDate: () => new Date(Date.now() - 2 * 60 * 60 * 1000) },
      endTime: { toDate: () => past },
      createdAt: { toDate: () => past },
    }))

    const res = await GET(makeRequest('token', 'role=nailist'))
    expect(res.status).toBe(200)
    expect(batchSpy).toHaveBeenCalledTimes(1)
    expect(mockBatch.commit).toHaveBeenCalledTimes(1)
  })
})
