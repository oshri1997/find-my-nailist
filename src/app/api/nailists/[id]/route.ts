import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { geocodeAddress } from '@/lib/geocoding'
import { isAuthenticatedRequest, computeHasContactInfo, stripNailistContactFields } from '@/lib/nailist-contact'
import { z } from 'zod'

// Trust fields (isVerified, avgRating, reviewCount, userId) are deliberately
// excluded — those are computed/assigned server-side only, never client-writable.
const patchSchema = z.object({
  businessName: z.string().optional(),
  bio: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
  whatsappPhone: z.string().optional(),
  instagramUrl: z.string().optional(),
  tiktokUrl: z.string().optional(),
  coverPhotoUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
}).strict()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const isAuthenticated = await isAuthenticatedRequest(request)

    const db = adminDb()
    const snap = await db.collection(COLLECTIONS.NAILIST_PROFILES).doc(id).get()

    if (!snap.exists) {
      return NextResponse.json({ error: 'Nailist not found' }, { status: 404 })
    }

    const profileData = snap.data()!
    const hasContactInfo = computeHasContactInfo(profileData)
    if (!isAuthenticated) {
      stripNailistContactFields(profileData)
    }

    const [servicesSnap, portfolioSnap, hoursSnap, reviewsSnap] = await Promise.all([
      db.collection(COLLECTIONS.SERVICES)
        .where('nailistProfileId', '==', id)
        .where('isActive', '==', true)
        .get(),
      db.collection(COLLECTIONS.PORTFOLIO_PHOTOS)
        .where('nailistProfileId', '==', id)
        .get(),
      db.collection(COLLECTIONS.WORKING_HOURS)
        .where('nailistProfileId', '==', id)
        .where('isActive', '==', true)
        .orderBy('dayOfWeek')
        .get(),
      db.collection(COLLECTIONS.REVIEWS)
        .where('nailistProfileId', '==', id)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get(),
    ])

    return NextResponse.json({
      data: {
        id: snap.id,
        ...profileData,
        hasContactInfo,
        services: servicesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        portfolio: (portfolioSnap.docs
          .map((d) => ({ id: d.id, ...d.data() })) as Array<Record<string, unknown>>)
          .sort((a, b) => ((a['displayOrder'] as number) ?? 0) - ((b['displayOrder'] as number) ?? 0)),
        workingHours: hoursSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        reviews: reviewsSnap.docs.map((d) => {
          const rd = d.data()
          return {
            id: d.id,
            ...rd,
            createdAt: rd.createdAt?.toDate?.()?.toISOString() ?? rd.createdAt,
            updatedAt: rd.updatedAt?.toDate?.()?.toISOString() ?? rd.updatedAt,
          }
        }),
      },
    })
  } catch (error) {
    console.error(`GET /api/nailists/${id} error:`, error)
    return NextResponse.json({ error: 'Failed to fetch nailist' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const token = request.cookies.get('auth-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let decoded: { uid: string }
  try {
    decoded = await adminAuth().verifyIdToken(token)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = adminDb()

    // Verify caller owns this nailist profile
    const nailistSnap = await db
      .collection(COLLECTIONS.NAILIST_PROFILES)
      .where('userId', '==', decoded.uid)
      .limit(1)
      .get()
    const ownedProfileId = nailistSnap.empty ? null : nailistSnap.docs[0].id
    if (!ownedProfileId || ownedProfileId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = patchSchema.parse(await request.json())
    const { FieldValue } = await import('firebase-admin/firestore')

    const update: Record<string, unknown> = { ...body, updatedAt: FieldValue.serverTimestamp() }

    if (body.latitude != null && body.longitude != null) {
      // Coordinates supplied directly from Places Autocomplete — compute geohash only
      const { geohashForLocation } = await import('geofire-common')
      update.geohash = geohashForLocation([body.latitude as number, body.longitude as number])
    } else {
      const addressChanged = body.address || body.city
      if (addressChanged) {
        const addressStr = [body.address, body.city].filter(Boolean).join(', ')
        const geo = await geocodeAddress(addressStr)
        if (geo) {
          update.latitude = geo.lat
          update.longitude = geo.lng
          update.geohash = geo.geohash
        }
      }
    }

    await db.collection(COLLECTIONS.NAILIST_PROFILES).doc(id).update(update)

    return NextResponse.json({ message: 'Profile updated' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error(`PATCH /api/nailists/${id} error:`, error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
