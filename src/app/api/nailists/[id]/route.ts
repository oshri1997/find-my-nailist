import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { geocodeAddress } from '@/lib/geocoding'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const db = adminDb()
    const snap = await db.collection(COLLECTIONS.NAILIST_PROFILES).doc(id).get()

    if (!snap.exists) {
      return NextResponse.json({ error: 'Nailist not found' }, { status: 404 })
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
        ...snap.data(),
        services: servicesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        portfolio: portfolioSnap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }))
          .sort((a, b) => ((a.displayOrder as number) ?? 0) - ((b.displayOrder as number) ?? 0)),
        workingHours: hoursSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        reviews: reviewsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
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
  try {
    const body = await request.json()
    const db = adminDb()
    const { FieldValue } = await import('firebase-admin/firestore')

    const update: Record<string, unknown> = { ...body, updatedAt: FieldValue.serverTimestamp() }

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

    await db.collection(COLLECTIONS.NAILIST_PROFILES).doc(id).update(update)

    return NextResponse.json({ message: 'Profile updated' })
  } catch (error) {
    console.error(`PATCH /api/nailists/${id} error:`, error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
