import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { sendRoleAwareVerificationEmail } from '@/lib/verification-email'

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
          // Hidden behind OnboardingGuard until /onboarding/client's name
          // step completes — otherwise this client could book/review with
          // no firstName/lastName ever collected, permanently showing
          // "לקוחה" instead of a real name. Mirrors the NAILIST branch above.
          onboardingCompleted: false,
          createdAt: now,
          updatedAt: now,
        })
      }
    }

    // Registration itself no longer sends a verification email — at that
    // point the role isn't chosen yet, so the copy couldn't be role-aware.
    // This is the first moment the role is definitively known (Google
    // sign-ins land here too, though their email is already
    // provider-verified, so the send is skipped for them).
    if (!decoded.email_verified && decoded.email) {
      try {
        const result = await sendRoleAwareVerificationEmail(uid, decoded.email, role)
        // A retried/duplicate PATCH within the 10-minute cooldown (e.g. a
        // double-submit, or the client retrying after a slow response) is a
        // no-op here rather than a second real send attempt — the cooldown
        // check lives inside sendRoleAwareVerificationEmail itself now.
        if (!result.ok) {
          console.log('[set-role] verification email skipped (cooldown active)')
        }
      } catch (err) {
        console.error('[set-role] verification email send failed:', err)
      }
    }

    return NextResponse.json({ data: { role } })
  } catch (error) {
    console.error('PATCH /api/me/set-role error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
