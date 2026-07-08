/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockVerifyIdToken = jest.fn().mockResolvedValue({ uid: 'user-123', email: 'user@test.com', name: 'Test User', email_verified: false })
const mockDocUpdate = jest.fn().mockResolvedValue(undefined)
const mockAdd = jest.fn().mockResolvedValue({ id: 'new-profile-id' })
const mockProfileUpdate = jest.fn().mockResolvedValue(undefined)
const mockSendRoleAwareVerificationEmail = jest.fn().mockResolvedValue(undefined)

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
    doc: (id?: string) => (id ? makeDocRef(name, id) : { id: 'new-doc', set: jest.fn() }),
    add: mockAdd,
    where: jest.fn().mockImplementation((field: string, _op: string, value: unknown) => {
      const filtered = (collectionStore[name] ?? []).filter(d => d[field] === value)
      return {
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: filtered.length === 0,
          docs: filtered.map(d => ({
            id: d.__id,
            data: () => d,
            ref: { update: mockProfileUpdate },
          })),
        }),
      }
    }),
  }
}

const mockDb = { collection: jest.fn((n: string) => makeCollectionRef(n)) }

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({ verifyIdToken: mockVerifyIdToken })),
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

jest.mock('@/lib/verification-email', () => ({
  sendRoleAwareVerificationEmail: (...args: unknown[]) => mockSendRoleAwareVerificationEmail(...args),
}))

import { PATCH } from '@/app/api/me/set-role/route'

function makeRequest(body?: unknown, withCookie = true): NextRequest {
  const req = new NextRequest('http://localhost/api/me/set-role', {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })
  if (withCookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (n: string) => n === 'auth-token' ? { value: 'valid-token' } : undefined }),
    })
  }
  return req
}

describe('PATCH /api/me/set-role', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    docStore['users/user-123'] = { displayName: 'Test User', email: 'user@test.com' }
    collectionStore['nailistProfiles'] = []
    collectionStore['clientProfiles'] = []
  })

  it('returns 401 when no auth token', async () => {
    const req = makeRequest({ role: 'NAILIST' }, false)
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 on invalid role value', async () => {
    const req = makeRequest({ role: 'ADMIN' })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid body')
  })

  it('returns 400 when role field is missing', async () => {
    const req = makeRequest({})
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('sets NAILIST role and creates nailist profile when none exists', async () => {
    const req = makeRequest({ role: 'NAILIST' })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.role).toBe('NAILIST')
    expect(mockDocUpdate).toHaveBeenCalledWith(expect.objectContaining({ role: 'NAILIST' }))
    expect(mockAdd).toHaveBeenCalled()
  })

  it('does NOT create duplicate nailist profile when one already exists', async () => {
    collectionStore['nailistProfiles'] = [
      { __id: 'existing-profile', userId: 'user-123', businessName: 'My Studio' },
    ]
    const req = makeRequest({ role: 'NAILIST' })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('sets CLIENT role, deactivates nailist profile, creates client profile', async () => {
    collectionStore['nailistProfiles'] = [
      { __id: 'nailist-prof-1', userId: 'user-123', isActive: true },
    ]
    const req = makeRequest({ role: 'CLIENT' })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(mockProfileUpdate).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }))
    expect(mockAdd).toHaveBeenCalled()
  })

  it('does NOT create duplicate client profile when one already exists', async () => {
    collectionStore['clientProfiles'] = [
      { __id: 'existing-client', userId: 'user-123' },
    ]
    const req = makeRequest({ role: 'CLIENT' })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('sets CLIENT role even when no nailist profile to deactivate', async () => {
    collectionStore['nailistProfiles'] = []
    const req = makeRequest({ role: 'CLIENT' })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(mockProfileUpdate).not.toHaveBeenCalled()
  })

  it('returns the new role in response data', async () => {
    const req = makeRequest({ role: 'NAILIST' })
    const res = await PATCH(req)
    const json = await res.json()
    expect(json.data.role).toBe('NAILIST')
  })

  it('uses user displayName from Firestore for nailist businessName', async () => {
    docStore['users/user-123'] = { displayName: 'Sarah Cohen', email: 'sarah@test.com' }
    const req = makeRequest({ role: 'NAILIST' })
    await PATCH(req)
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ businessName: 'Sarah Cohen' })
    )
  })

  it('falls back to decoded.name when user has no displayName', async () => {
    docStore['users/user-123'] = { email: 'user@test.com' }
    const req = makeRequest({ role: 'NAILIST' })
    await PATCH(req)
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ businessName: 'Test User' })
    )
  })

  it('creates a new nailist profile hidden from search until onboarding finishes', async () => {
    const req = makeRequest({ role: 'NAILIST' })
    await PATCH(req)
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ onboardingCompleted: false, isActive: false })
    )
  })

  it('creates a new client profile with onboardingCompleted: false, gated by OnboardingGuard until the name step finishes', async () => {
    // Regression: this branch used to omit onboardingCompleted entirely,
    // which the "missing field = already onboarded" convention (see
    // /api/me/role) silently treated as done — letting a client book/review
    // with no firstName/lastName ever collected, permanently showing
    // "לקוחה" instead of a real name.
    const req = makeRequest({ role: 'CLIENT' })
    await PATCH(req)
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ onboardingCompleted: false })
    )
  })

  it('sends a role-aware verification email once the role is known, for an unverified account', async () => {
    // Registration itself no longer sends the verification email — role
    // isn't chosen yet at that point, so the copy couldn't be role-aware.
    // This is the first moment the role is definitively known.
    const req = makeRequest({ role: 'NAILIST' })
    await PATCH(req)
    expect(mockSendRoleAwareVerificationEmail).toHaveBeenCalledWith('user-123', 'user@test.com', 'NAILIST')
  })

  it('sends the CLIENT-flavored email when CLIENT is chosen', async () => {
    const req = makeRequest({ role: 'CLIENT' })
    await PATCH(req)
    expect(mockSendRoleAwareVerificationEmail).toHaveBeenCalledWith('user-123', 'user@test.com', 'CLIENT')
  })

  it('does not send a verification email when the account is already verified (e.g. Google sign-in)', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-123', email: 'user@test.com', name: 'Test User', email_verified: true })
    const req = makeRequest({ role: 'NAILIST' })
    await PATCH(req)
    expect(mockSendRoleAwareVerificationEmail).not.toHaveBeenCalled()
  })

  it('still succeeds and sets the role even when the verification email send fails', async () => {
    mockSendRoleAwareVerificationEmail.mockRejectedValueOnce(new Error('boom'))
    const req = makeRequest({ role: 'NAILIST' })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.role).toBe('NAILIST')
  })
})
