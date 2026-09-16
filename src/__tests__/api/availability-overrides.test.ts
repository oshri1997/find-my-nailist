/** @jest-environment node */
import { NextRequest } from 'next/server'

const collectionStore: Record<string, Array<Record<string, unknown> & { __id: string }>> = {}
const mockSet = jest.fn().mockResolvedValue(undefined)
const mockDelete = jest.fn().mockResolvedValue(undefined)
const documentIds: string[] = []

function collection(name: string) {
  const docs = () => collectionStore[name] ?? []
  return {
    doc: jest.fn((id: string) => {
      documentIds.push(id)
      return {
      id,
      get: jest.fn().mockResolvedValue({
        exists: docs().some((item) => item.__id === id),
        data: () => docs().find((item) => item.__id === id),
      }),
      set: mockSet,
      delete: mockDelete,
      }
    }),
    where: jest.fn((field: string, _op: string, value: unknown) => {
      const matched = docs().filter((item) => item[field] === value)
      return {
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: matched.length === 0,
          docs: matched.map((item) => ({ id: item.__id, data: () => item })),
        }),
      }
    }),
  }
}

const mockDb = { collection: jest.fn(collection) }
const verifyIdToken = jest.fn().mockResolvedValue({ uid: 'owner' })

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({ verifyIdToken })),
  adminDb: jest.fn(() => mockDb),
}))
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'), delete: jest.fn(() => 'FIELD_DELETE') },
}))

import { DELETE, GET, PUT } from '@/app/api/availability-overrides/route'

function request(method: string, body?: unknown, withCookie = true, date?: string) {
  const req = new NextRequest(`http://localhost/api/availability-overrides${date ? `?date=${date}` : ''}`, {
    method, body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
  })
  if (withCookie) Object.defineProperty(req, 'cookies', {
    get: () => ({ get: (name: string) => name === 'auth-token' ? { value: 'token' } : undefined }),
  })
  return req
}

describe('/api/availability-overrides', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    documentIds.length = 0
    collectionStore.nailistProfiles = [{ __id: 'profile-1', userId: 'owner' }]
    collectionStore.availabilityOverrides = []
  })

  it('requires an authenticated nailist owner', async () => {
    expect((await GET(request('GET', undefined, false))).status).toBe(401)
    collectionStore.nailistProfiles = []
    expect((await GET(request('GET'))).status).toBe(401)
  })

  it('returns only overrides owned by the authenticated nailist', async () => {
    collectionStore.availabilityOverrides = [
      { __id: 'profile-1_2026-09-21', nailistProfileId: 'profile-1', date: '2026-09-21', mode: 'CLOSED' },
      { __id: 'other_2026-09-21', nailistProfileId: 'other', date: '2026-09-21', mode: 'OPEN' },
    ]
    const json = await (await GET(request('GET'))).json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0].id).toBe('profile-1_2026-09-21')
  })

  it('rejects malformed and backward opening hours', async () => {
    expect((await PUT(request('PUT', { date: '21-09-2026', mode: 'CLOSED' }))).status).toBe(400)
    expect((await PUT(request('PUT', { date: '2026-09-21', mode: 'OPEN', startTime: '18:00', endTime: '09:00' }))).status).toBe(400)
  })

  it('upserts a date override at one deterministic document id', async () => {
    const res = await PUT(request('PUT', { date: '2026-09-21', mode: 'OPEN', startTime: '10:00', endTime: '14:00' }))
    expect(res.status).toBe(200)
    expect(documentIds).toContain('profile-1_2026-09-21')
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ nailistProfileId: 'profile-1', mode: 'OPEN' }), { merge: true })
  })

  it('deletes only the authenticated nailist date document', async () => {
    const res = await DELETE(request('DELETE', undefined, true, '2026-09-21'))
    expect(res.status).toBe(200)
    expect(mockDelete).toHaveBeenCalledTimes(1)
  })

  it('accepts a multi-interval OPEN override', async () => {
    const res = await PUT(request('PUT', {
      date: '2026-09-21', mode: 'OPEN', startTime: '10:00', endTime: '18:00',
      intervals: [{ start: '10:00', end: '12:00' }, { start: '15:00', end: '18:00' }],
    }))
    expect(res.status).toBe(200)
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ intervals: [{ start: '10:00', end: '12:00' }, { start: '15:00', end: '18:00' }] }),
      { merge: true }
    )
  })

  it('rejects overlapping intervals server-side on an OPEN override', async () => {
    const res = await PUT(request('PUT', {
      date: '2026-09-21', mode: 'OPEN', startTime: '10:00', endTime: '18:00',
      intervals: [{ start: '10:00', end: '15:00' }, { start: '14:00', end: '18:00' }],
    }))
    expect(res.status).toBe(400)
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('clears a stale stored intervals[] when re-saving as a plain single-window OPEN override', async () => {
    const res = await PUT(request('PUT', { date: '2026-09-21', mode: 'OPEN', startTime: '10:00', endTime: '14:00' }))
    expect(res.status).toBe(200)
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ intervals: 'FIELD_DELETE' }),
      { merge: true }
    )
  })

  it('does not touch intervals on a CLOSED override', async () => {
    const res = await PUT(request('PUT', { date: '2026-09-21', mode: 'CLOSED' }))
    expect(res.status).toBe(200)
    expect(mockSet).toHaveBeenCalledWith(
      expect.not.objectContaining({ intervals: expect.anything() }),
      { merge: true }
    )
  })
})
