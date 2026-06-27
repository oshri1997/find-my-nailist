import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let uid: string
  try {
    const decoded = await adminAuth().verifyIdToken(token)
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = adminDb()
  const snap = await db
    .collection(COLLECTIONS.FAVORITES)
    .where('userId', '==', uid)
    .orderBy('createdAt', 'desc')
    .get()

  if (snap.empty) return NextResponse.json({ data: [] })

  const nailistIds = snap.docs.map(d => d.data().nailistProfileId as string)

  const profileSnaps = await Promise.all(
    nailistIds.map(id => db.collection(COLLECTIONS.NAILIST_PROFILES).doc(id).get())
  )

  const data = profileSnaps
    .filter(s => s.exists)
    .map(s => {
      const d = s.data()!
      return {
        id: s.id,
        businessName: d.businessName ?? '',
        city: d.city ?? null,
        bio: d.bio ?? null,
        avgRating: d.avgRating ?? 0,
        reviewCount: d.reviewCount ?? 0,
        coverPhotoUrl: d.coverPhotoUrl ?? null,
        photoUrl: d.photoUrl ?? null,
        whatsappPhone: d.whatsappPhone ?? null,
      }
    })

  return NextResponse.json({ data })
}
