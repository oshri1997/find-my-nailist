import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const decoded = await adminAuth().verifyIdToken(token)
    if (!decoded.email || !decoded.email_verified) {
      return NextResponse.json({ error: 'כתובת המייל עדיין לא אומתה' }, { status: 403 })
    }

    const db = adminDb()
    const batch = db.batch()
    batch.set(
      db.collection(COLLECTIONS.USERS).doc(decoded.uid),
      {
        email: decoded.email,
        pendingEmail: FieldValue.delete(),
        emailDeliveryStatus: FieldValue.delete(),
        emailDeliveryBouncedAt: FieldValue.delete(),
        emailDeliveryEventId: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    const profiles = await Promise.all([
      db.collection(COLLECTIONS.NAILIST_PROFILES).where('userId', '==', decoded.uid).get(),
      db.collection(COLLECTIONS.CLIENT_PROFILES).where('userId', '==', decoded.uid).get(),
    ])
    for (const snapshot of profiles) {
      for (const profile of snapshot.docs) {
        batch.update(profile.ref, { email: decoded.email, updatedAt: FieldValue.serverTimestamp() })
      }
    }
    await batch.commit()
    return NextResponse.json({ ok: true, email: decoded.email })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
