import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'

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

export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request)) return adminUnauthorized()

  const db = adminDb()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.toLowerCase() ?? ''
  const role = searchParams.get('role')
  const createdFrom = searchParams.get('createdFrom')
  const createdTo = searchParams.get('createdTo')
  const onboardingStatus = searchParams.get('onboardingStatus')

  const hasFilter = !!search || !!role || !!createdFrom || !!createdTo || !!onboardingStatus

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
      createdAt: data.createdAt?.toDate?.() ?? null,
    }
  })

  if (search) {
    users = users.filter(u => u.email.toLowerCase().includes(search) || u.displayName.toLowerCase().includes(search))
  }
  if (role === 'CLIENT' || role === 'NAILIST') {
    users = users.filter(u => u.role === role)
  }
  if (createdFrom) {
    const from = new Date(createdFrom)
    users = users.filter(u => u.createdAt && u.createdAt >= from)
  }
  if (createdTo) {
    // Inclusive of the whole "to" day
    const to = new Date(createdTo)
    to.setHours(23, 59, 59, 999)
    users = users.filter(u => u.createdAt && u.createdAt <= to)
  }

  let onboardingByUserId: Map<string, boolean> | null = null
  if (onboardingStatus === 'completed' || onboardingStatus === 'incomplete') {
    onboardingByUserId = await resolveOnboardingStatus(users.map(u => u.id))
    const wantCompleted = onboardingStatus === 'completed'
    users = users.filter(u => (onboardingByUserId!.get(u.id) ?? true) === wantCompleted)
  }

  return NextResponse.json({
    data: users.map(u => ({
      ...u,
      createdAt: u.createdAt?.toISOString() ?? null,
      onboardingCompleted: onboardingByUserId?.get(u.id) ?? null,
    })),
  })
}
