/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockVerifyIdToken = jest.fn()

const docStore: Record<string, Record<string, unknown> | null> = {}

function makeDocRef(collection: string, id: string) {
  const key = `${collection}/${id}`
  return {
    get: jest.fn().mockImplementation(() =>
      Promise.resolve({
        exists: docStore[key] !== null && docStore[key] !== undefined,
        data: () => docStore[key] ?? undefined,
        id,
      })
    ),
  }
}

// nailistProfiles/clientProfiles lookups (onboardingCompleted check) — empty
// by default so existing tests (which don't seed a profile) fall back to
// onboardingCompleted: true
let profileDocs: Array<{ data: () => Record<string, unknown> }> = []

const mockDb = {
  collection: jest.fn((name: string) => ({
    doc: (id: string) => makeDocRef(name, id),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockImplementation(() =>
      Promise.resolve({ empty: profileDocs.length === 0, docs: profileDocs })
    ),
  })),
}

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({ verifyIdToken: mockVerifyIdToken })),
  adminDb: jest.fn(() => mockDb),
}))

import { GET } from '@/app/api/me/role/route'

function makeRequest(withCookie = true): NextRequest {
  const req = new NextRequest('http://localhost/api/me/role', { method: 'GET' })
  if (withCookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (n: string) => n === 'auth-token' ? { value: 'valid-token' } : undefined }),
    })
  }
  return req
}

