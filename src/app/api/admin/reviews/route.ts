import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request)) return adminUnauthorized()

  const db = adminDb()
  const snap = await db.collection(COLLECTIONS.REVIEWS).orderBy('createdAt', 'desc').limit(200).get()

  const reviews = snap.docs.map(d => {
    const data = d.data()
    return {
      id: d.id,
      nailistProfileId: data.nailistProfileId ?? '',
      clientDisplayName: data.clientDisplayName ?? '',
      rating: data.rating ?? 0,
      comment: data.comment ?? '',
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    }
  })

  return NextResponse.json({ data: reviews })
}
