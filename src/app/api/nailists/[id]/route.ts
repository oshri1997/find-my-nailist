import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'

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
        .orderBy('displayOrder')
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
        portfolio: portfolioSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
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

    await db.collection(COLLECTIONS.NAILIST_PROFILES).doc(id).update({
      ...body,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ message: 'Profile updated' })
  } catch (error) {
    console.error(`PATCH /api/nailists/${id} error:`, error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
