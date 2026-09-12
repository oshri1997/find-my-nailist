import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { evaluateVerificationReadiness } from '@/lib/verification-readiness'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const decoded = await adminAuth().verifyIdToken(token)
    const db = adminDb()
    const profileSnap = await db
      .collection(COLLECTIONS.NAILIST_PROFILES)
      .where('userId', '==', decoded.uid)
      .limit(1)
      .get()

    if (profileSnap.empty) return NextResponse.json({ data: null })

    const profile = profileSnap.docs[0]
    const profileData = profile.data()
    const [user, services, hours, portfolio] = await Promise.all([
      adminAuth().getUser(decoded.uid),
      db.collection(COLLECTIONS.SERVICES).where('nailistProfileId', '==', profile.id).get(),
      db.collection(COLLECTIONS.WORKING_HOURS).where('nailistProfileId', '==', profile.id).get(),
      db.collection(COLLECTIONS.PORTFOLIO_PHOTOS).where('nailistProfileId', '==', profile.id).get(),
    ])

    const readiness = evaluateVerificationReadiness({
      ...profileData,
      emailVerified: user.emailVerified,
      onboardingCompleted: profileData.onboardingCompleted === true,
      activeServiceCount: services.docs.filter((doc) => doc.data().isActive === true).length,
      activeWorkingHoursCount: hours.docs.filter((doc) => doc.data().isActive === true).length,
      portfolioPhotoCount: portfolio.size,
    })

    return NextResponse.json({ data: readiness })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch verification readiness' }, { status: 500 })
  }
}
