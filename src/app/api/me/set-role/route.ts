import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'

const schema = z.object({
  role: z.enum(['NAILIST', 'CLIENT']),
})

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const decoded = await adminAuth().verifyIdToken(token)
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const { role } = parsed.data
    const db = adminDb()
    const now = FieldValue.serverTimestamp()
    const uid = decoded.uid

    await db.collection(COLLECTIONS.USERS).doc(uid).update({ role, updatedAt: now })

    if (role === 'NAILIST') {
      const existing = await db
        .collection(COLLECTIONS.NAILIST_PROFILES)
        .where('userId', '==', uid)
        .limit(1)
        .get()

      if (existing.empty) {
        const userSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get()
        const userData = userSnap.data()
        await db.collection(COLLECTIONS.NAILIST_PROFILES).add({
          userId: uid,
          email: decoded.email ?? '',
          businessName: userData?.displayName || decoded.name || 'My Nail Studio',
          photoUrl: decoded.picture ?? null,
          // Hidden from search until onboarding's last step publishes the
          // profile (or she manually publishes early from the dashboard banner)
          // — an unfinished profile shouldn't be bookable.
          isActive: false,
          onboardingCompleted: false,
          isVerified: false,
          avgRating: 0,
          reviewCount: 0,
          createdAt: now,
          updatedAt: now,
        })
      }
    } else {
      // Deactivate any existing nailist profile so user doesn't appear in search
      const nailistSnap = await db
        .collection(COLLECTIONS.NAILIST_PROFILES)
        .where('userId', '==', uid)
        .limit(1)
        .get()
      if (!nailistSnap.empty) {
        await nailistSnap.docs[0].ref.update({ isActive: false, updatedAt: now })
      }

      const existing = await db
        .collection(COLLECTIONS.CLIENT_PROFILES)
        .where('userId', '==', uid)
        .limit(1)
        .get()

      if (existing.empty) {
        await db.collection(COLLECTIONS.CLIENT_PROFILES).add({
          userId: uid,
          email: decoded.email ?? '',
          createdAt: now,
          updatedAt: now,
        })
      }
    }

    return NextResponse.json({ data: { role } })
  } catch (error) {
    console.error('PATCH /api/me/set-role error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
