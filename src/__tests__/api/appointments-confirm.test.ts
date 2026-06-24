/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// ── Firebase Admin mocks ────────────────────────────────────────────────────

type DocData = Record<string, unknown>

const docStore: Record<string, DocData> = {}

function makeDocRef(collection: string, id: string) {
  return {
    get: jest.fn().mockImplementation(() =>
      Promise.resolve({
        exists: !!docStore[`${collection}/${id}`],
        data: () => docStore[`${collection}/${id}`] ?? undefined,
        id,
      })
    ),
    update: jest.fn().mockResolvedValue(undefined),
  }
}

const collectionStore: Record<string, (DocData & { __id: string })[]> = {}

function makeCollectionRef(name: string) {
  let _whereField: string
  let _whereValue: unknown
  return {
    doc: (id: string) => makeDocRef(name, id),
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
            ref: makeDocRef(name, d.__id),
          })),
        }),
      }
    }),
  }
}

const mockDb = {
  collection: jest.fn((name: string) => makeCollectionRef(name)),
}

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
    delete: jest.fn(() => 'FIELD_DELETE'),
  },
}))

const mockSendClientConfirmedEmail = jest.fn().mockResolvedValue(undefined)
jest.mock('@/lib/email', () => ({
  sendClientConfirmedEmail: (...args: unknown[]) => mockSendClientConfirmedEmail(...args),
}))

// ── Import after mocks ──────────────────────────────────────────────────────

import { GET } from '@/app/api/appointments/confirm/route'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(token?: string): NextRequest {
  const url = token
    ? `http://localhost/api/appointments/confirm?token=${token}`
    : 'http://localhost/api/appointments/confirm'
  return new NextRequest(url)
}

const futureExpiry = { toDate: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
const pastExpiry = { toDate: () => new Date(Date.now() - 1000) }

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/appointments/confirm', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    collectionStore['appointments'] = [
      {
        __id: 'apt-1',
        confirmToken: 'valid-confirm-token',
        confirmTokenExpiresAt: futureExpiry,
        status: 'PENDING',
        clientProfileId: 'client-profile-1',
        nailistProfileId: 'nailist-profile-1',
        serviceName: 'מניקור',
        clientDisplayName: 'שרה כהן',
        price: 150,
        currency: 'ILS',
        startTime: { toDate: () => new Date('2026-07-01T10:00:00Z') },
      },
    ]

    docStore['clientProfiles/client-profile-1'] = {
      displayName: 'שרה כהן',
      email: 'client@test.com',
      userId: 'client-user-1',
    }
    docStore['nailistProfiles/nailist-profile-1'] = {
      businessName: 'סטודיו נייל',
    }
    docStore['users/client-user-1'] = { email: 'client@test.com' }
  })

  it('redirects with error=invalid when no token is provided', async () => {
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('Location')).toContain('error=invalid')
  })

  it('redirects with error=invalid when token does not exist', async () => {
    const req = makeRequest('non-existent-token')
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('Location')).toContain('error=invalid')
  })

  it('redirects with error=expired when token is past its expiry', async () => {
    collectionStore['appointments'][0].confirmTokenExpiresAt = pastExpiry
    const req = makeRequest('valid-confirm-token')
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('Location')).toContain('error=expired')
  })

  it('redirects with already=1 when appointment is already CONFIRMED', async () => {
    collectionStore['appointments'][0].status = 'CONFIRMED'
    const req = makeRequest('valid-confirm-token')
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('Location')).toContain('already=1')
  })

  it('redirects with already=1 when appointment is CANCELLED', async () => {
    collectionStore['appointments'][0].status = 'CANCELLED'
    const req = makeRequest('valid-confirm-token')
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('Location')).toContain('already=1')
  })

  it('redirects to confirmed page on success', async () => {
    const req = makeRequest('valid-confirm-token')
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('Location')).toContain('/appointments/confirmed')
    expect(res.headers.get('Location')).not.toContain('error=')
  })

  it('sends confirmation email on success', async () => {
    const req = makeRequest('valid-confirm-token')
    await GET(req)

    expect(mockSendClientConfirmedEmail).toHaveBeenCalledTimes(1)
    expect(mockSendClientConfirmedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        clientEmail: 'client@test.com',
        clientName: 'שרה כהן',
        nailistBusinessName: 'סטודיו נייל',
        serviceName: 'מניקור',
        price: 150,
        currency: 'ILS',
      })
    )
  })

  it('falls back to user email when client profile has no email field', async () => {
    docStore['clientProfiles/client-profile-1'] = {
      displayName: 'שרה',
      userId: 'client-user-1',
    }
    docStore['users/client-user-1'] = { email: 'fallback@test.com' }

    const req = makeRequest('valid-confirm-token')
    await GET(req)

    expect(mockSendClientConfirmedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ clientEmail: 'fallback@test.com' })
    )
  })

  it('redirects with emailError=1 when no email can be found', async () => {
    docStore['clientProfiles/client-profile-1'] = { displayName: 'שרה' }
    docStore['users/client-user-1'] = {}

    const req = makeRequest('valid-confirm-token')
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('Location')).toContain('emailError=1')
  })
})
