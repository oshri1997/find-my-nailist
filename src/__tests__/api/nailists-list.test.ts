/**
 * @jest-environment node
 *
 * Covers the bugfix where the unauthenticated search/list endpoint
 * GET /api/nailists leaked contact info (whatsappPhone/instagramUrl/tiktokUrl/
 * phoneNumber/email/address/userId) for every returned nailist, bypassing the
 * login gate enforced on GET /api/nailists/[id].
 */
import { NextRequest } from 'next/server'

type DocData = Record<string, unknown> & { __id: string }
const collectionStore: Record<string, DocData[]> = {}

function makeCollectionRef(name: string) {
  return {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      docs: (collectionStore[name] ?? []).map((d) => ({ id: d.__id, data: () => d })),
    }),
  }
}

const mockDb = { collection: jest.fn((name: string) => makeCollectionRef(name)) }
const verifyIdTokenMock = jest.fn()

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({ verifyIdToken: (...args: unknown[]) => verifyIdTokenMock(...args) })),
  adminDb: jest.fn(() => mockDb),
}))

import { GET } from '@/app/api/nailists/route'

function makeRequest(cookie?: string, searchParams?: string): NextRequest {
  const url = `http://localhost/api/nailists${searchParams ? `?${searchParams}` : ''}`
  const req = new NextRequest(url, { method: 'GET' })
  if (cookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (name: string) => (name === 'auth-token' ? { value: cookie } : undefined) }),
    })
  }
  return req
}

describe('GET /api/nailists — contact info gating on list results', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    verifyIdTokenMock.mockResolvedValue({ uid: 'some-user' })
    collectionStore['nailistProfiles'] = [{
      __id: 'nailist-1',
      businessName: 'סטודיו יופי',
      isActive: true,
      whatsappPhone: '+972501234567',
      instagramUrl: 'https://instagram.com/studio',
      tiktokUrl: 'https://tiktok.com/@studio',
      phoneNumber: '0501234567',
      email: 'owner@example.com',
      address: 'הרצל 1, תל אביב',
      userId: 'firebase-uid-secret',
    }]
    collectionStore['services'] = []
  })

  it('strips contact fields from every result for anonymous callers', async () => {
    const res = await GET(makeRequest())
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0].businessName).toBe('סטודיו יופי')
    expect(json.data[0].whatsappPhone).toBeUndefined()
    expect(json.data[0].instagramUrl).toBeUndefined()
    expect(json.data[0].tiktokUrl).toBeUndefined()
    expect(json.data[0].phoneNumber).toBeUndefined()
    expect(json.data[0].email).toBeUndefined()
    expect(json.data[0].address).toBeUndefined()
    expect(json.data[0].userId).toBeUndefined()
    expect(json.data[0].hasContactInfo).toBe(true)
  })

  it('includes contact fields for authenticated callers', async () => {
    const res = await GET(makeRequest('valid-token'))
    const json = await res.json()
    expect(json.data[0].whatsappPhone).toBe('+972501234567')
    expect(json.data[0].email).toBe('owner@example.com')
  })

  it('strips contact fields when the auth token is invalid', async () => {
    verifyIdTokenMock.mockRejectedValue(new Error('invalid'))
    const res = await GET(makeRequest('bad-token'))
    const json = await res.json()
    expect(json.data[0].whatsappPhone).toBeUndefined()
  })
})

