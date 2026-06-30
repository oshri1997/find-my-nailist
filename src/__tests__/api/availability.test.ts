/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const collectionStore: Record<string, (Record<string, unknown> & { __id: string })[]> = {}

function makeChainableWhere(name: string) {
  function makeWhere(initialFiltered: (Record<string, unknown> & { __id: string })[]) {
    return {
      where: jest.fn().mockImplementation((field: string, _op: string, value: unknown) => {
        const filtered = initialFiltered.filter(d => d[field] === value)
        return makeWhere(filtered)
      }),
      limit: jest.fn().mockImplementation(() => ({
        get: jest.fn().mockResolvedValue({
          empty: initialFiltered.length === 0,
          docs: initialFiltered.map(d => ({ id: d.__id, data: () => d })),
        }),
      })),
      get: jest.fn().mockResolvedValue({
        empty: initialFiltered.length === 0,
        docs: initialFiltered.map(d => ({ id: d.__id, data: () => d })),
      }),
    }
  }
  return {
    where: jest.fn().mockImplementation((field: string, _op: string, value: unknown) => {
      const filtered = (collectionStore[name] ?? []).filter(d => d[field] === value)
      return makeWhere(filtered)
    }),
  }
}

const mockDb = {
  collection: jest.fn((name: string) => makeChainableWhere(name)),
}

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: jest.fn(() => mockDb),
}))

import { GET } from '@/app/api/nailists/[id]/availability/route'

function makeRequest(nailistId: string, date?: string): [NextRequest, { params: Promise<{ id: string }> }] {
  const url = `http://localhost/api/nailists/${nailistId}/availability${date ? `?date=${date}` : ''}`
  const req = new NextRequest(url, { method: 'GET' })
  const params = { params: Promise.resolve({ id: nailistId }) }
  return [req, params]
}

