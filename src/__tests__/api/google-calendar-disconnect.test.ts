/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockVerifyIdToken = jest.fn()
const mockSet = jest.fn().mockResolvedValue(undefined)
const mockDoc = jest.fn(() => ({ set: mockSet }))
const mockCollection = jest.fn(() => ({ doc: mockDoc }))

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({ verifyIdToken: mockVerifyIdToken })),
  adminDb: jest.fn(() => ({ collection: mockCollection })),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'), delete: jest.fn(() => 'FIELD_DELETE') },
}))

import { POST } from '@/app/api/auth/google-calendar/disconnect/route'

function makeRequest(cookie?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/auth/google-calendar/disconnect', { method: 'POST' })
  if (cookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (name: string) => (name === 'auth-token' ? { value: cookie } : undefined) }),
    })
  }
  return req
}

describe('POST /api/auth/google-calendar/disconnect', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when there is no auth-token cookie', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('returns 401 when the token is invalid', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('bad'))
    const res = await POST(makeRequest('bad-token'))
    expect(res.status).toBe(401)
  })

  it('deletes googleCalendarTokens from the caller\'s own user doc', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-1' })
    const res = await POST(makeRequest('valid-token'))
    expect(res.status).toBe(200)
    expect(mockCollection).toHaveBeenCalledWith('users')
    expect(mockDoc).toHaveBeenCalledWith('user-1')
    expect(mockSet).toHaveBeenCalledWith(
      { googleCalendarTokens: 'FIELD_DELETE', updatedAt: 'SERVER_TIMESTAMP' },
      { merge: true }
    )
  })
})
