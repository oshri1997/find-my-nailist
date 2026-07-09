import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'
import { batchFetchByIds } from '@/lib/batch-fetch'
import { batchResolveClientDisplayNames } from '@/lib/client-display-name'

export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request)) return adminUnauthorized()

  const db = adminDb()
  const snap = await db.collection(COLLECTIONS.REVIEWS).orderBy('createdAt', 'desc').limit(200).get()

  const nailistIds = [...new Set(snap.docs.map(d => d.data().nailistProfileId as string | undefined).filter((id): id is string => !!id))]
  const nailistProfiles = await batchFetchByIds(db, COLLECTIONS.NAILIST_PROFILES, nailistIds)
  const nailistMap: Record<string, string> = {}
  for (const [id, profile] of Object.entries(nailistProfiles)) {
    nailistMap[id] = (profile.businessName as string | undefined) ?? ''
  }

  // Older reviews can have an empty clientDisplayName (a snapshot frozen at
  // booking time) even though the client's profile has a real name today —
  // resolve those live instead of showing "—" forever, same as the public
  // nailist-profile reviews endpoint.
  const missingNameProfileIds = [...new Set(
    snap.docs
      .filter(d => !d.data().clientDisplayName)
      .map(d => d.data().clientProfileId as string | undefined)
      .filter((id): id is string => !!id)
  )]
  const resolvedNames = await batchResolveClientDisplayNames(db, missingNameProfileIds)

  const reviews = snap.docs.map(d => {
    const data = d.data()
    const nailistProfileId = data.nailistProfileId ?? ''
    const clientProfileId = data.clientProfileId as string | undefined
    return {
      id: d.id,
      nailistProfileId,
      nailistBusinessName: nailistMap[nailistProfileId] ?? '',
      clientDisplayName: data.clientDisplayName || (clientProfileId ? resolvedNames[clientProfileId] ?? '' : ''),
      rating: data.rating ?? 0,
      comment: data.comment ?? '',
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    }
  })

  return NextResponse.json({ data: reviews })
}
