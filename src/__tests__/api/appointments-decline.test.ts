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
            ref: {
              get: jest.fn().mockImplementation(() => Promise.resolve({ exists: true, data: () => d })),
              update: jest.fn().mockImplementation((data: DocData) => Object.assign(d, data)),
            },
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
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
    delete: jest.fn(() => 'FIELD_DELETE'),
  },
}))

const mockSendCancellationEmail = jest.fn().mockResolvedValue(undefined)
jest.mock('@/lib/email', () => ({
  sendCancellationEmail: (...args: unknown[]) => mockSendCancellationEmail(...args),
}))

// ── Import after mocks ──────────────────────────────────────────────────────

import { GET } from '@/app/api/appointments/decline/route'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(token?: string): NextRequest {
  const url = token
    ? `http://localhost/api/appointments/decline?token=${token}`
    : 'http://localhost/api/appointments/decline'
  return new NextRequest(url)
}

const futureExpiry = { toDate: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
const pastExpiry = { toDate: () => new Date(Date.now() - 1000) }

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/appointments/decline', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    collectionStore['appointments'] = [
      {
        __id: 'apt-1',
        declineToken: 'valid-token',
        declineTokenExpiresAt: futureExpiry,
        status: 'PENDING',
        clientProfileId: 'client-profile-1',
        nailistProfileId: 'nailist-profile-1',
        serviceName: 'מניקור',
        clientDisplayName: 'שרה כ.',
        nailistBusinessName: 'סטודיו נייל',
        startTime: { toDate: () => new Date('2026-07-01T10:00:00Z') },
      },
    ]

    docStore['clientProfiles/client-profile-1'] = {
      email: 'client@test.com',
      displayName: 'שרה כהן',
      userId: 'client-user-1',
    }
    docStore['nailistProfiles/nailist-profile-1'] = {
      businessName: 'סטודיו נייל',
    }
    docStore['users/client-user-1'] = { email: 'client@test.com' }
  })

  it('returns 400 when no token is provided', async () => {
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 404 when token does not match any appointment', async () => {
    const req = makeRequest('non-existent-token')
    const res = await GET(req)
    expect(res.status).toBe(404)
  })

  it('returns 409 when appointment is already not PENDING', async () => {
    collectionStore['appointments'][0].status = 'CONFIRMED'
    const req = makeRequest('valid-token')
    const res = await GET(req)
    expect(res.status).toBe(409)
  })

  it('returns 409 when appointment is CANCELLED', async () => {
    collectionStore['appointments'][0].status = 'CANCELLED'
    const req = makeRequest('valid-token')
    const res = await GET(req)
    expect(res.status).toBe(409)
  })

  it('returns 410 when token is expired', async () => {
    collectionStore['appointments'][0].declineTokenExpiresAt = pastExpiry
    const req = makeRequest('valid-token')
    const res = await GET(req)
    expect(res.status).toBe(410)
  })

  it('returns 200 HTML on successful decline', async () => {
    const req = makeRequest('valid-token')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toMatch(/text\/html/)
  })

  it('success page contains the client name and service', async () => {
    const req = makeRequest('valid-token')
    const res = await GET(req)
    const html = await res.text()
    expect(html).toContain('שרה כ.')
    expect(html).toContain('מניקור')
  })

  it('sends cancellation email on successful decline', async () => {
    const req = makeRequest('valid-token')
    await GET(req)
    await new Promise((r) => setTimeout(r, 10))
    expect(mockSendCancellationEmail).toHaveBeenCalledTimes(1)
    expect(mockSendCancellationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        clientEmail: 'client@test.com',
        nailistBusinessName: 'סטודיו נייל',
        serviceName: 'מניקור',
      })
    )
  })

  it('cancellation email falls back to user email when profile has no email', async () => {
    docStore['clientProfiles/client-profile-1'] = {
      userId: 'client-user-1',
      displayName: 'שרה',
    }
    docStore['users/client-user-1'] = { email: 'user@fallback.com' }

    const req = makeRequest('valid-token')
    await GET(req)
    await new Promise((r) => setTimeout(r, 10))

    expect(mockSendCancellationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ clientEmail: 'user@fallback.com' })
    )
  })

  it('does not crash when no client email can be resolved (gracefully skips email)', async () => {
    docStore['clientProfiles/client-profile-1'] = { displayName: 'שרה' }
    const req = makeRequest('valid-token')
    const res = await GET(req)
    expect(res.status).toBe(200)
    await new Promise((r) => setTimeout(r, 10))
    expect(mockSendCancellationEmail).not.toHaveBeenCalled()
  })

  it('error page contains the token-not-found message', async () => {
    const req = makeRequest('bad-token')
    const res = await GET(req)
    const html = await res.text()
    expect(html).toContain('לא תקין')
  })
})
