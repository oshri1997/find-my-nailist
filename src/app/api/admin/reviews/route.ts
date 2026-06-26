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

  const reviews = snap.docs.map(d => {
    const data = d.data()
    const nailistProfileId = data.nailistProfileId ?? ''
    return {
      id: d.id,
      nailistProfileId,
      nailistBusinessName: nailistMap[nailistProfileId] ?? '',
      clientDisplayName: data.clientDisplayName ?? '',
      rating: data.rating ?? 0,
      comment: data.comment ?? '',
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    }
  })

  return NextResponse.json({ data: reviews })
}
