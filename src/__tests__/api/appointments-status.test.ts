/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// ── Firebase Admin mocks ────────────────────────────────────────────────────

type DocData = Record<string, unknown>

const docStore: Record<string, DocData> = {}
const collectionStore: Record<string, (DocData & { __id: string })[]> = {}

const mockUpdateFn = jest.fn().mockResolvedValue(undefined)

const mockDocRef = (collection: string, id: string) => ({
  get: jest.fn().mockImplementation(() =>
    Promise.resolve({
      exists: !!docStore[`${collection}/${id}`],
      data: () => docStore[`${collection}/${id}`] ?? undefined,
      id,
    })
  ),
  update: mockUpdateFn,
})

function makeCollectionRef(name: string) {
  let _whereField: string
  let _whereValue: unknown
  return {
    doc: (id: string) => mockDocRef(name, id),
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
  }
}

const mockDb = {
  collection: jest.fn((name: string) => makeCollectionRef(name)),
  runTransaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      get: (ref: { get: () => unknown }) => ref.get(),
      update: (ref: { update: (data: unknown) => unknown }, data: unknown) => ref.update(data),
    }
    return fn(tx)
  }),
}

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'nailist-user-1' }),
  })),
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

const mockSendReviewRequestEmail = jest.fn().mockResolvedValue(undefined)
const mockSendCancellationEmail = jest.fn().mockResolvedValue(undefined)

jest.mock('@/lib/email', () => ({
  sendReviewRequestEmail: (...args: unknown[]) => mockSendReviewRequestEmail(...args),
  sendCancellationEmail: (...args: unknown[]) => mockSendCancellationEmail(...args),
}))

// ── Import after mocks ──────────────────────────────────────────────────────

import { PATCH } from '@/app/api/appointments/[id]/status/route'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, cookie?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/appointments/appointment-1/status', {
    method: 'PATCH',
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

