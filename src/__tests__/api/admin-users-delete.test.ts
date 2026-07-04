/**
 * @jest-environment node
 *
 * Covers admin user deletion cascading to everything connected to the
 * account: profile docs, sub-collections (services/hours/portfolio/
 * appointments/reviews), favorites in both directions, Storage files
 * (avatar/cover/portfolio photos), the Firestore user doc, and the Firebase
 * Auth account itself.
 */
import { NextRequest } from 'next/server'

type DocData = Record<string, unknown>
const collectionStore: Record<string, (DocData & { __id: string })[]> = {}
const deletedDocIds: Record<string, string[]> = {}
const deletedStorageKeys: string[] = []
const mockDeleteUser = jest.fn().mockResolvedValue(undefined)
const mockUpdateFn = jest.fn().mockResolvedValue(undefined)

function makeQuery(name: string, whereField?: string, whereValue?: unknown) {
  const filtered = () => (collectionStore[name] ?? []).filter(
    (d) => whereField === undefined || d[whereField] === whereValue
  )
  return {
    where: jest.fn().mockImplementation((field: string, _op: string, value: unknown) => makeQuery(name, field, value)),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockImplementation(async () => ({
      empty: filtered().length === 0,
      size: filtered().length,
      docs: filtered().map((d) => ({
        id: d.__id,
        data: () => d,
        ref: {
          delete: jest.fn().mockImplementation(() => {
            deletedDocIds[name] = [...(deletedDocIds[name] ?? []), d.__id]
            collectionStore[name] = (collectionStore[name] ?? []).filter((x) => x.__id !== d.__id)
          }),
          update: mockUpdateFn,
        },
      })),
    })),
  }
}

function makeCollectionRef(name: string) {
  return {
    ...makeQuery(name, undefined, undefined),
    doc: (id: string) => ({
      get: jest.fn().mockImplementation(async () => {
        const d = collectionStore[name]?.find((x) => x.__id === id)
        return { exists: !!d, data: () => d, id }
      }),
      delete: jest.fn().mockImplementation(() => {
        deletedDocIds[name] = [...(deletedDocIds[name] ?? []), id]
        collectionStore[name] = (collectionStore[name] ?? []).filter((x) => x.__id !== id)
      }),
      update: mockUpdateFn,
    }),
  }
}

let batchOps: Array<{ delete: () => void }> = []
const mockBatch = {
  delete: jest.fn((ref: { delete: () => void }) => {
    batchOps.push(ref)
  }),
  commit: jest.fn(async () => {
    batchOps.forEach((ref) => ref.delete())
    batchOps = []
  }),
}

const mockDb = {
  collection: jest.fn((name: string) => makeCollectionRef(name)),
  batch: jest.fn(() => mockBatch),
}

const mockBucketFile = jest.fn((key: string) => ({
  delete: jest.fn().mockImplementation(async () => {
    deletedStorageKeys.push(key)
  }),
}))

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({ deleteUser: mockDeleteUser })),
  adminDb: jest.fn(() => mockDb),
  adminStorage: jest.fn(() => ({ bucket: () => ({ file: mockBucketFile }) })),
}))

