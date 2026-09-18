/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const setMock = jest.fn().mockResolvedValue(undefined)
const mockDb = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({ set: setMock })),
  })),
}
const verifyIdTokenMock = jest.fn()

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({ verifyIdToken: (...args: unknown[]) => verifyIdTokenMock(...args) })),
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

import { POST } from '@/app/api/announcements/seen/route'

function makeRequest(cookie?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/announcements/seen', { method: 'POST' })
  if (cookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (name: string) => (name === 'auth-token' ? { value: cookie } : undefined) }),
    })
  }
  return req
}

beforeEach(() => {
  jest.clearAllMocks()
  verifyIdTokenMock.mockResolvedValue({ uid: 'nailist-user-1' })
})

describe('POST /api/announcements/seen', () => {
  it('returns 401 for an anonymous caller and never writes', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    expect(setMock).not.toHaveBeenCalled()
  })

  it('merge-writes lastSeenAnnouncementsAt as a server timestamp for the caller', async () => {
    const res = await POST(makeRequest('token'))
    expect(res.status).toBe(200)
    expect(mockDb.collection).toHaveBeenCalledWith('users')
    expect(setMock).toHaveBeenCalledWith({ lastSeenAnnouncementsAt: 'SERVER_TIMESTAMP' }, { merge: true })
  })
})
