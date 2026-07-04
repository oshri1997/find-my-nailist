import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'

const createUserSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  photoUrl: z.string().url().optional(),
  role: z.enum(['CLIENT', 'NAILIST']).default('CLIENT'),
  address: z.string().optional(),
  city: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

export async function POST(request: NextRequest) {
  // Without this, any request (no session needed) could pass an arbitrary
  // uid/email/role and either create a profile for a uid it doesn't own or
  // race a not-yet-provisioned uid to plant an attacker-chosen role/email.
  const token = request.cookies.get('auth-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let decoded: { uid: string }
  try {
    decoded = await adminAuth().verifyIdToken(token)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data = createUserSchema.parse(body)

    if (data.uid !== decoded.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = adminDb()

    const userRef = db.collection(COLLECTIONS.USERS).doc(data.uid)
    const snap = await userRef.get()

    if (snap.exists) {
      return NextResponse.json({ data: { id: snap.id, ...snap.data() } })
    }

    const now = FieldValue.serverTimestamp()
    await userRef.set({ ...data, createdAt: now, updatedAt: now })

    if (data.role === 'NAILIST') {
      const profileData: Record<string, unknown> = {
        userId: data.uid,
        email: data.email,
        businessName: data.displayName ?? 'My Nail Studio',
        photoUrl: data.photoUrl ?? null,
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
      }
      if (data.address) profileData.address = data.address
      if (data.city) profileData.city = data.city
      if (data.latitude != null && data.longitude != null) {
        profileData.latitude = data.latitude
        profileData.longitude = data.longitude
        const { geohashForLocation } = await import('geofire-common')
        profileData.geohash = geohashForLocation([data.latitude, data.longitude])
      }
      await db.collection(COLLECTIONS.NAILIST_PROFILES).add(profileData)
    } else {
      await db.collection(COLLECTIONS.CLIENT_PROFILES).add({
        userId: data.uid,
        createdAt: now,
        updatedAt: now,
      })
    }

    return NextResponse.json({ data: { id: data.uid, ...data } }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('POST /api/users error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
