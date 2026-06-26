import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'
import { FieldValue } from 'firebase-admin/firestore'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!await verifyAdmin(request)) return adminUnauthorized()

  const db = adminDb()
  const reviewSnap = await db.collection(COLLECTIONS.REVIEWS).doc(params.id).get()
  if (!reviewSnap.exists) return NextResponse.json({ error: 'ביקורת לא נמצאה' }, { status: 404 })

  const { nailistProfileId } = reviewSnap.data()!

  await reviewSnap.ref.delete()

  // Recalculate avgRating for the nailist
  const remainingSnap = await db.collection(COLLECTIONS.REVIEWS)
    .where('nailistProfileId', '==', nailistProfileId).get()

  const count = remainingSnap.size
  const avg = count > 0
    ? remainingSnap.docs.reduce((sum, d) => sum + (d.data().rating ?? 0), 0) / count
    : 0

  await db.collection(COLLECTIONS.NAILIST_PROFILES).doc(nailistProfileId).update({
    avgRating: Math.round(avg * 10) / 10,
    reviewCount: count,
    updatedAt: FieldValue.serverTimestamp(),
  })

  return NextResponse.json({ message: 'הביקורת נמחקה' })
}
