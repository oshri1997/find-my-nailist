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
}

let mockUid = 'client-user-1'

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({
    verifyIdToken: jest.fn().mockImplementation(() => Promise.resolve({ uid: mockUid })),
  })),
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

// ── Import after mocks ──────────────────────────────────────────────────────

import { PATCH } from '@/app/api/appointments/[id]/deposit/route'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, cookie?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/appointments/appointment-1/deposit', {
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

describe('PATCH /api/appointments/[id]/deposit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUid = 'client-user-1'

    docStore['appointments/appointment-1'] = {
      status: 'PENDING',
      clientProfileId: 'client-profile-1',
      nailistProfileId: 'nailist-profile-1',
      depositRequired: true,
      depositAmount: 30,
      depositCurrency: 'ILS',
      depositStatus: 'AWAITING_PAYMENT',
    }

    // Ownership lookups
    collectionStore['nailistProfiles'] = [
      { __id: 'nailist-profile-1', userId: 'nailist-user-1' },
    ]
    collectionStore['clientProfiles'] = [
      { __id: 'client-profile-1', userId: 'client-user-1' },
    ]
  })

  it('returns 401 when no auth token', async () => {
    const req = makeRequest({ action: 'MARK_PAID' })
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(401)
  })

  it('returns 404 when the appointment does not exist', async () => {
    delete docStore['appointments/appointment-1']
    const req = makeRequest({ action: 'MARK_PAID' }, 'valid-token')
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(404)
  })

  it('returns 400 when the appointment never required a deposit', async () => {
    docStore['appointments/appointment-1'] = {
      ...docStore['appointments/appointment-1'],
      depositRequired: false,
      depositAmount: undefined,
      depositCurrency: undefined,
      depositStatus: undefined,
    }
    const req = makeRequest({ action: 'MARK_PAID' }, 'valid-token')
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(400)
    expect(mockUpdateFn).not.toHaveBeenCalled()
  })

  it('returns 400 for an invalid action value', async () => {
    const req = makeRequest({ action: 'NOT_A_REAL_ACTION' }, 'valid-token')
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(400)
  })

  it('returns 403 when the caller owns neither the client nor the nailist side of this appointment', async () => {
    mockUid = 'some-other-user'
    const req = makeRequest({ action: 'MARK_PAID' }, 'valid-token')
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(403)
    expect(mockUpdateFn).not.toHaveBeenCalled()
  })

  it('lets the client mark the deposit as paid from AWAITING_PAYMENT', async () => {
    const req = makeRequest({ action: 'MARK_PAID' }, 'valid-token')
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.depositStatus).toBe('CLIENT_MARKED_PAID')
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({ depositStatus: 'CLIENT_MARKED_PAID' })
    )
  })

  it('rejects the nailist attempting MARK_PAID (wrong role for that action)', async () => {
    mockUid = 'nailist-user-1'
    const req = makeRequest({ action: 'MARK_PAID' }, 'valid-token')
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(409)
    expect(mockUpdateFn).not.toHaveBeenCalled()
  })

  it('lets the nailist confirm receipt directly from AWAITING_PAYMENT, without the client claiming first', async () => {
    // Bit has no payment verification either way — the nailist's own word is
    // authoritative and doesn't require the client to have clicked first.
    mockUid = 'nailist-user-1'
    const req = makeRequest({ action: 'CONFIRM_RECEIVED' }, 'valid-token')
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.depositStatus).toBe('NAILIST_CONFIRMED')
  })

  it('lets the nailist confirm receipt from CLIENT_MARKED_PAID', async () => {
    docStore['appointments/appointment-1'] = {
      ...docStore['appointments/appointment-1'],
      depositStatus: 'CLIENT_MARKED_PAID',
    }
    mockUid = 'nailist-user-1'
    const req = makeRequest({ action: 'CONFIRM_RECEIVED' }, 'valid-token')
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(200)
  })

  it('rejects the client attempting CONFIRM_RECEIVED (wrong role)', async () => {
    const req = makeRequest({ action: 'CONFIRM_RECEIVED' }, 'valid-token')
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(409)
    expect(mockUpdateFn).not.toHaveBeenCalled()
  })

  it('rejects any action once the deposit is already NAILIST_CONFIRMED (terminal)', async () => {
    docStore['appointments/appointment-1'] = {
      ...docStore['appointments/appointment-1'],
      depositStatus: 'NAILIST_CONFIRMED',
    }
    mockUid = 'nailist-user-1'
    const req = makeRequest({ action: 'CONFIRM_RECEIVED' }, 'valid-token')
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(409)
    expect(mockUpdateFn).not.toHaveBeenCalled()
  })

  it('never touches the appointment\'s main status field — the two state machines stay fully decoupled', async () => {
    const req = makeRequest({ action: 'MARK_PAID' }, 'valid-token')
    await PATCH(req, mockParams)
    expect(mockUpdateFn).toHaveBeenCalledTimes(1)
    const updateArg = mockUpdateFn.mock.calls[0][0]
    expect(updateArg).not.toHaveProperty('status')
    expect(docStore['appointments/appointment-1'].status).toBe('PENDING')
  })
})