describe('GET /api/nailists — pagination (no location)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    verifyIdTokenMock.mockResolvedValue({ uid: 'some-user' })
    collectionStore['nailistProfiles'] = Array.from({ length: 15 }, (_, i) => ({
      __id: `nailist-${i}`,
      businessName: `סטודיו ${i}`,
      isActive: true,
    }))
    collectionStore['services'] = []
  })

  it('defaults to a page of 12 with hasMore: true when more results exist', async () => {
    const res = await GET(makeRequest())
    const json = await res.json()
    expect(json.data).toHaveLength(12)
    expect(json.hasMore).toBe(true)
  })

  it('returns the next page via offset, with hasMore: false once exhausted', async () => {
    const res = await GET(makeRequest(undefined, 'offset=12'))
    const json = await res.json()
    expect(json.data).toHaveLength(3)
    expect(json.hasMore).toBe(false)
  })

  it('returns an empty page with hasMore: false when offset exceeds the result count', async () => {
    const res = await GET(makeRequest(undefined, 'offset=100'))
    const json = await res.json()
    expect(json.data).toHaveLength(0)
    expect(json.hasMore).toBe(false)
  })

  it('respects a custom pageSize', async () => {
    const res = await GET(makeRequest(undefined, 'pageSize=5'))
    const json = await res.json()
    expect(json.data).toHaveLength(5)
    expect(json.hasMore).toBe(true)
  })

  it('sorts by a deterministic field so repeated "load more" calls cannot duplicate or skip results', async () => {
    await GET(makeRequest())
    const profileRefs = mockDb.collection.mock.results
      .filter((r, i) => mockDb.collection.mock.calls[i][0] === 'nailistProfiles')
      .map((r) => r.value)
    expect(profileRefs.some((ref) => ref.orderBy.mock.calls.length > 0)).toBe(true)
  })
})

describe('GET /api/nailists — minPrice', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    verifyIdTokenMock.mockResolvedValue({ uid: 'some-user' })
  })

  it('attaches the lowest active service price for a nailist', async () => {
    collectionStore['nailistProfiles'] = [{ __id: 'n1', businessName: 'סטודיו א', isActive: true }]
    collectionStore['services'] = [
      { __id: 's1', nailistProfileId: 'n1', name: 'מניקור', isActive: true, price: 150 },
      { __id: 's2', nailistProfileId: 'n1', name: "ג'ל", isActive: true, price: 90 },
      { __id: 's3', nailistProfileId: 'n1', name: 'פדיקור', isActive: true, price: 200 },
    ]

    const res = await GET(makeRequest())
    const json = await res.json()
    expect(json.data[0].minPrice).toBe(90)
  })

  it('ignores inactive services when computing minPrice', async () => {
    collectionStore['nailistProfiles'] = [{ __id: 'n1', businessName: 'סטודיו א', isActive: true }]
    collectionStore['services'] = [
      { __id: 's1', nailistProfileId: 'n1', name: 'מניקור', isActive: true, price: 150 },
      { __id: 's2', nailistProfileId: 'n1', name: 'מבצע ישן', isActive: false, price: 10 },
    ]

    const res = await GET(makeRequest())
    const json = await res.json()
    expect(json.data[0].minPrice).toBe(150)
  })

  it('returns null when the nailist has no active services', async () => {
    collectionStore['nailistProfiles'] = [{ __id: 'n1', businessName: 'סטודיו א', isActive: true }]
    collectionStore['services'] = []

    const res = await GET(makeRequest())
    const json = await res.json()
    expect(json.data[0].minPrice).toBeNull()
  })

  it('computes minPrice independently per nailist', async () => {
    collectionStore['nailistProfiles'] = [
      { __id: 'n1', businessName: 'סטודיו א', isActive: true },
      { __id: 'n2', businessName: 'סטודיו ב', isActive: true },
    ]
    collectionStore['services'] = [
      { __id: 's1', nailistProfileId: 'n1', name: 'מניקור', isActive: true, price: 150 },
      { __id: 's2', nailistProfileId: 'n2', name: 'מניקור', isActive: true, price: 80 },
    ]

    const res = await GET(makeRequest())
    const json = await res.json()
    const byId = Object.fromEntries(json.data.map((n: { id: string; minPrice: unknown }) => [n.id, n.minPrice]))
    expect(byId['n1']).toBe(150)
    expect(byId['n2']).toBe(80)
  })
})

