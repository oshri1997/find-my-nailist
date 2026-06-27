import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let decoded: { uid: string }
  try {
    decoded = await adminAuth().verifyIdToken(token)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const db = adminDb()

    // Fetch photo to verify ownership before deleting
    const photoSnap = await db.collection(COLLECTIONS.PORTFOLIO_PHOTOS).doc(id).get()
    if (!photoSnap.exists) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    const nailistSnap = await db
      .collection(COLLECTIONS.NAILIST_PROFILES)
      .where('userId', '==', decoded.uid)
      .limit(1)
      .get()
    const ownedProfileId = nailistSnap.empty ? null : nailistSnap.docs[0].id
    if (!ownedProfileId || ownedProfileId !== photoSnap.data()?.nailistProfileId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.collection(COLLECTIONS.PORTFOLIO_PHOTOS).doc(id).delete()
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
  }
}
