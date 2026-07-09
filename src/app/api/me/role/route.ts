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
    // isAdmin still reads from the real Firestore field (not assumed true) —
    // an ADMIN-role account whose admin access was revoked must lose panel
    // access immediately, not just have its role relabeled.
    if (role === 'ADMIN') {
      return NextResponse.json({ role, isAdmin: data?.isAdmin === true, onboardingCompleted: true, displayName: data?.displayName ?? null })
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
    const profileData = profileSnap.docs[0]?.data()
    const onboardingCompleted = profileSnap.empty ? true : profileData?.onboardingCompleted !== false

    // Prefer the name actually entered in the app over the Firebase Auth
    // SDK's own displayName — the latter is whatever the sign-in provider
    // (Google) happened to have on file, which can be a nickname/handle
    // unrelated to the name she gave us. CLIENT_PROFILES and
    // NAILIST_PROFILES store this under different fields (firstName+lastName
    // vs. businessName — a nailist profile never has firstName/lastName), so
    // which one to prefer depends on role. Fall back to the users doc's
    // displayName (set at registration) if the profile has no name yet.
    const appEnteredName = role === 'NAILIST'
      ? (profileData?.businessName as string | undefined)
      : (profileData?.firstName && profileData?.lastName ? `${profileData.firstName} ${profileData.lastName}` : undefined)
    const displayName = appEnteredName ?? data?.displayName ?? null

    return NextResponse.json({ role, isAdmin: data?.isAdmin === true, onboardingCompleted, displayName })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ role: null, isAdmin: false }, { status: 401 })
  }
}
