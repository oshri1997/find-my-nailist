/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

type DocData = Record<string, unknown>
let usersStore: (DocData & { __id: string })[] = []

function makeUsersQuery(limitN?: number) {
  return {
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockImplementation((n: number) => makeUsersQuery(n)),
    get: jest.fn().mockImplementation(async () => ({
      docs: (limitN !== undefined ? usersStore.slice(0, limitN) : usersStore)
        .map((d) => ({ id: d.__id, data: () => d })),
    })),
  }
}

const mockGetUsers = jest.fn()

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: jest.fn(() => ({ collection: jest.fn(() => makeUsersQuery()) })),
  adminAuth: jest.fn(() => ({ getUsers: mockGetUsers })),
}))

jest.mock('@/lib/admin-auth', () => ({
  verifyAdmin: jest.fn().mockResolvedValue({ uid: 'admin-1', email: 'admin@test.com' }),
  adminUnauthorized: () => new Response(JSON.stringify({ error: 'אין הרשאה' }), { status: 403 }),
}))

import { GET } from '@/app/api/admin/users/route'

function makeRequest(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/admin/users${query ? `?${query}` : ''}`)
}

describe('GET /api/admin/users — email verification status', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    usersStore = [
      { __id: 'u1', email: 'alice@test.com', displayName: 'Alice', role: 'CLIENT', createdAt: { toDate: () => new Date('2026-01-10') } },
      { __id: 'u2', email: 'bob@test.com', displayName: 'Bob', role: 'NAILIST', createdAt: { toDate: () => new Date('2026-02-15') } },
    ]
    mockGetUsers.mockResolvedValue({
      users: [
        { uid: 'u1', email: 'alice@test.com', emailVerified: false },
        { uid: 'u2', email: 'bob@test.com', emailVerified: true },
      ],
    })
  })

  it('does not touch Firebase Auth unless the flag is requested', async () => {
    const res = await GET(makeRequest())
    const json = await res.json()

    expect(mockGetUsers).not.toHaveBeenCalled()
    expect(json.data.every((u: { emailVerified: boolean | null }) => u.emailVerified === null)).toBe(true)
  })

  it('returns the Auth-side verification flag when requested', async () => {
    const res = await GET(makeRequest('withEmailVerified=1'))
    const json = await res.json()

    expect(json.data.find((u: { id: string }) => u.id === 'u1').emailVerified).toBe(false)
    expect(json.data.find((u: { id: string }) => u.id === 'u2').emailVerified).toBe(true)
  })

  it('reports null rather than false for a user missing an Auth record', async () => {
    mockGetUsers.mockResolvedValue({ users: [] })
    const res = await GET(makeRequest('withEmailVerified=1'))
    const json = await res.json()

    expect(json.data[0].emailVerified).toBeNull()
  })

  it('caps the Auth lookup so a wide scan cannot fan out indefinitely', async () => {
    usersStore = Array.from({ length: 450 }, (_, i) => ({
      __id: `u${i}`, email: `u${i}@test.com`, displayName: '', role: 'CLIENT',
      createdAt: { toDate: () => new Date('2026-01-10') },
    }))
    mockGetUsers.mockResolvedValue({ users: [] })

    await GET(makeRequest('search=test&withEmailVerified=1'))

    expect(mockGetUsers).toHaveBeenCalledTimes(3)
    expect(mockGetUsers.mock.calls.reduce((n, c) => n + c[0].length, 0)).toBe(300)
  })
})
