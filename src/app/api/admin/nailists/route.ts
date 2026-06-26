import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request)) return adminUnauthorized()

  const db = adminDb()
  const snap = await db.collection(COLLECTIONS.NAILIST_PROFILES).orderBy('createdAt', 'desc').limit(200).get()

  const nailists = snap.docs.map(d => {
    const data = d.data()
    return {
      id: d.id,
      userId: data.userId ?? '',
      businessName: data.businessName ?? '',
      city: data.city ?? '',
      isActive: data.isActive ?? false,
      isVerified: data.isVerified ?? false,
      avgRating: data.avgRating ?? 0,
      reviewCount: data.reviewCount ?? 0,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    }
  })

  return NextResponse.json({ data: nailists })
}