describe('GET /api/nailists/[id]/availability', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    collectionStore['workingHours'] = []
    collectionStore['appointments'] = []
  })

  it('returns 400 when date param is missing', async () => {
    const [req, ctx] = makeRequest('nailist-1')
    const res = await GET(req, ctx)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('date')
  })

  it('returns 400 when date format is invalid', async () => {
    const [req, ctx] = makeRequest('nailist-1', '01-07-2026')
    const res = await GET(req, ctx)
    expect(res.status).toBe(400)
  })

  it('returns 400 for partial date string', async () => {
    const [req, ctx] = makeRequest('nailist-1', '2026-07')
    const res = await GET(req, ctx)
    expect(res.status).toBe(400)
  })

  it('returns {workingDay: false, bookedSlots: []} when no working hours doc for that day', async () => {
    const [req, ctx] = makeRequest('nailist-1', '2026-07-06') // Monday
    const res = await GET(req, ctx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.workingDay).toBe(false)
    expect(json.data.bookedSlots).toEqual([])
  })

  it('returns {workingDay: false} when day entry exists but isActive=false', async () => {
    // 2026-07-06 is a Monday (dayOfWeek=1)
    collectionStore['workingHours'] = [
      { __id: 'wh-1', nailistProfileId: 'nailist-1', dayOfWeek: 1, isActive: false, startTime: '09:00', endTime: '18:00' },
    ]
    const [req, ctx] = makeRequest('nailist-1', '2026-07-06')
    const res = await GET(req, ctx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.workingDay).toBe(false)
  })

  it('returns working day info with empty bookedSlots when no appointments', async () => {
    collectionStore['workingHours'] = [
      { __id: 'wh-1', nailistProfileId: 'nailist-1', dayOfWeek: 1, isActive: true, startTime: '09:00', endTime: '18:00' },
    ]
    const [req, ctx] = makeRequest('nailist-1', '2026-07-06')
    const res = await GET(req, ctx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.workingDay).toBe(true)
    expect(json.data.startTime).toBe('09:00')
    expect(json.data.endTime).toBe('18:00')
    expect(json.data.bookedSlots).toEqual([])
  })

  it('returns booked slots for PENDING and CONFIRMED appointments on that day', async () => {
    collectionStore['workingHours'] = [
      { __id: 'wh-1', nailistProfileId: 'nailist-1', dayOfWeek: 1, isActive: true, startTime: '09:00', endTime: '18:00' },
    ]
    const start = new Date('2026-07-06T10:00:00')
    const end = new Date('2026-07-06T11:00:00')
    collectionStore['appointments'] = [
      {
        __id: 'apt-1',
        nailistProfileId: 'nailist-1',
        status: 'CONFIRMED',
        startTime: { toDate: () => start },
        endTime: { toDate: () => end },
      },
    ]
    const [req, ctx] = makeRequest('nailist-1', '2026-07-06')
    const res = await GET(req, ctx)
    const json = await res.json()
    expect(json.data.bookedSlots).toHaveLength(1)
    expect(json.data.bookedSlots[0].startTime).toBe(start.toISOString())
  })

  it('excludes CANCELLED appointments from bookedSlots', async () => {
    collectionStore['workingHours'] = [
      { __id: 'wh-1', nailistProfileId: 'nailist-1', dayOfWeek: 1, isActive: true, startTime: '09:00', endTime: '18:00' },
    ]
    const start = new Date('2026-07-06T10:00:00')
    const end = new Date('2026-07-06T11:00:00')
    collectionStore['appointments'] = [
      { __id: 'apt-1', nailistProfileId: 'nailist-1', status: 'CANCELLED', startTime: { toDate: () => start }, endTime: { toDate: () => end } },
    ]
    const [req, ctx] = makeRequest('nailist-1', '2026-07-06')
    const res = await GET(req, ctx)
    const json = await res.json()
    expect(json.data.bookedSlots).toEqual([])
  })

  it('excludes COMPLETED appointments from bookedSlots', async () => {
    collectionStore['workingHours'] = [
      { __id: 'wh-1', nailistProfileId: 'nailist-1', dayOfWeek: 1, isActive: true, startTime: '09:00', endTime: '18:00' },
    ]
    const start = new Date('2026-07-06T10:00:00')
    const end = new Date('2026-07-06T11:00:00')
    collectionStore['appointments'] = [
      { __id: 'apt-1', nailistProfileId: 'nailist-1', status: 'COMPLETED', startTime: { toDate: () => start }, endTime: { toDate: () => end } },
    ]
    const [req, ctx] = makeRequest('nailist-1', '2026-07-06')
    const res = await GET(req, ctx)
    const json = await res.json()
    expect(json.data.bookedSlots).toEqual([])
  })

  it('excludes appointments on different days', async () => {
    collectionStore['workingHours'] = [
      { __id: 'wh-1', nailistProfileId: 'nailist-1', dayOfWeek: 1, isActive: true, startTime: '09:00', endTime: '18:00' },
    ]
    const start = new Date('2026-07-07T10:00:00') // Tuesday, not Monday
    const end = new Date('2026-07-07T11:00:00')
    collectionStore['appointments'] = [
      { __id: 'apt-1', nailistProfileId: 'nailist-1', status: 'CONFIRMED', startTime: { toDate: () => start }, endTime: { toDate: () => end } },
    ]
    const [req, ctx] = makeRequest('nailist-1', '2026-07-06')
    const res = await GET(req, ctx)
    const json = await res.json()
    expect(json.data.bookedSlots).toEqual([])
  })

  it('includes both PENDING and CONFIRMED in bookedSlots', async () => {
    collectionStore['workingHours'] = [
      { __id: 'wh-1', nailistProfileId: 'nailist-1', dayOfWeek: 1, isActive: true, startTime: '09:00', endTime: '18:00' },
    ]
    collectionStore['appointments'] = [
      { __id: 'apt-1', nailistProfileId: 'nailist-1', status: 'PENDING', startTime: { toDate: () => new Date('2026-07-06T09:00:00') }, endTime: { toDate: () => new Date('2026-07-06T10:00:00') } },
      { __id: 'apt-2', nailistProfileId: 'nailist-1', status: 'CONFIRMED', startTime: { toDate: () => new Date('2026-07-06T11:00:00') }, endTime: { toDate: () => new Date('2026-07-06T12:00:00') } },
    ]
    const [req, ctx] = makeRequest('nailist-1', '2026-07-06')
    const res = await GET(req, ctx)
    const json = await res.json()
    expect(json.data.bookedSlots).toHaveLength(2)
  })
})
