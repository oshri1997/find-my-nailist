import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ role: null, isAdmin: false }, { status: 401 })

    const decoded = await adminAuth().verifyIdToken(token)
    const db = adminDb()
    const snap = await db.collection(COLLECTIONS.USERS).doc(decoded.uid).get()

    if (!snap.exists) return NextResponse.json({ role: null, isAdmin: false })
    const data = snap.data()
    const role = data?.role ?? 'CLIENT'

    // Admin-only accounts have no client/nailist profile to check onboarding
    // against — they're always "onboarded" and skip that flow entirely.
    if (role === 'ADMIN') {
      return NextResponse.json({ role, isAdmin: true, onboardingCompleted: true })
    }

    const profileCollection = role === 'NAILIST' ? COLLECTIONS.NAILIST_PROFILES : COLLECTIONS.CLIENT_PROFILES
    const profileSnap = await db
      .collection(profileCollection)
      .where('userId', '==', decoded.uid)
      .limit(1)
      .get()
    // Missing field (profiles created before this flag existed, or no profile
    // yet) counts as already onboarded — don't retroactively lock out
    // existing accounts.
    const onboardingCompleted = profileSnap.empty ? true : profileSnap.docs[0].data().onboardingCompleted !== false

    return NextResponse.json({ role, isAdmin: data?.isAdmin === true, onboardingCompleted })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ role: null, isAdmin: false }, { status: 401 })
  }
}
