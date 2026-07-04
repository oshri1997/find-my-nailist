/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

type DocData = Record<string, unknown>
const docStore: Record<string, DocData> = {}
const collectionStore: Record<string, (DocData & { __id: string })[]> = {}

function makeDocRef(collection: string, id: string) {
  return {
    get: jest.fn().mockImplementation(() =>
      Promise.resolve({
        exists: !!docStore[`${collection}/${id}`],
        data: () => docStore[`${collection}/${id}`] ?? undefined,
        id,
      })
    ),
  }
}

function makeCollectionRef(name: string) {
  return {
    doc: (id: string) => makeDocRef(name, id),
    where: jest.fn().mockImplementation((field: string, _op: string, value: unknown) => {
      const filtered = (collectionStore[name] ?? []).filter((d) => d[field] === value)
      return {
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: filtered.length === 0,
          docs: filtered.map((d) => ({ id: d.__id, data: () => d })),
        }),
      }
    }),
  }
}

const mockDb = { collection: jest.fn((name: string) => makeCollectionRef(name)) }

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'client-user-1' }),
  })),
  adminDb: jest.fn(() => mockDb),
}))

import { GET } from '@/app/api/appointments/[id]/route'

function makeRequest(cookie?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/appointments/apt-1')
  if (cookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (name: string) => (name === 'auth-token' ? { value: cookie } : undefined) }),
    })
  }
  return req
}

const mockParams = { params: Promise.resolve({ id: 'apt-1' }) }

describe('GET /api/appointments/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    docStore['appointments/apt-1'] = {
      clientProfileId: 'client-profile-1',
      nailistProfileId: 'nailist-profile-1',
      nailistBusinessName: 'סטודיו נייל',
      serviceName: 'מניקור',
      status: 'COMPLETED',
      hasReview: false,
      startTime: { toDate: () => new Date('2026-01-01T10:00:00Z') },
      confirmToken: 'secret-confirm',
      declineToken: 'secret-decline',
    }
    collectionStore['clientProfiles'] = [
      { __id: 'client-profile-1', userId: 'client-user-1' },
    ]
  })

  it('returns 401 with no auth token', async () => {
    const res = await GET(makeRequest(), mockParams)
    expect(res.status).toBe(401)
  })

  it('returns 404 when the appointment does not exist', async () => {
    delete docStore['appointments/apt-1']
    const res = await GET(makeRequest('token'), mockParams)
    expect(res.status).toBe(404)
  })

  it('returns 403 when the caller does not own the appointment (not their clientProfileId)', async () => {
    collectionStore['clientProfiles'] = [
      { __id: 'someone-elses-profile', userId: 'client-user-1' },
    ]
    const res = await GET(makeRequest('token'), mockParams)
    expect(res.status).toBe(403)
  })

  it('returns the appointment for its own client, with confirm/decline tokens stripped', async () => {
    const res = await GET(makeRequest('token'), mockParams)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.id).toBe('apt-1')
    expect(json.data.status).toBe('COMPLETED')
    expect(json.data.confirmToken).toBeUndefined()
    expect(json.data.declineToken).toBeUndefined()
  })
})
