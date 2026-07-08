import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request)) return adminUnauthorized()

  const db = adminDb()
  const snap = await db.collection(COLLECTIONS.REVIEWS).orderBy('createdAt', 'desc').limit(200).get()

  // Batch-fetch nailist profiles to resolve business names
  const nailistIds = [...new Set(snap.docs.map(d => d.data().nailistProfileId).filter(Boolean))]
  const nailistMap: Record<string, string> = {}
  if (nailistIds.length > 0) {
    // Firestore 'in' query supports up to 30 items; chunk if needed
    const chunks: string[][] = []
    for (let i = 0; i < nailistIds.length; i += 30) chunks.push(nailistIds.slice(i, i + 30))
    await Promise.all(
      chunks.map(async chunk => {
        const profilesSnap = await db.collection(COLLECTIONS.NAILIST_PROFILES)
          .where('__name__', 'in', chunk).get()
        profilesSnap.docs.forEach(d => {
          nailistMap[d.id] = d.data().businessName ?? ''
        })
      })
    )
  }

  // Older reviews can have an empty clientDisplayName (a snapshot frozen at
  // booking time) even though the client's profile has a real name today —
  // resolve those live instead of showing "—" forever, same as the public
  // nailist-profile reviews endpoint.
  const clientProfileIds = [...new Set(
    snap.docs.filter(d => !d.data().clientDisplayName).map(d => d.data().clientProfileId).filter(Boolean)
  )]
  const clientProfileMap: Record<string, Record<string, unknown>> = {}
  if (clientProfileIds.length > 0) {
    const chunks: string[][] = []
    for (let i = 0; i < clientProfileIds.length; i += 30) chunks.push(clientProfileIds.slice(i, i + 30))
    await Promise.all(
      chunks.map(async chunk => {
        const profilesSnap = await db.collection(COLLECTIONS.CLIENT_PROFILES)
          .where('__name__', 'in', chunk).get()
        profilesSnap.docs.forEach(d => { clientProfileMap[d.id] = d.data() })
      })
    )
  }
  const missingUserIds = [...new Set(
    Object.values(clientProfileMap)
      .filter(p => !(p.firstName && p.lastName) && !p.displayName && p.userId)
      .map(p => p.userId as string)
  )]
  const userDisplayNameMap: Record<string, string> = {}
  if (missingUserIds.length > 0) {
    const chunks: string[][] = []
    for (let i = 0; i < missingUserIds.length; i += 30) chunks.push(missingUserIds.slice(i, i + 30))
    await Promise.all(
      chunks.map(async chunk => {
        const usersSnap = await db.collection(COLLECTIONS.USERS).where('__name__', 'in', chunk).get()
        usersSnap.docs.forEach(d => { userDisplayNameMap[d.id] = d.data().displayName ?? '' })
      })
    )
  }

  function resolveClientDisplayName(clientProfileId: string | undefined): string {
    const profile = clientProfileId ? clientProfileMap[clientProfileId] : undefined
    if (!profile) return ''
    if (profile.firstName && profile.lastName) return `${profile.firstName} ${profile.lastName}`
    if (profile.displayName) return profile.displayName as string
    const userId = profile.userId as string | undefined
    return (userId && userDisplayNameMap[userId]) || ''
  }

  const reviews = snap.docs.map(d => {
    const data = d.data()
    const nailistProfileId = data.nailistProfileId ?? ''
    return {
      id: d.id,
      nailistProfileId,
      nailistBusinessName: nailistMap[nailistProfileId] ?? '',
      clientDisplayName: data.clientDisplayName || resolveClientDisplayName(data.clientProfileId),
      rating: data.rating ?? 0,
      comment: data.comment ?? '',
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    }
  })

  return NextResponse.json({ data: reviews })
}
