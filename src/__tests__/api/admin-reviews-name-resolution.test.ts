/**
 * @jest-environment node
 *
 * Same root-cause fix as the public nailist-profile reviews endpoint: an
 * empty/frozen clientDisplayName on an old review should resolve live from
 * the client's current profile (or their users doc) instead of showing "—"
 * forever in the admin reviews table.
 */
import { NextRequest } from 'next/server'

type DocData = Record<string, unknown>
const reviewDocs: (DocData & { __id: string })[] = []
const docsByCollection: Record<string, Record<string, DocData>> = {
  nailistProfiles: {},
  clientProfiles: {},
  users: {},
}

function makeCollectionRef(name: string) {
  return {
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    where: jest.fn().mockImplementation((field: string, _op: string, ids: string[]) => ({
      get: jest.fn().mockImplementation(() => {
        if (field !== '__name__') return Promise.resolve({ docs: [] })
        const store = docsByCollection[name] ?? {}
        const docs = ids.filter((id) => store[id]).map((id) => ({ id, data: () => store[id] }))
        return Promise.resolve({ docs })
      }),
    })),
    get: jest.fn().mockImplementation(() => {
      if (name !== 'reviews') return Promise.resolve({ docs: [] })
      return Promise.resolve({ docs: reviewDocs.map((d) => ({ id: d.__id, data: () => d })) })
    }),
  }
}

const mockDb = { collection: jest.fn((name: string) => makeCollectionRef(name)) }

jest.mock('@/lib/firebase/admin', () => ({ adminDb: jest.fn(() => mockDb) }))
jest.mock('@/lib/admin-auth', () => ({
  verifyAdmin: jest.fn().mockResolvedValue({ uid: 'admin-1', email: 'admin@test.com' }),
  adminUnauthorized: () => new Response(JSON.stringify({ error: 'אין הרשאה' }), { status: 403 }),
}))

import { GET } from '@/app/api/admin/reviews/route'

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/admin/reviews', { method: 'GET' })
}

describe('GET /api/admin/reviews — clientDisplayName resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    reviewDocs.length = 0
    docsByCollection.nailistProfiles = {}
    docsByCollection.clientProfiles = {}
    docsByCollection.users = {}
  })

  it('leaves an already-set clientDisplayName untouched', async () => {
    reviewDocs.push({ __id: 'r1', clientProfileId: 'c1', clientDisplayName: 'שרה כ.', rating: 5 })
    const res = await GET(makeRequest())
    const json = await res.json()
    expect(json.data[0].clientDisplayName).toBe('שרה כ.')
  })

  it('resolves from the client profile firstName+lastName when clientDisplayName is empty', async () => {
    reviewDocs.push({ __id: 'r1', clientProfileId: 'c1', clientDisplayName: '', rating: 5 })
    docsByCollection.clientProfiles.c1 = { firstName: 'ישראלה', lastName: 'ישראלית', userId: 'u1' }
    const res = await GET(makeRequest())
    const json = await res.json()
    expect(json.data[0].clientDisplayName).toBe('ישראלה ישראלית')
  })

  it('falls back to the users doc displayName when the client profile has no name fields', async () => {
    reviewDocs.push({ __id: 'r1', clientProfileId: 'c1', clientDisplayName: '', rating: 5 })
    docsByCollection.clientProfiles.c1 = { userId: 'u1' }
    docsByCollection.users.u1 = { displayName: 'דנה לוי' }
    const res = await GET(makeRequest())
    const json = await res.json()
    expect(json.data[0].clientDisplayName).toBe('דנה לוי')
  })

  it('falls back to an empty string when nothing can be resolved', async () => {
    reviewDocs.push({ __id: 'r1', clientProfileId: 'c1', clientDisplayName: '', rating: 5 })
    docsByCollection.clientProfiles.c1 = { userId: 'u1' }
    docsByCollection.users.u1 = {}
    const res = await GET(makeRequest())
    const json = await res.json()
    expect(json.data[0].clientDisplayName).toBe('')
  })
})