const mockParams: { params: Promise<{ id: string }> } = {
  params: Promise.resolve({ id: 'appointment-1' }),
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('PATCH /api/appointments/[id]/status', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default appointment doc
    docStore['appointments/appointment-1'] = {
      status: 'CONFIRMED',
      clientProfileId: 'client-profile-1',
      nailistProfileId: 'nailist-profile-1',
      serviceName: 'מניקור',
      clientDisplayName: 'לקוחה',
      reviewRequested: false,
      startTime: { toDate: () => new Date('2026-06-20T10:00:00Z') },
    }

    docStore['clientProfiles/client-profile-1'] = {
      displayName: 'לקוחה',
      email: 'client@test.com',
      userId: 'client-user-1',
    }

    docStore['nailistProfiles/nailist-profile-1'] = {
      businessName: 'סטודיו נייל',
      userId: 'nailist-user-1',
    }

    docStore['users/client-user-1'] = { email: 'client@test.com' }
    docStore['users/nailist-user-1'] = { email: 'nailist@test.com' }

    // Ownership: nailist-user-1 owns nailist-profile-1
    collectionStore['nailistProfiles'] = [
      { __id: 'nailist-profile-1', userId: 'nailist-user-1', businessName: 'סטודיו נייל' },
    ]
  })

  it('returns 401 when no auth token', async () => {
    const req = makeRequest({ status: 'CONFIRMED' }) // no cookie
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller does not own the nailist profile', async () => {
    collectionStore['nailistProfiles'] = [
      { __id: 'other-profile', userId: 'nailist-user-1' },
    ]
    const req = makeRequest({ status: 'CONFIRMED' }, 'valid-token')
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(403)
  })

  it('returns 404 when appointment does not exist', async () => {
    delete docStore['appointments/appointment-1']
    const req = makeRequest({ status: 'CONFIRMED' }, 'valid-token')
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(404)
  })

  it('returns 400 for invalid status value', async () => {
    const req = makeRequest({ status: 'INVALID_STATUS' }, 'valid-token')
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(400)
  })

  it('returns 200 when status is updated to CONFIRMED', async () => {
    docStore['appointments/appointment-1'] = { ...docStore['appointments/appointment-1'], status: 'PENDING' }
    const req = makeRequest({ status: 'CONFIRMED' }, 'valid-token')
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('CONFIRMED')
  })

  it('returns 200 when status is updated to CANCELLED', async () => {
    const req = makeRequest({ status: 'CANCELLED' }, 'valid-token')
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(200)
  })

  it('returns 200 when status is updated to COMPLETED', async () => {
    const req = makeRequest({ status: 'COMPLETED' }, 'valid-token')
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('COMPLETED')
  })

  it('sends review request email when status → COMPLETED (first time)', async () => {
    docStore['appointments/appointment-1'].reviewRequested = false

    const req = makeRequest({ status: 'COMPLETED' }, 'valid-token')
    await PATCH(req, mockParams)

    // Fire-and-forget: give it a tick to resolve
    await new Promise((r) => setTimeout(r, 10))

    expect(mockSendReviewRequestEmail).toHaveBeenCalledTimes(1)
    expect(mockSendReviewRequestEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        clientEmail: 'client@test.com',
        appointmentId: 'appointment-1',
      })
    )
  })

  it('does NOT send review email when reviewRequested is already true (idempotency)', async () => {
    docStore['appointments/appointment-1'].reviewRequested = true

    const req = makeRequest({ status: 'COMPLETED' }, 'valid-token')
    await PATCH(req, mockParams)

    await new Promise((r) => setTimeout(r, 10))

    expect(mockSendReviewRequestEmail).not.toHaveBeenCalled()
  })

  it('sends cancellation email when status → CANCELLED', async () => {
    const req = makeRequest({ status: 'CANCELLED' }, 'valid-token')
    await PATCH(req, mockParams)

    await new Promise((r) => setTimeout(r, 10))

    expect(mockSendCancellationEmail).toHaveBeenCalledTimes(1)
    expect(mockSendCancellationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        clientEmail: 'client@test.com',
        nailistBusinessName: 'סטודיו נייל',
      })
    )
  })

  it('does NOT send cancellation email when status → CONFIRMED', async () => {
    docStore['appointments/appointment-1'] = { ...docStore['appointments/appointment-1'], status: 'PENDING' }
    const req = makeRequest({ status: 'CONFIRMED' }, 'valid-token')
    await PATCH(req, mockParams)

    await new Promise((r) => setTimeout(r, 10))

    expect(mockSendCancellationEmail).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/appointments/[id]/status — transition validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    docStore['appointments/appointment-1'] = {
      status: 'PENDING',
      clientProfileId: 'client-profile-1',
      nailistProfileId: 'nailist-profile-1',
      serviceName: 'מניקור',
      clientDisplayName: 'לקוחה',
      reviewRequested: false,
      startTime: { toDate: () => new Date('2026-06-20T10:00:00Z') },
    }
    docStore['clientProfiles/client-profile-1'] = {
      displayName: 'לקוחה', email: 'client@test.com', userId: 'client-user-1',
    }
    docStore['nailistProfiles/nailist-profile-1'] = {
      businessName: 'סטודיו נייל', userId: 'nailist-user-1',
    }
    docStore['users/client-user-1'] = { email: 'client@test.com' }
    collectionStore['nailistProfiles'] = [
      { __id: 'nailist-profile-1', userId: 'nailist-user-1', businessName: 'סטודיו נייל' },
    ]
  })

  it('rejects PENDING → COMPLETED (must go through CONFIRMED first)', async () => {
    const req = makeRequest({ status: 'COMPLETED' }, 'valid-token')
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(409)
    expect(mockUpdateFn).not.toHaveBeenCalled()
  })

  it('rejects COMPLETED → CANCELLED (a stale tab cannot un-complete a delivered appointment)', async () => {
    docStore['appointments/appointment-1'] = { ...docStore['appointments/appointment-1'], status: 'COMPLETED' }
    const req = makeRequest({ status: 'CANCELLED' }, 'valid-token')
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(409)
    expect(mockSendCancellationEmail).not.toHaveBeenCalled()
  })

  it('rejects CANCELLED → CONFIRMED (cancelled is terminal)', async () => {
    docStore['appointments/appointment-1'] = { ...docStore['appointments/appointment-1'], status: 'CANCELLED' }
    const req = makeRequest({ status: 'CONFIRMED' }, 'valid-token')
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(409)
  })

  it('allows PENDING → CONFIRMED', async () => {
    const req = makeRequest({ status: 'CONFIRMED' }, 'valid-token')
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(200)
  })

  it('allows CONFIRMED → COMPLETED', async () => {
    docStore['appointments/appointment-1'] = { ...docStore['appointments/appointment-1'], status: 'CONFIRMED' }
    const req = makeRequest({ status: 'COMPLETED' }, 'valid-token')
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(200)
  })
})
