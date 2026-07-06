/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const collectionStore: Record<string, (Record<string, unknown> & { __id: string })[]> = {}

function makeChainableWhere(name: string) {
  return {
    where: jest.fn().mockImplementation((field: string, _op: string, value: unknown) => {
      const filtered = (collectionStore[name] ?? []).filter(d => d[field] === value)
      return {
        get: jest.fn().mockResolvedValue({
          empty: filtered.length === 0,
          docs: filtered.map(d => ({ id: d.__id, data: () => d })),
        }),
      }
    }),
  }
}

const mockDb = {
  collection: jest.fn((name: string) => makeChainableWhere(name)),
}

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: jest.fn(() => mockDb),
}))

import { GET } from '@/app/api/nailists/[id]/availability/batch/route'
import { israelWallClockToUtc } from '@/lib/booking-utils'

function makeRequest(
  nailistId: string,
  params: { from?: string; days?: string; durationMinutes?: string } = {}
): [NextRequest, { params: Promise<{ id: string }> }] {
  const sp = new URLSearchParams()
  if (params.from) sp.set('from', params.from)
  if (params.days) sp.set('days', params.days)
  if (params.durationMinutes) sp.set('durationMinutes', params.durationMinutes)
  const url = `http://localhost/api/nailists/${nailistId}/availability/batch?${sp.toString()}`
  const req = new NextRequest(url, { method: 'GET' })
  return [req, { params: Promise.resolve({ id: nailistId }) }]
}

describe('GET /api/nailists/[id]/availability/batch', () => {
  // Fixtures below hardcode 2026-07-06 as "today" (a Monday) with slots
  // starting at 09:00 — pin the real clock well before that so the route's
  // already-elapsed-time filter never kicks in regardless of when this suite
  // actually runs (it previously broke the instant the real calendar caught
  // up to this fixture date).
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-06T06:00:00+03:00'))
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    collectionStore['workingHours'] = []
    collectionStore['appointments'] = []
  })

  it('returns 400 when from param is missing', async () => {
    const [req, ctx] = makeRequest('nailist-1', { days: '7' })
    const res = await GET(req, ctx)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('from')
  })

  it('returns 400 when from is invalid date format', async () => {
    const [req, ctx] = makeRequest('nailist-1', { from: '07-01-2026' })
    const res = await GET(req, ctx)
    expect(res.status).toBe(400)
  })

  it('returns a map of dates when no working hours exist (all non-working)', async () => {
    const [req, ctx] = makeRequest('nailist-1', { from: '2026-07-01', days: '3' })
    const res = await GET(req, ctx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data['2026-07-01']).toEqual({ workingDay: false, fullyBooked: false })
    expect(json.data['2026-07-02']).toEqual({ workingDay: false, fullyBooked: false })
    expect(json.data['2026-07-03']).toEqual({ workingDay: false, fullyBooked: false })
  })

  it('returns correct number of dates for given days param', async () => {
    const [req, ctx] = makeRequest('nailist-1', { from: '2026-07-01', days: '5' })
    const res = await GET(req, ctx)
    const json = await res.json()
    expect(Object.keys(json.data)).toHaveLength(5)
  })

  it('defaults to 21 days when days param is omitted', async () => {
    const [req, ctx] = makeRequest('nailist-1', { from: '2026-07-01' })
    const res = await GET(req, ctx)
    const json = await res.json()
    expect(Object.keys(json.data)).toHaveLength(21)
  })

  it('caps days at 180 even when larger value requested', async () => {
    const [req, ctx] = makeRequest('nailist-1', { from: '2026-01-01', days: '500' })
    const res = await GET(req, ctx)
    const json = await res.json()
    expect(Object.keys(json.data)).toHaveLength(180)
  })

  it('marks days with working hours as workingDay: true', async () => {
    // 2026-07-06 is Monday (dayOfWeek=1)
    collectionStore['workingHours'] = [
      { __id: 'wh-1', nailistProfileId: 'nailist-1', dayOfWeek: 1, isActive: true, startTime: '09:00', endTime: '18:00' },
    ]
    const [req, ctx] = makeRequest('nailist-1', { from: '2026-07-06', days: '1' })
    const res = await GET(req, ctx)
    const json = await res.json()
    expect(json.data['2026-07-06'].workingDay).toBe(true)
  })

  it('marks days with isActive=false as workingDay: false', async () => {
    collectionStore['workingHours'] = [
      { __id: 'wh-1', nailistProfileId: 'nailist-1', dayOfWeek: 1, isActive: false, startTime: '09:00', endTime: '18:00' },
    ]
    const [req, ctx] = makeRequest('nailist-1', { from: '2026-07-06', days: '1' })
    const res = await GET(req, ctx)
    const json = await res.json()
    expect(json.data['2026-07-06'].workingDay).toBe(false)
  })

  it('marks fullyBooked: true when all slots on a working day are taken', async () => {
    // dayOfWeek for 2026-07-06 = 1 (Monday); only 1 hour slot from 09:00–10:00
    collectionStore['workingHours'] = [
      { __id: 'wh-1', nailistProfileId: 'nailist-1', dayOfWeek: 1, isActive: true, startTime: '09:00', endTime: '10:00' },
    ]
    collectionStore['appointments'] = [
      {
        __id: 'apt-1',
        nailistProfileId: 'nailist-1',
        status: 'CONFIRMED',
        startTime: { toDate: () => israelWallClockToUtc('2026-07-06', '09:00') },
        endTime: { toDate: () => israelWallClockToUtc('2026-07-06', '10:00') },
      },
    ]
    const [req, ctx] = makeRequest('nailist-1', { from: '2026-07-06', days: '1', durationMinutes: '60' })
    const res = await GET(req, ctx)
    const json = await res.json()
    expect(json.data['2026-07-06'].fullyBooked).toBe(true)
  })

  it('ignores CANCELLED and COMPLETED appointments for fully-booked check', async () => {
    collectionStore['workingHours'] = [
      { __id: 'wh-1', nailistProfileId: 'nailist-1', dayOfWeek: 1, isActive: true, startTime: '09:00', endTime: '10:00' },
    ]
    collectionStore['appointments'] = [
      {
        __id: 'apt-1',
        nailistProfileId: 'nailist-1',
        status: 'CANCELLED',
        startTime: { toDate: () => israelWallClockToUtc('2026-07-06', '09:00') },
        endTime: { toDate: () => israelWallClockToUtc('2026-07-06', '10:00') },
      },
    ]
    const [req, ctx] = makeRequest('nailist-1', { from: '2026-07-06', days: '1', durationMinutes: '60' })
    const res = await GET(req, ctx)
    const json = await res.json()
    expect(json.data['2026-07-06'].fullyBooked).toBe(false)
  })

  it('returns consecutive date keys starting from the from date', async () => {
    const [req, ctx] = makeRequest('nailist-1', { from: '2026-07-01', days: '3' })
    const res = await GET(req, ctx)
    const json = await res.json()
    const keys = Object.keys(json.data).sort()
    expect(keys).toEqual(['2026-07-01', '2026-07-02', '2026-07-03'])
  })
})
