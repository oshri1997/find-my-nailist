/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockAdd = jest.fn().mockResolvedValue({ id: 'new-profile-id' })
const mockSet = jest.fn().mockResolvedValue(undefined)

const docStore: Record<string, Record<string, unknown> | null> = {}

function makeCollectionRef(name: string) {
  return {
    doc: (id: string) => ({
      get: jest.fn().mockImplementation(() =>
        Promise.resolve({
          exists: !!docStore[`${name}/${id}`],
          data: () => docStore[`${name}/${id}`] ?? undefined,
          id,
        })
      ),
      set: mockSet,
    }),
    add: mockAdd,
  }
}

const mockDb = { collection: jest.fn((n: string) => makeCollectionRef(n)) }

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({
    verifyIdToken: jest.fn().mockImplementation((token: string) => {
      if (token === 'valid-token') return Promise.resolve({ uid: 'user-123' })
      if (token === 'other-users-token') return Promise.resolve({ uid: 'someone-else' })
      return Promise.reject(new Error('invalid token'))
    }),
  })),
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

import { POST } from '@/app/api/users/route'

function makeRequest(body: unknown, cookie?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/users', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  if (cookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (name: string) => (name === 'auth-token' ? { value: cookie } : undefined) }),
    })
  }
  return req
}

describe('POST /api/users', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    for (const key of Object.keys(docStore)) delete docStore[key]
  })

  const validNailistBody = {
    uid: 'user-123',
    email: 'sarah@test.com',
    displayName: 'Sarah Cohen',
    role: 'NAILIST',
  }

  it('returns 401 when no auth cookie is provided', async () => {
    const res = await POST(makeRequest(validNailistBody))
    expect(res.status).toBe(401)
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('returns 401 when the auth cookie fails verification', async () => {
    const res = await POST(makeRequest(validNailistBody, 'garbage-token'))
    expect(res.status).toBe(401)
  })

  it('returns 403 when the body uid does not match the authenticated uid (cannot create/claim another uid)', async () => {
    const res = await POST(makeRequest(validNailistBody, 'other-users-token'))
    expect(res.status).toBe(403)
    expect(mockSet).not.toHaveBeenCalled()
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('returns 400 on invalid body', async () => {
    const res = await POST(makeRequest({ uid: 'user-123' }, 'valid-token'))
    expect(res.status).toBe(400)
  })

  it('creates a new nailist profile hidden from search until onboarding finishes', async () => {
    const res = await POST(makeRequest(validNailistBody, 'valid-token'))
    expect(res.status).toBe(201)
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ onboardingCompleted: false, isActive: false })
    )
  })

  it('returns the existing user doc without creating a new profile when the uid already exists', async () => {
    docStore['users/user-123'] = { uid: 'user-123', email: 'sarah@test.com', role: 'NAILIST' }
    const res = await POST(makeRequest(validNailistBody, 'valid-token'))
    expect(res.status).toBe(200)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('creates a client profile hidden behind onboarding until name+phone are set', async () => {
    const res = await POST(makeRequest({ ...validNailistBody, role: 'CLIENT' }, 'valid-token'))
    expect(res.status).toBe(201)
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ onboardingCompleted: false, email: 'sarah@test.com', displayName: 'Sarah Cohen' })
    )
  })

  it('defaults to a CLIENT profile when role is omitted (registration no longer sends one)', async () => {
    const res = await POST(makeRequest({
      uid: 'user-123', email: 'sarah@test.com', displayName: 'Sarah Cohen',
    }, 'valid-token'))
    expect(res.status).toBe(201)
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ onboardingCompleted: false })
    )
  })

  it('stores firstName/lastName on the client profile when the registration form collected them', async () => {
    const res = await POST(makeRequest({
      uid: 'user-123', email: 'sarah@test.com', displayName: 'שרה לוי',
      firstName: 'שרה', lastName: 'לוי', role: 'CLIENT',
    }, 'valid-token'))
    expect(res.status).toBe(201)
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'שרה', lastName: 'לוי' })
    )
  })

  it('does not set firstName/lastName fields on the client profile when they are absent (Google sign-in)', async () => {
    const res = await POST(makeRequest({
      uid: 'user-123', email: 'sarah@test.com', displayName: 'Sarah', role: 'CLIENT',
    }, 'valid-token'))
    expect(res.status).toBe(201)
    const addedData = mockAdd.mock.calls[0][0]
    expect(addedData.firstName).toBeUndefined()
    expect(addedData.lastName).toBeUndefined()
  })
})
