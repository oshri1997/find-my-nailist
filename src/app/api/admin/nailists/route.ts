import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'
import { evaluateVerificationReadiness, type VerificationReadiness } from '@/lib/verification-readiness'

type ProfileRecord = Record<string, unknown> & { id: string }

function chunks<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size))
}

async function attachVerificationReadiness(db: ReturnType<typeof adminDb>, nailists: ProfileRecord[]): Promise<Map<string, VerificationReadiness>> {
  const profileIds = nailists.map((nailist) => nailist.id)
  const userIds = [...new Set(nailists.map((nailist) => nailist.userId).filter((userId): userId is string => typeof userId === 'string' && userId.length > 0))]
  const activeServices = new Map<string, number>()
  const activeWorkingHours = new Map<string, number>()
  const portfolioPhotos = new Map<string, number>()
  const emailVerified = new Map<string, boolean>()

  await Promise.all([
    ...chunks(profileIds, 30).map(async (profileIdChunk) => {
      const [services, hours, portfolio] = await Promise.all([
        db.collection(COLLECTIONS.SERVICES).where('nailistProfileId', 'in', profileIdChunk).get(),
        db.collection(COLLECTIONS.WORKING_HOURS).where('nailistProfileId', 'in', profileIdChunk).get(),
        db.collection(COLLECTIONS.PORTFOLIO_PHOTOS).where('nailistProfileId', 'in', profileIdChunk).get(),
      ])
      services.docs.forEach((doc) => {
        const data = doc.data()
        if (data.isActive === true) activeServices.set(data.nailistProfileId, (activeServices.get(data.nailistProfileId) ?? 0) + 1)
      })
      hours.docs.forEach((doc) => {
        const data = doc.data()
        if (data.isActive === true) activeWorkingHours.set(data.nailistProfileId, (activeWorkingHours.get(data.nailistProfileId) ?? 0) + 1)
      })
      portfolio.docs.forEach((doc) => {
        const profileId = doc.data().nailistProfileId
        if (typeof profileId === 'string') portfolioPhotos.set(profileId, (portfolioPhotos.get(profileId) ?? 0) + 1)
      })
    }),
    ...chunks(userIds, 100).map(async (userIdChunk) => {
      const result = await adminAuth().getUsers(userIdChunk.map((uid) => ({ uid })))
      result.users.forEach((user) => emailVerified.set(user.uid, user.emailVerified))
    }),
  ])

  return new Map(nailists.map((nailist) => [nailist.id, evaluateVerificationReadiness({
    ...nailist,
    emailVerified: emailVerified.get(nailist.userId as string) ?? false,
    onboardingCompleted: nailist.onboardingCompleted === true,
    activeServiceCount: activeServices.get(nailist.id) ?? 0,
    activeWorkingHoursCount: activeWorkingHours.get(nailist.id) ?? 0,
    portfolioPhotoCount: portfolioPhotos.get(nailist.id) ?? 0,
  })]))
}

export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request)) return adminUnauthorized()

  const db = adminDb()
  const snap = await db.collection(COLLECTIONS.NAILIST_PROFILES).orderBy('createdAt', 'desc').limit(200).get()

  const profiles = snap.docs.map(d => ({ id: d.id, ...d.data() })) as ProfileRecord[]
  const readinessByProfileId = await attachVerificationReadiness(db, profiles)

  const nailists = profiles.map(data => {
    return {
      id: data.id,
      userId: data.userId ?? '',
      businessName: data.businessName ?? '',
      city: data.city ?? '',
      isActive: data.isActive ?? false,
      isVerified: data.isVerified ?? false,
      avgRating: data.avgRating ?? 0,
      reviewCount: data.reviewCount ?? 0,
      createdAt: (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.()?.toISOString() ?? null,
      verificationReadiness: readinessByProfileId.get(data.id),
    }
  })

  return NextResponse.json({ data: nailists })
}