jest.mock('@/lib/admin-auth', () => ({
  verifyAdmin: jest.fn().mockResolvedValue({ uid: 'admin-1', email: 'admin@test.com' }),
  adminUnauthorized: () => new Response(JSON.stringify({ error: 'אין הרשאה' }), { status: 403 }),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

import { verifyAdmin } from '@/lib/admin-auth'
import { DELETE } from '@/app/api/admin/users/[id]/route'

const mockVerifyAdmin = verifyAdmin as jest.Mock

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/admin/users/target-uid', { method: 'DELETE' })
}

const mockParams = { params: Promise.resolve({ id: 'target-uid' }) }

function resetStore() {
  for (const key of Object.keys(collectionStore)) delete collectionStore[key]
  for (const key of Object.keys(deletedDocIds)) delete deletedDocIds[key]
  deletedStorageKeys.length = 0
  batchOps = []
}

describe('DELETE /api/admin/users/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetStore()
    mockVerifyAdmin.mockResolvedValue({ uid: 'admin-1', email: 'admin@test.com' })
  })

  it('returns 403 when not an admin', async () => {
    mockVerifyAdmin.mockResolvedValue(null)
    const res = await DELETE(makeRequest(), mockParams)
    expect(res.status).toBe(403)
  })

  it('returns 404 when the user does not exist', async () => {
    const res = await DELETE(makeRequest(), mockParams)
    expect(res.status).toBe(404)
  })

  it('refuses to delete an admin account', async () => {
    collectionStore.users = [{ __id: 'target-uid', role: 'NAILIST', isAdmin: true }]
    const res = await DELETE(makeRequest(), mockParams)
    expect(res.status).toBe(403)
  })

  it('cascades a NAILIST deletion to every connected doc, favorites in both directions, and Storage files', async () => {
    collectionStore.users = [{ __id: 'target-uid', role: 'NAILIST', photoUrl: 'https://accounts.google.com/pic.jpg' }]
    collectionStore.nailistProfiles = [{
      __id: 'profile-1', userId: 'target-uid',
      photoUrl: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/avatars%2Ftarget-uid%2Fprofile.jpg?alt=media',
      coverPhotoUrl: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/covers%2Fprofile-1%2Fcover.jpg?alt=media',
    }]
    collectionStore.services = [{ __id: 'svc-1', nailistProfileId: 'profile-1' }]
    collectionStore.portfolioPhotos = [
      { __id: 'photo-1', nailistProfileId: 'profile-1', storageKey: 'portfolio/profile-1/1.jpg' },
      { __id: 'photo-2', nailistProfileId: 'profile-1', storageKey: 'portfolio/profile-1/2.jpg' },
    ]
    collectionStore.workingHours = [{ __id: 'hours-1', nailistProfileId: 'profile-1' }]
    collectionStore.appointments = [{ __id: 'apt-1', nailistProfileId: 'profile-1' }]
    collectionStore.reviews = [{ __id: 'rev-1', nailistProfileId: 'profile-1' }]
    // Another client favorited this nailist — must be cleaned up too.
    collectionStore.favorites = [
      { __id: 'fav-1', userId: 'other-client-uid', nailistProfileId: 'profile-1' },
    ]

    const res = await DELETE(makeRequest(), mockParams)
    expect(res.status).toBe(200)

    expect(deletedDocIds.services).toEqual(['svc-1'])
    expect(deletedDocIds.portfolioPhotos).toEqual(expect.arrayContaining(['photo-1', 'photo-2']))
    expect(deletedDocIds.workingHours).toEqual(['hours-1'])
    expect(deletedDocIds.appointments).toEqual(['apt-1'])
    expect(deletedDocIds.reviews).toEqual(['rev-1'])
    expect(deletedDocIds.favorites).toEqual(['fav-1'])
    expect(deletedDocIds.nailistProfiles).toEqual(['profile-1'])
    expect(deletedDocIds.users).toEqual(['target-uid'])

    expect(deletedStorageKeys).toEqual(expect.arrayContaining([
      'avatars/target-uid/profile.jpg',
      'covers/profile-1/cover.jpg',
      'portfolio/profile-1/1.jpg',
      'portfolio/profile-1/2.jpg',
    ]))
    // The users doc's photoUrl is an external Google URL, not Storage — no key extracted for it.
    expect(deletedStorageKeys).not.toContain('https://accounts.google.com/pic.jpg')

    expect(mockDeleteUser).toHaveBeenCalledWith('target-uid')
  })

  it('cascades a CLIENT deletion, deletes their own favorites, and recalculates ratings for nailists they reviewed', async () => {
    collectionStore.users = [{ __id: 'target-uid', role: 'CLIENT' }]
    collectionStore.clientProfiles = [{
      __id: 'client-profile-1', userId: 'target-uid',
      photoUrl: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/avatars%2Ftarget-uid%2Fprofile.jpg?alt=media',
    }]
    collectionStore.appointments = [{ __id: 'apt-1', clientProfileId: 'client-profile-1' }]
    collectionStore.reviews = [
      { __id: 'rev-1', clientProfileId: 'client-profile-1', nailistProfileId: 'nailist-A', rating: 5 },
      { __id: 'rev-2', clientProfileId: 'client-profile-1', nailistProfileId: 'nailist-B', rating: 3 },
    ]
    // nailist-A has another review from someone else that must survive and be counted in the recalculation.
    collectionStore.reviews.push({ __id: 'rev-3', clientProfileId: 'someone-else', nailistProfileId: 'nailist-A', rating: 3 })
    collectionStore.nailistProfiles = [
      { __id: 'nailist-A', avgRating: 4, reviewCount: 2 },
      { __id: 'nailist-B', avgRating: 3, reviewCount: 1 },
    ]
    collectionStore.favorites = [{ __id: 'fav-1', userId: 'target-uid', nailistProfileId: 'nailist-A' }]

    const res = await DELETE(makeRequest(), mockParams)
    expect(res.status).toBe(200)

    expect(deletedDocIds.appointments).toEqual(['apt-1'])
    expect(deletedDocIds.reviews).toEqual(expect.arrayContaining(['rev-1', 'rev-2']))
    expect(deletedDocIds.reviews).not.toContain('rev-3')
    expect(deletedDocIds.clientProfiles).toEqual(['client-profile-1'])
    expect(deletedDocIds.favorites).toEqual(['fav-1'])
    expect(deletedStorageKeys).toContain('avatars/target-uid/profile.jpg')

    // nailist-A: rev-1 deleted, rev-3 (rating 3) survives -> avgRating recalculated to 3, reviewCount 1
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({ avgRating: 3, reviewCount: 1 })
    )
    // nailist-B: rev-2 deleted, no reviews left -> avgRating 0, reviewCount 0
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({ avgRating: 0, reviewCount: 0 })
    )

    expect(mockDeleteUser).toHaveBeenCalledWith('target-uid')
  })
})
