import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'
import { israelWallClockToUtc } from '@/lib/booking-utils'

// Batch-resolves onboardingCompleted for a set of user ids by looking up
// their nailist/client profile docs (the flag lives there, not on the user
// doc itself). Missing field counts as already onboarded — same convention
// as /api/me/role — so it doesn't retroactively flag pre-existing accounts.
async function resolveOnboardingStatus(userIds: string[]): Promise<Map<string, boolean>> {
  const db = adminDb()
  const result = new Map<string, boolean>()
  if (userIds.length === 0) return result

  const chunks: string[][] = []
  for (let i = 0; i < userIds.length; i += 30) chunks.push(userIds.slice(i, i + 30))

  await Promise.all(
    [COLLECTIONS.NAILIST_PROFILES, COLLECTIONS.CLIENT_PROFILES].flatMap((collection) =>
      chunks.map(async (chunk) => {
        const snap = await db.collection(collection).where('userId', 'in', chunk).get()
        snap.docs.forEach((d) => {
          const data = d.data()
          result.set(data.userId, data.onboardingCompleted !== false)
        })
      })
    )
  )
  return result
}

// Whether an address is verified lives in Firebase Auth, not Firestore, so
// it costs a separate lookup (100 uids per call). The normal user list is
// capped at 200; a deliberate lifecycle filter scans the full list because
// silently omitting an old unverified account would make cleanup unsafe.
const EMAIL_VERIFIED_LOOKUP_CAP = 300

async function resolveEmailVerified(userIds: string[]): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>()
  for (let i = 0; i < userIds.length; i += 100) {
    const { users } = await adminAuth().getUsers(
      userIds.slice(i, i + 100).map((uid) => ({ uid }))
    )
    users.forEach((u) => result.set(u.uid, u.emailVerified))
  }
  return result
}

export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request)) return adminUnauthorized()

  const db = adminDb()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.toLowerCase() ?? ''
  const role = searchParams.get('role')
  const createdFrom = searchParams.get('createdFrom')
  const createdTo = searchParams.get('createdTo')
  const onboardingStatus = searchParams.get('onboardingStatus')
  const emailStatus = searchParams.get('emailStatus')
  const unverifiedAge = searchParams.get('unverifiedAge')
  const minimumUnverifiedAgeDays = unverifiedAge === 'OVER_7_DAYS' ? 7
    : unverifiedAge === 'OVER_30_DAYS' ? 30
      : unverifiedAge === 'OVER_90_DAYS' ? 90 : null

  const hasFilter = !!search || !!role || !!createdFrom || !!createdTo || !!onboardingStatus || !!emailStatus || minimumUnverifiedAgeDays !== null

  // Any filter must scan the full collection — capping at 200 before
  // filtering would silently miss any match outside the most-recent window.
  const usersQuery = hasFilter
    ? db.collection(COLLECTIONS.USERS).orderBy('createdAt', 'desc')
    : db.collection(COLLECTIONS.USERS).orderBy('createdAt', 'desc').limit(200)
  const usersSnap = await usersQuery.get()

  let users = usersSnap.docs.map(d => {
    const data = d.data()
    return {
      id: d.id,
      email: data.email ?? '',
      displayName: data.displayName ?? '',
      photoUrl: data.photoUrl ?? null,
      role: data.role ?? 'CLIENT',
      isAdmin: data.isAdmin === true,
      suspended: data.suspended === true,
      emailDeliveryStatus: data.emailDeliveryStatus ?? null,
      createdAt: data.createdAt?.toDate?.() ?? null,
    }
  })

  if (search) {
    users = users.filter(u => u.email.toLowerCase().includes(search) || u.displayName.toLowerCase().includes(search))
  }
  if (role === 'CLIENT' || role === 'NAILIST' || role === 'ADMIN') {
    users = users.filter(u => u.role === role)
  }
  if (emailStatus === 'BOUNCED' || emailStatus === 'SUPPRESSED') {
    users = users.filter(u => u.emailDeliveryStatus === emailStatus)
  }
  // The date-filter inputs are Israel wall-clock calendar days (the admin
  // picking a date has no idea the server runs in UTC) — a plain
  // `new Date(createdFrom)` parses an ISO date-only string as UTC midnight,
  // which is 2-3 hours off from Israel midnight and silently mis-buckets
  // any user created near a day boundary.
  if (createdFrom) {
    const from = israelWallClockToUtc(createdFrom, '00:00')
    users = users.filter(u => u.createdAt && u.createdAt >= from)
  }
  if (createdTo) {
    // Inclusive of the whole "to" day, in Israel wall-clock time.
    const to = new Date(israelWallClockToUtc(createdTo, '23:59').getTime() + 59_999)
    users = users.filter(u => u.createdAt && u.createdAt <= to)
  }

  let onboardingByUserId: Map<string, boolean> | null = null
  if (onboardingStatus === 'completed' || onboardingStatus === 'incomplete') {
    onboardingByUserId = await resolveOnboardingStatus(users.map(u => u.id))
    const wantCompleted = onboardingStatus === 'completed'
    users = users.filter(u => (onboardingByUserId!.get(u.id) ?? true) === wantCompleted)
  }

  const shouldResolveEmailVerified = searchParams.get('withEmailVerified') === '1' || minimumUnverifiedAgeDays !== null
  const emailVerifiedByUserId = shouldResolveEmailVerified
    ? await resolveEmailVerified(users.slice(0, minimumUnverifiedAgeDays === null ? EMAIL_VERIFIED_LOOKUP_CAP : users.length).map(u => u.id))
    : null

  if (minimumUnverifiedAgeDays !== null) {
    const oldestEligibleDate = Date.now() - minimumUnverifiedAgeDays * 24 * 60 * 60 * 1000
    users = users.filter(u =>
      !u.isAdmin &&
      emailVerifiedByUserId?.get(u.id) === false &&
      u.createdAt !== null &&
      u.createdAt.getTime() <= oldestEligibleDate
    )
  }

  return NextResponse.json({
    data: users.map(u => ({
      ...u,
      createdAt: u.createdAt?.toISOString() ?? null,
      onboardingCompleted: onboardingByUserId?.get(u.id) ?? null,
      emailVerified: emailVerifiedByUserId?.get(u.id) ?? null,
    })),
  })
}