describe('GET /api/nailists — nextAvailableSlot', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    // 2026-06-10 is a Wednesday (dayOfWeek 3), 08:00 Israel time (before opening)
    jest.setSystemTime(new Date('2026-06-10T05:00:00.000Z'))
    verifyIdTokenMock.mockResolvedValue({ uid: 'some-user' })
  })

  afterEach(() => jest.useRealTimers())

  it('attaches the first open slot for a nailist working today with nothing booked', async () => {
    collectionStore['nailistProfiles'] = [{ __id: 'n1', businessName: 'סטודיו א', isActive: true }]
    collectionStore['services'] = []
    collectionStore['workingHours'] = [
      { __id: 'wh1', nailistProfileId: 'n1', dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isActive: true },
    ]
    collectionStore['appointments'] = []

    const res = await GET(makeRequest())
    const json = await res.json()
    expect(json.data[0].nextAvailableSlot).toEqual({ date: '2026-06-10', time: '09:00' })
  })

  it('skips a booked slot and returns the next open one', async () => {
    collectionStore['nailistProfiles'] = [{ __id: 'n1', businessName: 'סטודיו א', isActive: true }]
    collectionStore['services'] = []
    collectionStore['workingHours'] = [
      { __id: 'wh1', nailistProfileId: 'n1', dayOfWeek: 3, startTime: '09:00', endTime: '11:00', isActive: true },
    ]
    collectionStore['appointments'] = [{
      __id: 'a1',
      nailistProfileId: 'n1',
      status: 'CONFIRMED',
      startTime: '2026-06-10T06:00:00.000Z', // 09:00 Israel
      endTime: '2026-06-10T07:00:00.000Z',   // 10:00 Israel
    }]

    const res = await GET(makeRequest())
    const json = await res.json()
    expect(json.data[0].nextAvailableSlot).toEqual({ date: '2026-06-10', time: '10:00' })
  })

  it('ignores CANCELLED appointments when computing the next slot', async () => {
    collectionStore['nailistProfiles'] = [{ __id: 'n1', businessName: 'סטודיו א', isActive: true }]
    collectionStore['services'] = []
    collectionStore['workingHours'] = [
      { __id: 'wh1', nailistProfileId: 'n1', dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isActive: true },
    ]
    collectionStore['appointments'] = [{
      __id: 'a1',
      nailistProfileId: 'n1',
      status: 'CANCELLED',
      startTime: '2026-06-10T06:00:00.000Z',
      endTime: '2026-06-10T07:00:00.000Z',
    }]

    const res = await GET(makeRequest())
    const json = await res.json()
    expect(json.data[0].nextAvailableSlot).toEqual({ date: '2026-06-10', time: '09:00' })
  })

  it('returns null when the nailist has no working hours set up', async () => {
    collectionStore['nailistProfiles'] = [{ __id: 'n1', businessName: 'סטודיו א', isActive: true }]
    collectionStore['services'] = []
    collectionStore['workingHours'] = []
    collectionStore['appointments'] = []

    const res = await GET(makeRequest())
    const json = await res.json()
    expect(json.data[0].nextAvailableSlot).toBeNull()
  })

  it('computes independent slots per nailist', async () => {
    collectionStore['nailistProfiles'] = [
      { __id: 'n1', businessName: 'סטודיו א', isActive: true },
      { __id: 'n2', businessName: 'סטודיו ב', isActive: true },
    ]
    collectionStore['services'] = []
    collectionStore['workingHours'] = [
      { __id: 'wh1', nailistProfileId: 'n1', dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isActive: true },
      { __id: 'wh2', nailistProfileId: 'n2', dayOfWeek: 3, startTime: '12:00', endTime: '18:00', isActive: true },
    ]
    collectionStore['appointments'] = []

    const res = await GET(makeRequest())
    const json = await res.json()
    const byId = Object.fromEntries(json.data.map((n: { id: string; nextAvailableSlot: unknown }) => [n.id, n.nextAvailableSlot]))
    expect(byId['n1']).toEqual({ date: '2026-06-10', time: '09:00' })
    expect(byId['n2']).toEqual({ date: '2026-06-10', time: '12:00' })
  })
})

