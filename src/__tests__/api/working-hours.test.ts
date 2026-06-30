/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockBatchSet = jest.fn()
const mockBatchUpdate = jest.fn()
const mockBatchCommit = jest.fn().mockResolvedValue(undefined)

const docStore: Record<string, Record<string, unknown>> = {}
const collectionStore: Record<string, (Record<string, unknown> & { __id: string })[]> = {}

function makeDocRef(collection: string, id: string) {
  return {
    get: jest.fn().mockResolvedValue({
      exists: !!docStore[`${collection}/${id}`],
      data: () => docStore[`${collection}/${id}`],
      id,
      ref: { update: jest.fn() },
    }),
  }
}

function makeCollectionRef(name: string) {
  return {
    doc: (id?: string) => {
      if (id === undefined) {
        return { id: 'new-doc', set: jest.fn(), update: jest.fn() }
      }
      return makeDocRef(name, id)
    },
    add: jest.fn().mockResolvedValue({ id: 'new-doc' }),
    where: jest.fn().mockImplementation((field: string, _op: string, value: unknown) => {
      const filtered = (collectionStore[name] ?? []).filter(d => d[field] === value)
      return {
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: filtered.length === 0,
          docs: filtered.map(d => ({
            id: d.__id,
            data: () => d,
            ref: { update: mockBatchUpdate },
          })),
        }),
        where: jest.fn().mockImplementation((_f2: string, _o2: string, _v2: unknown) => ({
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
        })),
      }
    }),
  }
}

const mockDb = {
  collection: jest.fn((name: string) => makeCollectionRef(name)),
  batch: jest.fn(() => ({
    set: mockBatchSet,
    update: mockBatchUpdate,
    commit: mockBatchCommit,
  })),
}

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'nailist-user-1' }),
  })),
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

import { GET, PUT } from '@/app/api/working-hours/route'

function makeRequest(method: string, body?: unknown, withCookie = true): NextRequest {
  const url = 'http://localhost/api/working-hours'
  const req = new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
  })
  if (withCookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (n: string) => n === 'auth-token' ? { value: 'valid-token' } : undefined }),
    })
  }
  return req
}

describe('GET /api/working-hours', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    collectionStore['nailistProfiles'] = [
      { __id: 'nailist-profile-1', userId: 'nailist-user-1' },
    ]
    collectionStore['workingHours'] = []
  })

  it('returns 401 when no auth cookie', async () => {
    const req = makeRequest('GET', undefined, false)
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when no nailist profile found', async () => {
    collectionStore['nailistProfiles'] = []
    const req = makeRequest('GET')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns empty array when no working hours set', async () => {
    const req = makeRequest('GET')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toEqual([])
  })

  it('returns working hours for the nailist profile', async () => {
    collectionStore['workingHours'] = [
      { __id: 'wh-1', nailistProfileId: 'nailist-profile-1', dayOfWeek: 0, isActive: true, startTime: '09:00', endTime: '18:00' },
      { __id: 'wh-2', nailistProfileId: 'nailist-profile-1', dayOfWeek: 1, isActive: true, startTime: '09:00', endTime: '18:00' },
    ]
    const req = makeRequest('GET')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(2)
    expect(json.data[0].id).toBe('wh-1')
    expect(json.data[1].id).toBe('wh-2')
  })
})

describe('PUT /api/working-hours', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    collectionStore['nailistProfiles'] = [
      { __id: 'nailist-profile-1', userId: 'nailist-user-1' },
    ]
    collectionStore['workingHours'] = []
  })

  it('returns 401 when no auth cookie', async () => {
    const req = makeRequest('PUT', { hours: [] }, false)
    const res = await PUT(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when nailist profile not found', async () => {
    collectionStore['nailistProfiles'] = []
    const req = makeRequest('PUT', { hours: [] })
    const res = await PUT(req)
    expect(res.status).toBe(401)
  })

  it('commits batch and returns success message', async () => {
    const req = makeRequest('PUT', {
      hours: [
        { dayOfWeek: 0, isActive: true, startTime: '09:00', endTime: '18:00' },
      ],
    })
    const res = await PUT(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.message).toBe('Working hours updated')
    expect(mockBatchCommit).toHaveBeenCalled()
  })

  it('creates new entry (batch.set) when no existing doc for that day', async () => {
    const req = makeRequest('PUT', {
      hours: [{ dayOfWeek: 3, isActive: true, startTime: '10:00', endTime: '20:00' }],
    })
    await PUT(req)
    expect(mockBatchSet).toHaveBeenCalled()
  })

  it('updates existing entry (batch.update) when doc already exists for that day', async () => {
    collectionStore['workingHours'] = [
      { __id: 'wh-1', nailistProfileId: 'nailist-profile-1', dayOfWeek: 1, isActive: true, startTime: '09:00', endTime: '17:00' },
    ]
    const req = makeRequest('PUT', {
      hours: [{ dayOfWeek: 1, isActive: false, startTime: '10:00', endTime: '15:00' }],
    })
    await PUT(req)
    expect(mockBatchUpdate).toHaveBeenCalled()
  })

  it('handles empty hours array gracefully', async () => {
    const req = makeRequest('PUT', { hours: [] })
    const res = await PUT(req)
    expect(res.status).toBe(200)
    expect(mockBatchCommit).toHaveBeenCalled()
  })

  it('handles 7-day full schedule', async () => {
    const hours = Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      isActive: i < 5,
      startTime: '09:00',
      endTime: '18:00',
    }))
    const req = makeRequest('PUT', { hours })
    const res = await PUT(req)
    expect(res.status).toBe(200)
  })
})
