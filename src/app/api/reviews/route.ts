import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'

const createSchema = z.object({
  nailistProfileId: z.string(),
  clientProfileId: z.string(),
  appointmentId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  clientDisplayName: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createSchema.parse(body)
    const db = adminDb()

    // Verify appointment exists and is completed
    const apptSnap = await db.collection(COLLECTIONS.APPOINTMENTS).doc(data.appointmentId).get()
    if (!apptSnap.exists || apptSnap.data()?.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Invalid or incomplete appointment' }, { status: 400 })
    }

    const now = FieldValue.serverTimestamp()
    const ref = await db.collection(COLLECTIONS.REVIEWS).add({
      ...data,
      createdAt: now,
      updatedAt: now,
    })

    // Update nailist avg rating
    const reviewsSnap = await db
      .collection(COLLECTIONS.REVIEWS)
      .where('nailistProfileId', '==', data.nailistProfileId)
      .get()

    const ratings = reviewsSnap.docs.map((d) => d.data().rating as number)
    const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length

    await db.collection(COLLECTIONS.NAILIST_PROFILES).doc(data.nailistProfileId).update({
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount: ratings.length,
      updatedAt: now,
    })

    return NextResponse.json({ data: { id: ref.id } }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('POST /api/reviews error:', error)
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
  }
}