describe('GET /api/nailists — availableOnDate (date filter param)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    // 2026-06-10 is a Wednesday (dayOfWeek 3), 08:00 Israel time (before opening)
    jest.setSystemTime(new Date('2026-06-10T05:00:00.000Z'))
    verifyIdTokenMock.mockResolvedValue({ uid: 'some-user' })
  })

  afterEach(() => jest.useRealTimers())

  it('does not attach availableOnDate when no date param is passed', async () => {
    collectionStore['nailistProfiles'] = [{ __id: 'n1', businessName: 'סטודיו א', isActive: true }]
    collectionStore['services'] = []
    collectionStore['workingHours'] = [
      { __id: 'wh1', nailistProfileId: 'n1', dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isActive: true },
    ]
    collectionStore['appointments'] = []

    const res = await GET(makeRequest())
    const json = await res.json()
    expect(json.data[0].availableOnDate).toBeUndefined()
  })

  it('marks a nailist available on a date with open working hours and no bookings', async () => {
    collectionStore['nailistProfiles'] = [{ __id: 'n1', businessName: 'סטודיו א', isActive: true }]
    collectionStore['services'] = []
    collectionStore['workingHours'] = [
      { __id: 'wh1', nailistProfileId: 'n1', dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isActive: true },
    ]
    collectionStore['appointments'] = []

    const res = await GET(makeRequest(undefined, 'date=2026-06-10'))
    const json = await res.json()
    expect(json.data[0].availableOnDate).toBe(true)
  })

  it('marks a nailist unavailable on a date the nailist does not work', async () => {
    collectionStore['nailistProfiles'] = [{ __id: 'n1', businessName: 'סטודיו א', isActive: true }]
    collectionStore['services'] = []
    // Only works Wednesdays (dayOfWeek 3) — 2026-06-11 is a Thursday (dayOfWeek 4)
    collectionStore['workingHours'] = [
      { __id: 'wh1', nailistProfileId: 'n1', dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isActive: true },
    ]
    collectionStore['appointments'] = []

    const res = await GET(makeRequest(undefined, 'date=2026-06-11'))
    const json = await res.json()
    expect(json.data[0].availableOnDate).toBe(false)
  })

  it('marks a nailist unavailable when the whole day is fully booked', async () => {
    collectionStore['nailistProfiles'] = [{ __id: 'n1', businessName: 'סטודיו א', isActive: true }]
    collectionStore['services'] = []
    collectionStore['workingHours'] = [
      { __id: 'wh1', nailistProfileId: 'n1', dayOfWeek: 3, startTime: '09:00', endTime: '10:00', isActive: true },
    ]
    collectionStore['appointments'] = [{
      __id: 'a1',
      nailistProfileId: 'n1',
      status: 'CONFIRMED',
      startTime: '2026-06-10T06:00:00.000Z', // 09:00 Israel
      endTime: '2026-06-10T07:00:00.000Z',   // 10:00 Israel
    }]

    const res = await GET(makeRequest(undefined, 'date=2026-06-10'))
    const json = await res.json()
    expect(json.data[0].availableOnDate).toBe(false)
  })

  it('computes availableOnDate independently per nailist', async () => {
    collectionStore['nailistProfiles'] = [
      { __id: 'n1', businessName: 'סטודיו א', isActive: true },
      { __id: 'n2', businessName: 'סטודיו ב', isActive: true },
    ]
    collectionStore['services'] = []
    collectionStore['workingHours'] = [
      { __id: 'wh1', nailistProfileId: 'n1', dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isActive: true },
    ]
    collectionStore['appointments'] = []

    const res = await GET(makeRequest(undefined, 'date=2026-06-10'))
    const json = await res.json()
    const byId = Object.fromEntries(json.data.map((n: { id: string; availableOnDate: unknown }) => [n.id, n.availableOnDate]))
    expect(byId['n1']).toBe(true)
    expect(byId['n2']).toBe(false)
  })
})
