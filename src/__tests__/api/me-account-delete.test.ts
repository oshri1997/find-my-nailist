/**
 * @jest-environment node
 *
 * Self-service account deletion — delegates the actual cascade (Firestore
 * profile + related docs, storage, Firebase Auth user) to the same
 * deleteUserCascade() the admin panel uses, already covered exhaustively in
 * admin-users-delete.test.ts. This route's own job is just: authenticate the
 * caller, delete *themselves* (not an arbitrary id), and translate the
 * cascade's result into an HTTP response.
 */
import { NextRequest } from 'next/server'

const mockVerifyIdToken = jest.fn()
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({ verifyIdToken: mockVerifyIdToken })),
}))

const mockDeleteUserCascade = jest.fn()
jest.mock('@/lib/admin-user-actions', () => ({
  deleteUserCascade: (...args: unknown[]) => mockDeleteUserCascade(...args),
}))

import { DELETE } from '@/app/api/me/account/route'

function makeRequest(token?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/me/account', { method: 'DELETE' })
  if (token) req.cookies.set('auth-token', token)
  return req
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('DELETE /api/me/account', () => {
  it('returns 401 with no auth cookie', async () => {
    const res = await DELETE(makeRequest())
    expect(res.status).toBe(401)
    expect(mockDeleteUserCascade).not.toHaveBeenCalled()
  })

  it('returns 401 for an invalid/expired token', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('invalid token'))
    const res = await DELETE(makeRequest('bad-token'))
    expect(res.status).toBe(401)
    expect(mockDeleteUserCascade).not.toHaveBeenCalled()
  })

  it('deletes the caller\'s own account, passing themselves as both target and actor', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-1', email: 'user1@example.com' })
    mockDeleteUserCascade.mockResolvedValue({ ok: true })

    const res = await DELETE(makeRequest('valid-token'))

    expect(res.status).toBe(200)
    expect(mockDeleteUserCascade).toHaveBeenCalledWith(
      'user-1',
      { uid: 'user-1', email: 'user1@example.com' }
    )
  })

  it('propagates the cascade\'s error status (e.g. refusing to self-delete an admin account)', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'admin-1', email: 'admin@example.com' })
    mockDeleteUserCascade.mockResolvedValue({ ok: false, error: 'לא ניתן למחוק חשבון אדמין', status: 403 })

    const res = await DELETE(makeRequest('valid-token'))

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('לא ניתן למחוק חשבון אדמין')
  })

  it('returns 500 if the cascade throws unexpectedly', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-1', email: 'user1@example.com' })
    mockDeleteUserCascade.mockRejectedValue(new Error('boom'))

    const res = await DELETE(makeRequest('valid-token'))
    expect(res.status).toBe(500)
  })
})
