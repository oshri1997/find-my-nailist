/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// ── Firebase Admin mocks ────────────────────────────────────────────────────

type DocData = Record<string, unknown>

const docStore: Record<string, DocData> = {}
const collectionStore: Record<string, (DocData & { __id: string })[]> = {}

const mockUpdateFn = jest.fn().mockResolvedValue(undefined)
const mockAddFn = jest.fn().mockResolvedValue({ id: 'new-profile-id' })

function makeDocRef(collection: string, id: string) {
  return {
    get: jest.fn().mockImplementation(() =>
      Promise.resolve({
        exists: !!docStore[`${collection}/${id}`],
        data: () => docStore[`${collection}/${id}`] ?? undefined,
        id,
      })
    ),
    update: mockUpdateFn,
  }
}

function makeCollectionRef(name: string) {
  let _whereField: string
  let _whereValue: unknown
  return {
    doc: (id: string) => makeDocRef(name, id),
    where: jest.fn().mockImplementation((field: string, _op: string, value: unknown) => {
      _whereField = field
      _whereValue = value
      const filtered = (collectionStore[name] ?? []).filter(
        (d) => d[_whereField] === _whereValue
      )
      return {
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: filtered.length === 0,
          docs: filtered.map((d) => ({
            id: d.__id,
            data: () => d,
            ref: { ...makeDocRef(name, d.__id), update: mockUpdateFn },
          })),
        }),
      }
    }),
    add: mockAddFn,
  }
}

const mockDb = {
  collection: jest.fn((name: string) => makeCollectionRef(name)),
}

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({
      uid: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    }),
  })),
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

// ── Import after mocks ──────────────────────────────────────────────────────

import { GET, PATCH } from '@/app/api/me/client-profile/route'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeGetRequest(cookie?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/me/client-profile', { method: 'GET' })
  if (cookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (name: string) => (name === 'auth-token' ? { value: cookie } : undefined) }),
    })
  }
  return req
}

function makePatchRequest(body: unknown, cookie = 'valid-token'): NextRequest {
  const req = new NextRequest('http://localhost/api/me/client-profile', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  Object.defineProperty(req, 'cookies', {
    get: () => ({ get: (name: string) => (name === 'auth-token' ? { value: cookie } : undefined) }),
  })
  return req
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/me/client-profile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    collectionStore['clientProfiles'] = []
  })

  it('returns 401 when no auth cookie is provided', async () => {
    const req = makeGetRequest()
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns existing profile when found', async () => {
    collectionStore['clientProfiles'] = [
      {
        __id: 'profile-1',
        userId: 'user-123',
        displayName: 'שרה כהן',
        email: 'test@example.com',
        phoneNumber: '0501234567',
      },
    ]
    const req = makeGetRequest('valid-token')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.id).toBe('profile-1')
    expect(json.data.displayName).toBe('שרה כהן')
  })

  it('auto-creates profile (201) when none exists', async () => {
    collectionStore['clientProfiles'] = []
    const req = makeGetRequest('valid-token')
    const res = await GET(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.id).toBe('new-profile-id')
    expect(mockAddFn).toHaveBeenCalledTimes(1)
    expect(mockAddFn).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-123' })
    )
  })

  it('auto-created profile starts with onboardingCompleted: false', async () => {
    collectionStore['clientProfiles'] = []
    const req = makeGetRequest('valid-token')
    await GET(req)
    expect(mockAddFn).toHaveBeenCalledWith(
      expect.objectContaining({ onboardingCompleted: false })
    )
  })
})

describe('PATCH /api/me/client-profile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    collectionStore['clientProfiles'] = [
      {
        __id: 'profile-1',
        userId: 'user-123',
        displayName: 'שרה כהן',
        email: 'test@example.com',
      },
    ]
  })

  it('returns 401 when no auth cookie is provided', async () => {
    const req = new NextRequest('http://localhost/api/me/client-profile', {
      method: 'PATCH',
      body: JSON.stringify({ phoneNumber: '050' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })

  it('updates phoneNumber successfully', async () => {
    const req = makePatchRequest({ phoneNumber: '0501234567' })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({ phoneNumber: '0501234567' })
    )
  })

  it('marks onboardingCompleted: true when the wizard submits firstName+lastName+phoneNumber together', async () => {
    const req = makePatchRequest({ firstName: 'שרה', lastName: 'כהן', phoneNumber: '0501234567' })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({ onboardingCompleted: true })
    )
  })

  it('does NOT mark onboardingCompleted when only phoneNumber is updated later (not the wizard shape)', async () => {
    const req = makePatchRequest({ phoneNumber: '0501234567' })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const updateArg = mockUpdateFn.mock.calls[0][0]
    expect(updateArg.onboardingCompleted).toBeUndefined()
  })

  it('updates city successfully', async () => {
    const req = makePatchRequest({ city: 'תל אביב' })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'תל אביב' })
    )
  })

  it('updates firstName and lastName and derives displayName', async () => {
    const req = makePatchRequest({ firstName: 'שרה', lastName: 'כהן' })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'שרה',
        lastName: 'כהן',
        displayName: 'שרה כהן',
      })
    )
  })

  it('does NOT set displayName when only firstName is provided (no lastName)', async () => {
    const req = makePatchRequest({ firstName: 'שרה' })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const updateArg = mockUpdateFn.mock.calls[0][0]
    expect(updateArg.firstName).toBe('שרה')
    expect(updateArg.displayName).toBeUndefined()
  })

  it('does NOT set displayName when only lastName is provided (no firstName)', async () => {
    const req = makePatchRequest({ lastName: 'כהן' })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const updateArg = mockUpdateFn.mock.calls[0][0]
    expect(updateArg.lastName).toBe('כהן')
    expect(updateArg.displayName).toBeUndefined()
  })

  it('updates all fields at once', async () => {
    const req = makePatchRequest({
      firstName: 'שרה',
      lastName: 'לוי',
      phoneNumber: '052-9876543',
      city: 'חיפה',
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'שרה',
        lastName: 'לוי',
        displayName: 'שרה לוי',
        phoneNumber: '052-9876543',
        city: 'חיפה',
      })
    )
  })

  it('updates photoUrl successfully (client onboarding profile-picture step)', async () => {
    const req = makePatchRequest({ photoUrl: 'https://example.com/avatar.jpg' })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({ photoUrl: 'https://example.com/avatar.jpg' })
    )
  })

  it('returns 400 on invalid body (phoneNumber empty string)', async () => {
    const req = makePatchRequest({ phoneNumber: '' })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for an obviously malformed phoneNumber', async () => {
    const req = makePatchRequest({ phoneNumber: 'call me maybe!!' })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    expect(mockUpdateFn).not.toHaveBeenCalled()
  })

  it('returns 400 for a phone number with way too many digits — a real regression, previously accepted', async () => {
    const req = makePatchRequest({ phoneNumber: '1232131231231231231231231231231231' })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    expect(mockUpdateFn).not.toHaveBeenCalled()
  })

  it('always includes updatedAt in the update', async () => {
    const req = makePatchRequest({ city: 'ירושלים' })
    await PATCH(req)
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({ updatedAt: 'SERVER_TIMESTAMP' })
    )
  })

  it('returns 404 when profile is not found', async () => {
    collectionStore['clientProfiles'] = []
    const req = makePatchRequest({ city: 'ירושלים' })
    const res = await PATCH(req)
    expect(res.status).toBe(404)
  })
})
