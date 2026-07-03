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
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

import { POST } from '@/app/api/users/route'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/users', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
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

  it('returns 400 on invalid body', async () => {
    const res = await POST(makeRequest({ uid: 'user-123' }))
    expect(res.status).toBe(400)
  })

  it('creates a new nailist profile hidden from search until onboarding finishes', async () => {
    const res = await POST(makeRequest(validNailistBody))
    expect(res.status).toBe(201)
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ onboardingCompleted: false, isActive: false })
    )
  })

  it('returns the existing user doc without creating a new profile when the uid already exists', async () => {
    docStore['users/user-123'] = { uid: 'user-123', email: 'sarah@test.com', role: 'NAILIST' }
    const res = await POST(makeRequest(validNailistBody))
    expect(res.status).toBe(200)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('creates a client profile (no onboardingCompleted field) for CLIENT role', async () => {
    const res = await POST(makeRequest({ ...validNailistBody, role: 'CLIENT' }))
    expect(res.status).toBe(201)
    expect(mockAdd).toHaveBeenCalledWith(
      expect.not.objectContaining({ onboardingCompleted: expect.anything() })
    )
  })
})
