/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockDocUpdate = jest.fn().mockResolvedValue(undefined)

const docStore: Record<string, Record<string, unknown> | null> = {}
const collectionStore: Record<string, (Record<string, unknown> & { __id: string })[]> = {}

function makeDocRef(collection: string, id: string) {
  return {
    get: jest.fn().mockImplementation(() =>
      Promise.resolve({
        exists: !!docStore[`${collection}/${id}`],
        data: () => docStore[`${collection}/${id}`] ?? undefined,
        id,
      })
    ),
    update: mockDocUpdate,
  }
}

function makeCollectionRef(name: string) {
  return {
    doc: (id?: string) => (id ? makeDocRef(name, id) : { id: 'new-doc' }),
    where: jest.fn().mockImplementation((field: string, _op: string, value: unknown) => {
      const filtered = (collectionStore[name] ?? []).filter(d => d[field] === value)
      return {
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: filtered.length === 0,
          docs: filtered.map(d => ({ id: d.__id, data: () => d, ref: makeDocRef(name, d.__id) })),
        }),
      }
    }),
  }
}

const mockDb = { collection: jest.fn((n: string) => makeCollectionRef(n)) }

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'nailist-user-1' }),
  })),
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

import { PATCH, DELETE } from '@/app/api/services/[id]/route'

function makeRequest(method: string, serviceId: string, body?: unknown, withCookie = true): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(`http://localhost/api/services/${serviceId}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
  })
  if (withCookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (n: string) => n === 'auth-token' ? { value: 'valid-token' } : undefined }),
    })
  }
  return [req, { params: Promise.resolve({ id: serviceId }) }]
}

describe('PATCH /api/services/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    docStore['services/service-1'] = {
      name: 'מניקור',
      durationMinutes: 60,
      price: 100,
      currency: 'ILS',
      nailistProfileId: 'nailist-profile-1',
    }
    collectionStore['nailistProfiles'] = [
      { __id: 'nailist-profile-1', userId: 'nailist-user-1' },
    ]
  })

  it('returns 401 when no auth token', async () => {
    const [req, ctx] = makeRequest('PATCH', 'service-1', { name: 'Updated' }, false)
    const res = await PATCH(req, ctx)
    expect(res.status).toBe(401)
  })

  it('returns 404 when service does not exist', async () => {
    const [req, ctx] = makeRequest('PATCH', 'nonexistent', { name: 'Updated' })
    const res = await PATCH(req, ctx)
    expect(res.status).toBe(404)
  })

  it('returns 403 when service belongs to a different nailist', async () => {
    collectionStore['nailistProfiles'] = [
      { __id: 'other-profile', userId: 'nailist-user-1' },
    ]
    const [req, ctx] = makeRequest('PATCH', 'service-1', { name: 'Updated' })
    const res = await PATCH(req, ctx)
    expect(res.status).toBe(403)
  })

  it('returns 403 when caller has no nailist profile', async () => {
    collectionStore['nailistProfiles'] = []
    const [req, ctx] = makeRequest('PATCH', 'service-1', { name: 'Updated' })
    const res = await PATCH(req, ctx)
    expect(res.status).toBe(403)
  })

  it('returns 400 when durationMinutes is below minimum (15)', async () => {
    const [req, ctx] = makeRequest('PATCH', 'service-1', { durationMinutes: 10 })
    const res = await PATCH(req, ctx)
    expect(res.status).toBe(400)
  })

  it('returns 400 when durationMinutes is not an integer', async () => {
    const [req, ctx] = makeRequest('PATCH', 'service-1', { durationMinutes: 30.5 })
    const res = await PATCH(req, ctx)
    expect(res.status).toBe(400)
  })

  it('returns 400 when price is negative', async () => {
    const [req, ctx] = makeRequest('PATCH', 'service-1', { price: -10 })
    const res = await PATCH(req, ctx)
    expect(res.status).toBe(400)
  })

  it('returns 400 when name is empty string', async () => {
    const [req, ctx] = makeRequest('PATCH', 'service-1', { name: '' })
    const res = await PATCH(req, ctx)
    expect(res.status).toBe(400)
  })

  it('returns 200 on valid full update', async () => {
    const [req, ctx] = makeRequest('PATCH', 'service-1', {
      name: 'ג׳ל מניקור',
      durationMinutes: 90,
      price: 150,
      currency: 'ILS',
      description: 'שירות מעולה',
    })
    const res = await PATCH(req, ctx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('returns 200 on partial update (name only)', async () => {
    const [req, ctx] = makeRequest('PATCH', 'service-1', { name: 'מניקור קלאסי' })
    const res = await PATCH(req, ctx)
    expect(res.status).toBe(200)
    expect(mockDocUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'מניקור קלאסי' })
    )
  })

  it('includes updatedAt in update payload', async () => {
    const [req, ctx] = makeRequest('PATCH', 'service-1', { price: 120 })
    await PATCH(req, ctx)
    expect(mockDocUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ updatedAt: 'SERVER_TIMESTAMP' })
    )
  })

  it('allows price of 0 (free service)', async () => {
    const [req, ctx] = makeRequest('PATCH', 'service-1', { price: 0 })
    const res = await PATCH(req, ctx)
    expect(res.status).toBe(200)
  })

  it('allows durationMinutes of exactly 15 (minimum)', async () => {
    const [req, ctx] = makeRequest('PATCH', 'service-1', { durationMinutes: 15 })
    const res = await PATCH(req, ctx)
    expect(res.status).toBe(200)
  })
})

describe('DELETE /api/services/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    docStore['services/service-1'] = { name: 'מניקור', nailistProfileId: 'nailist-profile-1' }
    collectionStore['nailistProfiles'] = [
      { __id: 'nailist-profile-1', userId: 'nailist-user-1' },
    ]
  })

  it('returns 401 when no auth token', async () => {
    const [req, ctx] = makeRequest('DELETE', 'service-1', undefined, false)
    const res = await DELETE(req, ctx)
    expect(res.status).toBe(401)
  })

  it('returns 404 when service does not exist', async () => {
    const [req, ctx] = makeRequest('DELETE', 'nonexistent')
    const res = await DELETE(req, ctx)
    expect(res.status).toBe(404)
  })

  it('returns 403 when service belongs to a different nailist', async () => {
    collectionStore['nailistProfiles'] = [
      { __id: 'other-profile', userId: 'nailist-user-1' },
    ]
    const [req, ctx] = makeRequest('DELETE', 'service-1')
    const res = await DELETE(req, ctx)
    expect(res.status).toBe(403)
    expect(mockDocUpdate).not.toHaveBeenCalled()
  })

  it('returns 403 when caller has no nailist profile', async () => {
    collectionStore['nailistProfiles'] = []
    const [req, ctx] = makeRequest('DELETE', 'service-1')
    const res = await DELETE(req, ctx)
    expect(res.status).toBe(403)
  })

  it('returns 200 and sets isActive=false (soft delete)', async () => {
    const [req, ctx] = makeRequest('DELETE', 'service-1')
    const res = await DELETE(req, ctx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(mockDocUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false })
    )
  })

  it('includes updatedAt in soft-delete payload', async () => {
    const [req, ctx] = makeRequest('DELETE', 'service-1')
    await DELETE(req, ctx)
    expect(mockDocUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ updatedAt: 'SERVER_TIMESTAMP' })
    )
  })
})
