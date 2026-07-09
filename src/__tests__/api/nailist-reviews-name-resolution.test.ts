/**
 * @jest-environment node
 *
 * Covers a real production bug: reviews created before a client's account
 * had a proper name (e.g. a client_profiles doc created via a code path that
 * skipped the mandatory name step) permanently showed "לקוחה" because
 * clientDisplayName is a snapshot frozen at booking time, never updated.
 * GET /api/nailists/[id] now resolves a missing clientDisplayName live from
 * the current client profile (or the users doc as a further fallback)
 * instead of trusting the frozen value forever.
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

// Chained .where('__name__', 'in', [...]) (used by the shared
// batchFetchByIds helper) needs to resolve from docStore (keyed by id), not
// collectionStore (a plain listing) — everything else keeps returning
// whatever's in collectionStore, same as before.
function makeCollectionRef(name: string) {
  const chain: { field?: string; op?: string; value?: unknown } = {}
  const ref = {
    doc: (id: string) => makeDocRef(name, id),
    where: jest.fn().mockImplementation((field: string, op: string, value: unknown) => {
      chain.field = field
      chain.op = op
      chain.value = value
      return ref
    }),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockImplementation(() => {
      if (chain.field === '__name__' && chain.op === 'in') {
        const ids = chain.value as string[]
        const docs = ids
          .filter((id) => docStore[`${name}/${id}`])
          .map((id) => ({ id, data: () => docStore[`${name}/${id}`] }))
        return Promise.resolve({ docs })
      }
      return Promise.resolve({
        docs: (collectionStore[name] ?? []).map((d) => ({ id: d.__id, data: () => d })),
      })
    }),
  }
  return ref
}

const mockDb = { collection: jest.fn((name: string) => makeCollectionRef(name)) }

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({ verifyIdToken: jest.fn().mockRejectedValue(new Error('no token')) })),
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('@/lib/geocoding', () => ({ geocodeAddress: jest.fn().mockResolvedValue(null) }))

import { GET } from '@/app/api/nailists/[id]/route'

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/nailists/nailist-profile-1', { method: 'GET' })
}

const mockParams = { params: Promise.resolve({ id: 'nailist-profile-1' }) }

describe('GET /api/nailists/[id] — review clientDisplayName resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    docStore['nailistProfiles/nailist-profile-1'] = { businessName: 'סטודיו יופי' }
    collectionStore.reviews = []
  })

  it('leaves an already-set clientDisplayName untouched (no extra lookup)', async () => {
    collectionStore.reviews = [
      { __id: 'review-1', clientProfileId: 'client-1', clientDisplayName: 'שרה כ.', rating: 5 },
    ]
    const res = await GET(makeRequest(), mockParams)
    const json = await res.json()
    expect(json.data.reviews[0].clientDisplayName).toBe('שרה כ.')
  })

  it('resolves from the client profile firstName+lastName when clientDisplayName is empty', async () => {
    collectionStore.reviews = [
      { __id: 'review-1', clientProfileId: 'client-1', clientDisplayName: '', rating: 5 },
    ]
    docStore['clientProfiles/client-1'] = { firstName: 'ישראלה', lastName: 'ישראלית', userId: 'user-1' }
    const res = await GET(makeRequest(), mockParams)
    const json = await res.json()
    expect(json.data.reviews[0].clientDisplayName).toBe('ישראלה ישראלית')
  })

  it('falls back to the users doc displayName when the client profile has no name fields', async () => {
    collectionStore.reviews = [
      { __id: 'review-1', clientProfileId: 'client-1', clientDisplayName: undefined, rating: 5 },
    ]
    docStore['clientProfiles/client-1'] = { userId: 'user-1' }
    docStore['users/user-1'] = { displayName: 'דנה לוי' }
    const res = await GET(makeRequest(), mockParams)
    const json = await res.json()
    expect(json.data.reviews[0].clientDisplayName).toBe('דנה לוי')
  })

  it('falls back to an empty string when nothing can be resolved', async () => {
    collectionStore.reviews = [
      { __id: 'review-1', clientProfileId: 'client-1', clientDisplayName: '', rating: 5 },
    ]
    docStore['clientProfiles/client-1'] = { userId: 'user-1' }
    docStore['users/user-1'] = {}
    const res = await GET(makeRequest(), mockParams)
    const json = await res.json()
    expect(json.data.reviews[0].clientDisplayName).toBe('')
  })
})
