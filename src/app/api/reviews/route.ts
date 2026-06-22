import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'
import { sendNailistReviewEmail } from '@/lib/email'

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

    // Prevent duplicate reviews for the same appointment
    const dupSnap = await db
      .collection(COLLECTIONS.REVIEWS)
      .where('appointmentId', '==', data.appointmentId)
      .limit(1)
      .get()
    if (!dupSnap.empty) {
      return NextResponse.json({ error: 'Review already submitted for this appointment' }, { status: 409 })
    }

    const now = FieldValue.serverTimestamp()
    const ref = await db.collection(COLLECTIONS.REVIEWS).add({
      ...data,
      createdAt: now,
      updatedAt: now,
    })

    // Mark appointment as reviewed
    await db.collection(COLLECTIONS.APPOINTMENTS).doc(data.appointmentId).update({
      hasReview: true,
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

    // Notify nailist via email (fire-and-forget)
    void (async () => {
      try {
        const [nailistProfileSnap, apptData] = [
          await db.collection(COLLECTIONS.NAILIST_PROFILES).doc(data.nailistProfileId).get(),
          apptSnap.data()!,
        ]
        const nailistProfile = nailistProfileSnap.data()
        const nailistUserSnap = nailistProfile?.userId
          ? await db.collection(COLLECTIONS.USERS).doc(nailistProfile.userId).get()
          : null
        const nailistEmail: string | undefined =
          (nailistProfile?.email as string | undefined) ??
          (nailistUserSnap?.data()?.email as string | undefined)

        if (!nailistEmail) return

        await sendNailistReviewEmail({
          nailistEmail,
          nailistName: (nailistProfile?.businessName as string | undefined) ?? nailistEmail,
          clientName: data.clientDisplayName ?? (apptData.clientDisplayName as string | undefined) ?? 'לקוחה',
          rating: data.rating,
          comment: data.comment,
          serviceName: (apptData.serviceName as string | undefined) ?? '',
          appUrl: process.env.NEXT_PUBLIC_APP_URL,
        })
        console.log('[review] ✅ nailist review email sent to', nailistEmail)
      } catch (err) {
        console.error('[review] ❌ nailist review email failed:', err)
      }
    })()

    return NextResponse.json({ data: { id: ref.id } }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('POST /api/reviews error:', error)
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
  }
}
