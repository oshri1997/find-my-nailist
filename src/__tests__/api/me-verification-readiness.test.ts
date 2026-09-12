/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockVerifyIdToken = jest.fn()
const mockGetUser = jest.fn()
const collectionStore: Record<string, Array<Record<string, unknown> & { __id: string }>> = {}
const whereCalls = jest.fn()

function collection(name: string) {
  return {
    where: jest.fn((field: string, _operator: string, value: unknown) => {
      whereCalls(name, field, value)
      const matching = (collectionStore[name] ?? []).filter((record) => record[field] === value)
      return {
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: matching.length === 0,
          size: matching.length,
          docs: matching.map((record) => ({ id: record.__id, data: () => record })),
        }),
      }
    }),
  }
}

const mockDb = { collection: jest.fn(collection) }

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({ verifyIdToken: mockVerifyIdToken, getUser: mockGetUser })),
  adminDb: jest.fn(() => mockDb),
}))

import { GET } from '@/app/api/me/verification-readiness/route'

function makeRequest(withCookie = true): NextRequest {
  const request = new NextRequest('http://localhost/api/me/verification-readiness', { method: 'GET' })
  if (withCookie) {
    Object.defineProperty(request, 'cookies', {
      get: () => ({ get: (name: string) => name === 'auth-token' ? { value: 'valid-token' } : undefined }),
    })
  }
  return request
}

describe('GET /api/me/verification-readiness', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockVerifyIdToken.mockResolvedValue({ uid: 'owner-1' })
    mockGetUser.mockResolvedValue({ emailVerified: true })
    collectionStore.nailistProfiles = [{
      __id: 'owner-profile', userId: 'owner-1', onboardingCompleted: true, businessName: 'Studio', city: 'Tel Aviv',
      address: '1 Main St', phoneNumber: '', photoUrl: 'photo.jpg', instagramUrl: 'https://instagram.com/studio',
    }]
    collectionStore.services = [{ __id: 'service-1', nailistProfileId: 'owner-profile', isActive: true }]
    collectionStore.workingHours = [{ __id: 'hours-1', nailistProfileId: 'owner-profile', isActive: true }]
    collectionStore.portfolioPhotos = [
      { __id: 'photo-1', nailistProfileId: 'owner-profile' },
      { __id: 'photo-2', nailistProfileId: 'owner-profile' },
      { __id: 'photo-3', nailistProfileId: 'owner-profile' },
    ]
  })

  it('rejects unauthenticated requests', async () => {
    expect((await GET(makeRequest(false))).status).toBe(401)
  })

  it('evaluates only authenticated owner profile and returns all missing requirements', async () => {
    const response = await GET(makeRequest())
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(whereCalls).toHaveBeenCalledWith('nailistProfiles', 'userId', 'owner-1')
    expect(json.data.checks.filter((check: { passed: boolean }) => !check.passed).map((check: { missing: string }) => check.missing))
      .toEqual(['טלפון או וואטסאפ', 'הוסיפי עוד 2 תמונות לתיק העבודות'])
    expect(mockGetUser).toHaveBeenCalledWith('owner-1')
  })

  it('returns null when authenticated user has no nailist profile', async () => {
    collectionStore.nailistProfiles = []

    const response = await GET(makeRequest())
    expect(await response.json()).toEqual({ data: null })
    expect(mockGetUser).not.toHaveBeenCalled()
  })
})
