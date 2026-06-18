import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue } from 'firebase-admin/firestore'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const decoded = await adminAuth().verifyIdToken(token)
    const db = adminDb()

    const snap = await db
      .collection(COLLECTIONS.NAILIST_PROFILES)
      .where('userId', '==', decoded.uid)
      .limit(1)
      .get()

    if (!snap.empty) {
      const doc = snap.docs[0]
      return NextResponse.json({ data: { id: doc.id, ...doc.data() } })
    }

    // Auto-create a minimal profile for users who signed in with Google
    // without going through the register flow
    const now = FieldValue.serverTimestamp()
    const ref = await db.collection(COLLECTIONS.NAILIST_PROFILES).add({
      userId: decoded.uid,
      businessName: decoded.name ?? decoded.email?.split('@')[0] ?? 'My Nail Studio',
      email: decoded.email ?? '',
      isActive: false,
      isVerified: false,
      avgRating: 0,
      reviewCount: 0,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({
      data: {
        id: ref.id,
        userId: decoded.uid,
        businessName: decoded.name ?? decoded.email?.split('@')[0] ?? 'My Nail Studio',
        email: decoded.email ?? '',
        isActive: false,
        isVerified: false,
        avgRating: 0,
        reviewCount: 0,
      },
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

