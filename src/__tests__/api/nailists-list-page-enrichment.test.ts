/**
 * @jest-environment node
 *
 * GET /api/nailists returns one page (default 24) but used to enrich the whole
 * matching set first: service names, working hours, appointments and
 * availability overrides were read for every match on the geo and text-query
 * paths, then all but the page was thrown away. With 30 matching nailists and a
 * page of 5, that was six times the Firestore reads the response needed.
 *
 * These tests pin the enrichment to the returned page. They assert on the
 * `in` filters the route issues, since that is where the per-nailist cost lives.
 */
import { NextRequest } from 'next/server'

type DocData = Record<string, unknown> & { __id: string }
const collectionStore: Record<string, DocData[]> = {}
const inFilters: Array<{ collection: string; ids: string[] }> = []

interface CollectionRef {
  where: jest.Mock
  orderBy: jest.Mock
  limit: jest.Mock
  get: jest.Mock
}

function makeCollectionRef(name: string): CollectionRef {
  const ref: CollectionRef = {
    where: jest.fn((field: string, op: string, value: unknown) => {
      if (op === 'in' && Array.isArray(value)) {
        inFilters.push({ collection: name, ids: value as string[] })
      }
      return ref
    }),
    orderBy: jest.fn(() => ref),
    limit: jest.fn(() => ref),
    get: jest.fn().mockResolvedValue({
      docs: (collectionStore[name] ?? []).map((d) => ({
        id: d.__id,
        data: () => (name === 'nailistProfiles' ? { userId: d.userId ?? d.__id, ...d } : d),
      })),
    }),
  }
  return ref
}

const mockDb = { collection: jest.fn((name: string) => makeCollectionRef(name)) }
const getUsersMock = jest.fn()

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
    getUsers: (...args: unknown[]) => getUsersMock(...args),
  })),
  adminDb: jest.fn(() => mockDb),
}))

import { GET } from '@/app/api/nailists/route'

const TEL_AVIV: [number, number] = [32.0853, 34.7818]

function makeRequest(searchParams: string): NextRequest {
  return new NextRequest(`http://localhost/api/nailists?${searchParams}`, { method: 'GET' })
}

function idsQueriedAgainst(collection: string): string[] {
  return [...new Set(inFilters.filter((f) => f.collection === collection).flatMap((f) => f.ids))]
}

function seedNailists(count: number) {
  collectionStore['nailistProfiles'] = Array.from({ length: count }, (_, i) => ({
    __id: `nailist-${String(i + 1).padStart(2, '0')}`,
    businessName: `סטודיו ${i + 1}`,
    isActive: true,
    // Same point as the search centre, so every seeded profile is inside the
    // radius and the geo path has a full set to narrow down.
    latitude: TEL_AVIV[0],
    longitude: TEL_AVIV[1],
    geohash: 'sv8wrfoz',
  }))
  collectionStore['services'] = []
  collectionStore['workingHours'] = []
  collectionStore['appointments'] = []
  collectionStore['availabilityOverrides'] = []
}

beforeEach(() => {
  jest.clearAllMocks()
  inFilters.length = 0
  seedNailists(30)
  getUsersMock.mockImplementation(async (identifiers: Array<{ uid: string }>) => ({
    users: identifiers.map(({ uid }) => ({ uid, emailVerified: true })),
  }))
})

describe('GET /api/nailists — enrichment is limited to the returned page', () => {
  it('reads availability only for the page on the unfiltered path', async () => {
    const res = await GET(makeRequest('pageSize=5&offset=0&date=2026-09-20'))
    const json = await res.json()

    expect(json.data).toHaveLength(5)
    expect(json.total).toBe(30)
    expect(json.hasMore).toBe(true)

    const pageIds = json.data.map((n: { id: string }) => n.id)
    expect(idsQueriedAgainst('workingHours')).toEqual(pageIds)
    expect(idsQueriedAgainst('appointments')).toEqual(pageIds)
    expect(idsQueriedAgainst('availabilityOverrides')).toEqual(pageIds)
  })

  it('reads availability only for the page on the geo path', async () => {
    const res = await GET(
      makeRequest(`lat=${TEL_AVIV[0]}&lng=${TEL_AVIV[1]}&radius=30&pageSize=5&offset=0&date=2026-09-20`)
    )
    const json = await res.json()

    expect(json.data).toHaveLength(5)
    expect(json.total).toBe(30)

    const pageIds = json.data.map((n: { id: string }) => n.id)
    expect(idsQueriedAgainst('workingHours')).toEqual(pageIds)
    expect(idsQueriedAgainst('appointments')).toEqual(pageIds)
    expect(idsQueriedAgainst('availabilityOverrides')).toEqual(pageIds)
  })

  it('reads availability only for the page on the text-query path', async () => {
    const res = await GET(makeRequest('query=סטודיו&pageSize=5&offset=0&date=2026-09-20'))
    const json = await res.json()

    expect(json.data).toHaveLength(5)
    expect(json.total).toBe(30)

    const pageIds = json.data.map((n: { id: string }) => n.id)
    expect(idsQueriedAgainst('workingHours')).toEqual(pageIds)
    expect(idsQueriedAgainst('appointments')).toEqual(pageIds)
    expect(idsQueriedAgainst('availabilityOverrides')).toEqual(pageIds)
  })

  it('still resolves service names across the whole set when they drive a filter', async () => {
    // Filtering by service reads serviceNames, so narrowing that read to the
    // page first would filter the wrong rows and drop real matches.
    collectionStore['services'] = collectionStore['nailistProfiles'].map((n) => ({
      __id: `svc-${n.__id}`,
      nailistProfileId: n.__id,
      name: 'לק ג׳ל',
      price: 120,
      isActive: true,
    }))

    const res = await GET(makeRequest('service=לק ג׳ל&pageSize=5&offset=0'))
    const json = await res.json()

    expect(json.total).toBe(30)
    expect(idsQueriedAgainst('services')).toHaveLength(30)
  })

  it('serves a later page without enriching the earlier ones', async () => {
    const res = await GET(makeRequest('pageSize=5&offset=25&date=2026-09-20'))
    const json = await res.json()

    expect(json.data).toHaveLength(5)
    expect(json.hasMore).toBe(false)

    const pageIds = json.data.map((n: { id: string }) => n.id)
    expect(pageIds).toEqual([
      'nailist-26', 'nailist-27', 'nailist-28', 'nailist-29', 'nailist-30',
    ])
    expect(idsQueriedAgainst('workingHours')).toEqual(pageIds)
  })
})
