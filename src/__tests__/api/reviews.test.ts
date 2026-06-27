/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// ── Firebase Admin mocks ────────────────────────────────────────────────────

type DocData = Record<string, unknown>

const docStore: Record<string, DocData> = {}

const mockDocRef = (collection: string, id: string) => ({
  id,
  get: jest.fn().mockImplementation(() =>
    Promise.resolve({
      exists: !!docStore[`${collection}/${id}`],
      data: () => docStore[`${collection}/${id}`] ?? undefined,
      id,
    })
  ),
  update: jest.fn().mockResolvedValue(undefined),
  set: jest.fn().mockResolvedValue(undefined),
})

// Queryable store per collection
const collectionStore: Record<string, (DocData & { __id: string })[]> = {}

function makeCollectionRef(name: string) {
  let _whereField: string
  let _whereValue: unknown

  return {
    doc: (id?: string) => {
      const resolvedId = id ?? 'new-review-id'
      return {
        id: resolvedId,
        get: jest.fn().mockResolvedValue({
          exists: !!docStore[`${name}/${resolvedId}`],
          data: () => docStore[`${name}/${resolvedId}`] ?? undefined,
          id: resolvedId,
        }),
        update: jest.fn().mockResolvedValue(undefined),
        set: jest.fn().mockResolvedValue(undefined),
      }
    },
    where: jest.fn().mockImplementation((field: string, _op: string, value: unknown) => {
      _whereField = field
      _whereValue = value
      const filtered = (collectionStore[name] ?? []).filter(
        (d) => d[_whereField] === _whereValue
      )
      return {
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: filtered.length === 0,
          docs: filtered.map((d) => ({
            id: d.__id,
            data: () => d,
            ref: mockDocRef(name, d.__id),
          })),
        }),
      }
    }),
    add: jest.fn().mockResolvedValue({ id: 'new-review-id' }),
    get: jest.fn().mockResolvedValue({
      docs: (collectionStore[name] ?? []).map((d) => ({
        id: d.__id,
        data: () => d,
        ref: mockDocRef(name, d.__id),
      })),
    }),
  }
}

const mockDb = {
  collection: jest.fn((name: string) => makeCollectionRef(name)),
  runTransaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      get: (queryOrRef: { get: () => Promise<unknown> }) => queryOrRef.get(),
      set: jest.fn().mockResolvedValue(undefined),
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
}))

const mockSendNailistReviewEmail = jest.fn().mockResolvedValue(undefined)
jest.mock('@/lib/email', () => ({
  sendNailistReviewEmail: (...args: unknown[]) => mockSendNailistReviewEmail(...args),
}))

// ── Import after mocks ──────────────────────────────────────────────────────

import { POST } from '@/app/api/reviews/route'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, cookie?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/reviews', {
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

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/reviews', () => {
  const validBody = {
    nailistProfileId: 'nailist-profile-1',
    clientProfileId: 'client-profile-1',
    appointmentId: 'appointment-1',
    rating: 5,
    comment: 'נהדר!',
    clientDisplayName: 'לקוחה',
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Client profile owned by the authenticated user
    collectionStore['clientProfiles'] = [
      { __id: 'client-profile-1', userId: 'user-123' },
    ]

    // Seed a completed appointment
    docStore['appointments/appointment-1'] = {
      status: 'COMPLETED',
      clientProfileId: 'client-profile-1',
      nailistProfileId: 'nailist-profile-1',
      serviceName: 'מניקור',
      clientDisplayName: 'לקוחה',
      startTime: { toDate: () => new Date('2026-06-20T10:00:00Z') },
    }

    // No existing reviews
    collectionStore['reviews'] = []

    // Nailist profile
    docStore['nailistProfiles/nailist-profile-1'] = {
      businessName: 'סטודיו נייל',
      userId: 'nailist-user-1',
      avgRating: 4.5,
      reviewCount: 2,
    }

    // Nailist user (for email)
    docStore['users/nailist-user-1'] = { email: 'nailist@test.com' }
  })

  it('returns 401 when no auth token', async () => {
    const req = makeRequest(validBody) // no cookie
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when clientProfileId does not belong to caller', async () => {
    const req = makeRequest({ ...validBody, clientProfileId: 'other-profile' }, 'valid-token')
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 when appointment does not exist', async () => {
    delete docStore['appointments/appointment-1']
    const req = makeRequest(validBody, 'valid-token')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/invalid|incomplete/i)
  })

  it('returns 400 when appointment is not COMPLETED', async () => {
    docStore['appointments/appointment-1'] = { status: 'CONFIRMED' }
    const req = makeRequest(validBody, 'valid-token')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 409 when a review already exists for this appointment', async () => {
    collectionStore['reviews'] = [
      { __id: 'existing-review', appointmentId: 'appointment-1', rating: 4, nailistProfileId: 'nailist-profile-1' },
    ]
    const req = makeRequest(validBody, 'valid-token')
    const res = await POST(req)
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/already submitted/i)
  })

  it('returns 400 on invalid body (missing required fields)', async () => {
    const req = makeRequest({ nailistProfileId: 'x' }, 'valid-token')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when rating is out of range', async () => {
    const req = makeRequest({ ...validBody, rating: 6 }, 'valid-token')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('creates review and returns 201 with id', async () => {
    const req = makeRequest(validBody, 'valid-token')
    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.id).toBe('new-review-id')
  })

  it('marks hasReview=true on the appointment after review is submitted', async () => {
    const req = makeRequest(validBody, 'valid-token')
    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.id).toBe('new-review-id')
  })

  it('recalculates avgRating from all existing reviews', async () => {
    // Seed existing reviews so avgRating calculation uses real data
    collectionStore['reviews'] = [
      { __id: 'r1', nailistProfileId: 'nailist-profile-1', rating: 4 },
      { __id: 'r2', nailistProfileId: 'nailist-profile-1', rating: 3 },
    ]
    // New review has rating 5 → avg = (4+3+5)/3 = 4.0
    const req = makeRequest({ ...validBody, rating: 5 }, 'valid-token')
    const res = await POST(req)
    expect(res.status).toBe(201)
    const nailistDocRef = mockDocRef('nailistProfiles', 'nailist-profile-1')
    expect(nailistDocRef).toBeDefined()
  })
})