describe('GET /api/me/role', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' })
    profileDocs = []
  })

  it('returns 401 when no auth token', async () => {
    const req = makeRequest(false)
    const res = await GET(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.role).toBeNull()
  })

  it('returns 401 when verifyIdToken throws', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('expired'))
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.role).toBeNull()
  })

  it('returns {role: null} when user doc does not exist', async () => {
    docStore['users/user-123'] = null
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.role).toBeNull()
  })

  it('returns NAILIST role when set in user doc', async () => {
    docStore['users/user-123'] = { role: 'NAILIST', email: 'nail@test.com' }
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.role).toBe('NAILIST')
  })

  it('returns CLIENT role when set in user doc', async () => {
    docStore['users/user-123'] = { role: 'CLIENT', email: 'client@test.com' }
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.role).toBe('CLIENT')
  })

  it('defaults to CLIENT when user doc exists but has no role field', async () => {
    docStore['users/user-123'] = { email: 'someone@test.com' }
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.role).toBe('CLIENT')
  })

  it('returns isAdmin: true alongside role for an admin nailist', async () => {
    docStore['users/user-123'] = { role: 'NAILIST', isAdmin: true, email: 'admin@test.com' }
    const req = makeRequest()
    const res = await GET(req)
    const json = await res.json()
    expect(json.role).toBe('NAILIST')
    expect(json.isAdmin).toBe(true)
  })

  it('defaults isAdmin to false when the field is absent', async () => {
    docStore['users/user-123'] = { role: 'NAILIST', email: 'nail@test.com' }
    const req = makeRequest()
    const res = await GET(req)
    const json = await res.json()
    expect(json.isAdmin).toBe(false)
  })

  it('returns onboardingCompleted: false when the nailist profile has not finished onboarding', async () => {
    docStore['users/user-123'] = { role: 'NAILIST', email: 'nail@test.com' }
    profileDocs = [{ data: () => ({ onboardingCompleted: false }) }]
    const req = makeRequest()
    const res = await GET(req)
    const json = await res.json()
    expect(json.onboardingCompleted).toBe(false)
  })

  it('returns onboardingCompleted: true when the nailist profile has finished onboarding', async () => {
    docStore['users/user-123'] = { role: 'NAILIST', email: 'nail@test.com' }
    profileDocs = [{ data: () => ({ onboardingCompleted: true }) }]
    const req = makeRequest()
    const res = await GET(req)
    const json = await res.json()
    expect(json.onboardingCompleted).toBe(true)
  })

  it('defaults onboardingCompleted to true for nailist profiles created before the field existed', async () => {
    docStore['users/user-123'] = { role: 'NAILIST', email: 'nail@test.com' }
    profileDocs = [{ data: () => ({}) }]
    const req = makeRequest()
    const res = await GET(req)
    const json = await res.json()
    expect(json.onboardingCompleted).toBe(true)
  })

  it('defaults onboardingCompleted to true for CLIENT role when no client profile exists yet', async () => {
    docStore['users/user-123'] = { role: 'CLIENT', email: 'client@test.com' }
    const req = makeRequest()
    const res = await GET(req)
    const json = await res.json()
    expect(json.onboardingCompleted).toBe(true)
  })

  it('returns onboardingCompleted: false when the client profile has not finished onboarding', async () => {
    docStore['users/user-123'] = { role: 'CLIENT', email: 'client@test.com' }
    profileDocs = [{ data: () => ({ onboardingCompleted: false }) }]
    const req = makeRequest()
    const res = await GET(req)
    const json = await res.json()
    expect(json.onboardingCompleted).toBe(false)
  })

  it('returns onboardingCompleted: true when the client profile has finished onboarding', async () => {
    docStore['users/user-123'] = { role: 'CLIENT', email: 'client@test.com' }
    profileDocs = [{ data: () => ({ onboardingCompleted: true }) }]
    const req = makeRequest()
    const res = await GET(req)
    const json = await res.json()
    expect(json.onboardingCompleted).toBe(true)
  })

  it('defaults onboardingCompleted to true for client profiles created before the field existed', async () => {
    docStore['users/user-123'] = { role: 'CLIENT', email: 'client@test.com' }
    profileDocs = [{ data: () => ({}) }]
    const req = makeRequest()
    const res = await GET(req)
    const json = await res.json()
    expect(json.onboardingCompleted).toBe(true)
  })

  it('returns an ADMIN fast path (isAdmin: true, onboardingCompleted: true) without any profile lookup', async () => {
    docStore['users/user-123'] = { role: 'ADMIN', isAdmin: true, email: 'admin@test.com' }
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.role).toBe('ADMIN')
    expect(json.isAdmin).toBe(true)
    expect(json.onboardingCompleted).toBe(true)
  })

  it('reads isAdmin from the real Firestore field for an ADMIN-role account instead of assuming true', async () => {
    // Regression: an ADMIN-role account whose admin access was revoked
    // (isAdmin flipped to false, e.g. via the admin-users revoke path) must
    // lose panel access immediately — this used to hardcode isAdmin:true for
    // any role==='ADMIN' account regardless of the actual Firestore field.
    docStore['users/user-123'] = { role: 'ADMIN', isAdmin: false, email: 'revoked@test.com' }
    const req = makeRequest()
    const res = await GET(req)
    const json = await res.json()
    expect(json.role).toBe('ADMIN')
    expect(json.isAdmin).toBe(false)
  })

  it('prefers the client profile firstName+lastName over the users doc displayName', async () => {
    docStore['users/user-123'] = { role: 'CLIENT', email: 'client@test.com', displayName: 'DrakAtos YT' }
    profileDocs = [{ data: () => ({ firstName: 'ישראלה', lastName: 'ישראלית' }) }]
    const req = makeRequest()
    const res = await GET(req)
    const json = await res.json()
    expect(json.displayName).toBe('ישראלה ישראלית')
  })

  it('falls back to the users doc displayName when the profile has no name fields', async () => {
    docStore['users/user-123'] = { role: 'CLIENT', email: 'client@test.com', displayName: 'DrakAtos YT' }
    profileDocs = [{ data: () => ({}) }]
    const req = makeRequest()
    const res = await GET(req)
    const json = await res.json()
    expect(json.displayName).toBe('DrakAtos YT')
  })

  it('returns displayName: null when nothing is on file', async () => {
    docStore['users/user-123'] = { role: 'CLIENT', email: 'client@test.com' }
    profileDocs = [{ data: () => ({}) }]
    const req = makeRequest()
    const res = await GET(req)
    const json = await res.json()
    expect(json.displayName).toBeNull()
  })

  it('returns the ADMIN fast path displayName straight from the users doc', async () => {
    docStore['users/user-123'] = { role: 'ADMIN', isAdmin: true, email: 'admin@test.com', displayName: 'מנהל ראשי' }
    const req = makeRequest()
    const res = await GET(req)
    const json = await res.json()
    expect(json.displayName).toBe('מנהל ראשי')
  })

  it('prefers the nailist profile businessName over the users doc displayName', async () => {
    // Regression: nailistProfiles documents never have firstName/lastName
    // (only businessName) — the CLIENT-shaped firstName+lastName check was
    // always false for a NAILIST account, making this fallback dead code
    // and silently showing the Google-account nickname instead.
    docStore['users/user-123'] = { role: 'NAILIST', email: 'nail@test.com', displayName: 'DrakAtos YT' }
    profileDocs = [{ data: () => ({ businessName: 'סטודיו יופי של שרה' }) }]
    const req = makeRequest()
    const res = await GET(req)
    const json = await res.json()
    expect(json.displayName).toBe('סטודיו יופי של שרה')
  })

  it('falls back to the users doc displayName when the nailist profile has no businessName yet', async () => {
    docStore['users/user-123'] = { role: 'NAILIST', email: 'nail@test.com', displayName: 'DrakAtos YT' }
    profileDocs = [{ data: () => ({}) }]
    const req = makeRequest()
    const res = await GET(req)
    const json = await res.json()
    expect(json.displayName).toBe('DrakAtos YT')
  })
})
