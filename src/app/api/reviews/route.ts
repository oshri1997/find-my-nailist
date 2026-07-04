import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
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
    const data = createSchema.parse(body)
    const db = adminDb()

    // Verify the caller owns the clientProfileId they're submitting on behalf of
    const clientProfileSnap = await db
      .collection(COLLECTIONS.CLIENT_PROFILES)
      .where('userId', '==', decoded.uid)
      .limit(1)
      .get()
    const ownedProfileId = clientProfileSnap.empty ? null : clientProfileSnap.docs[0].id
    if (!ownedProfileId || ownedProfileId !== data.clientProfileId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify appointment exists, is completed, and actually belongs to the
    // claimed client/nailist pair — otherwise a client could rate any nailist
    // by citing an unrelated completed appointment of their own.
    const apptSnap = await db.collection(COLLECTIONS.APPOINTMENTS).doc(data.appointmentId).get()
    const apptData = apptSnap.data()
    if (
      !apptSnap.exists ||
      apptData?.status !== 'COMPLETED' ||
      apptData.clientProfileId !== data.clientProfileId ||
      apptData.nailistProfileId !== data.nailistProfileId
    ) {
      return NextResponse.json({ error: 'Invalid or incomplete appointment' }, { status: 400 })
    }

    // Atomically check for duplicate review and insert — prevents double-submit race
    const reviewRef = db.collection(COLLECTIONS.REVIEWS).doc()
    try {
      await db.runTransaction(async (tx) => {
        const dupSnap = await tx.get(
          db.collection(COLLECTIONS.REVIEWS)
            .where('appointmentId', '==', data.appointmentId)
            .limit(1)
        )
        if (!dupSnap.empty) throw new Error('DUPLICATE')
        const now = FieldValue.serverTimestamp()
        tx.set(reviewRef, { ...data, createdAt: now, updatedAt: now })
      })
    } catch (txErr) {
      if (txErr instanceof Error && txErr.message === 'DUPLICATE') {
        return NextResponse.json({ error: 'Review already submitted for this appointment' }, { status: 409 })
      }
      throw txErr
    }

    // Mark appointment as reviewed
    await db.collection(COLLECTIONS.APPOINTMENTS).doc(data.appointmentId).update({
      hasReview: true,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Update nailist avg rating incrementally (O(1), no N-doc scan)
    const nailistProfileSnap = await db.collection(COLLECTIONS.NAILIST_PROFILES).doc(data.nailistProfileId).get()
    const nailistProfile = nailistProfileSnap.data()
    const currentAvg = (nailistProfile?.avgRating ?? 0) as number
    const currentCount = (nailistProfile?.reviewCount ?? 0) as number
    const newCount = currentCount + 1
    const newAvg = Math.round(((currentAvg * currentCount + data.rating) / newCount) * 10) / 10

    await db.collection(COLLECTIONS.NAILIST_PROFILES).doc(data.nailistProfileId).update({
      avgRating: newAvg,
      reviewCount: newCount,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Notify nailist via email (fire-and-forget)
    void (async () => {
      try {
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

    return NextResponse.json({ data: { id: reviewRef.id } }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('POST /api/reviews error:', error)
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
  }
}
