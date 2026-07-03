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

    let onboardingCompleted = true
    if (role === 'NAILIST') {
      const profileSnap = await db
        .collection(COLLECTIONS.NAILIST_PROFILES)
        .where('userId', '==', decoded.uid)
        .limit(1)
        .get()
      // Missing field (profiles created before this flag existed) counts as
      // already onboarded — don't retroactively lock out existing accounts.
      onboardingCompleted = profileSnap.empty ? true : profileSnap.docs[0].data().onboardingCompleted !== false
    }

    return NextResponse.json({ role, isAdmin: data?.isAdmin === true, onboardingCompleted })
  } catch {
    return NextResponse.json({ role: null, isAdmin: false }, { status: 401 })
  }
}
