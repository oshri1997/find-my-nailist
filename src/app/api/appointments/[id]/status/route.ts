import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'
import { sendCancellationEmail, sendReviewRequestEmail } from '@/lib/email'

const schema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']),
})

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
    const body = await request.json()
    const { status } = schema.parse(body)
    const db = adminDb()

    // Fetch existing doc BEFORE update (ownership check + idempotency guard + email data)
    const existingSnap = await db.collection(COLLECTIONS.APPOINTMENTS).doc(id).get()
    if (!existingSnap.exists) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }
    const existingData = existingSnap.data()!
    const alreadyRequested = existingData.reviewRequested === true

    // Verify caller owns the nailist profile on this appointment
    const nailistProfileSnap = await db
      .collection(COLLECTIONS.NAILIST_PROFILES)
      .where('userId', '==', decoded.uid)
      .limit(1)
      .get()
    const ownedNailistProfileId = nailistProfileSnap.empty ? null : nailistProfileSnap.docs[0].id
    if (!ownedNailistProfileId || ownedNailistProfileId !== existingData.nailistProfileId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.collection(COLLECTIONS.APPOINTMENTS).doc(id).update({
      status,
      ...(status === 'COMPLETED' ? { reviewRequested: true } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    })

    if (status === 'COMPLETED') {
      void (async () => {
        try {
          if (alreadyRequested) return

          const [clientProfileSnap, nailistSnap] = await Promise.all([
            db.collection(COLLECTIONS.CLIENT_PROFILES).doc(existingData.clientProfileId).get(),
            db.collection(COLLECTIONS.NAILIST_PROFILES).doc(existingData.nailistProfileId).get(),
          ])
          const clientProfile = clientProfileSnap.data()
          const nailist = nailistSnap.data()

          const clientUserSnap = clientProfile?.userId
            ? await db.collection(COLLECTIONS.USERS).doc(clientProfile.userId).get()
            : null
          const clientEmail: string | undefined =
            (clientProfile?.email as string | undefined) ??
            (clientUserSnap?.data()?.email as string | undefined)

          if (!clientEmail) return

          await sendReviewRequestEmail({
            clientEmail,
            clientName: (existingData.clientDisplayName as string | undefined) ?? clientEmail,
            nailistBusinessName: (nailist?.businessName as string | undefined) ?? '',
            serviceName: existingData.serviceName as string,
            startTime: existingData.startTime?.toDate?.() ?? new Date(existingData.startTime),
            appointmentId: id,
            appUrl: process.env.NEXT_PUBLIC_APP_URL,
          })
          console.log(`[complete] ✅ review request email sent to ${clientEmail}`)
        } catch (err) {
          console.error('[complete] ❌ review request email failed', err)
        }
      })()
    }

    if (status === 'CANCELLED') {
      // fire-and-forget — reuse existingData to avoid a redundant Firestore read
      void (async () => {
        try {
          const [clientProfileSnap, nailistSnap] = await Promise.all([
            db.collection(COLLECTIONS.CLIENT_PROFILES).doc(existingData.clientProfileId).get(),
            db.collection(COLLECTIONS.NAILIST_PROFILES).doc(existingData.nailistProfileId).get(),
          ])

          const clientProfile = clientProfileSnap.data()
          const nailist = nailistSnap.data()

          const clientUserSnap = clientProfile?.userId
            ? await db.collection(COLLECTIONS.USERS).doc(clientProfile.userId).get()
            : null

          const clientEmail: string | undefined =
            (clientProfile?.email as string | undefined) ??
            (clientUserSnap?.data()?.email as string | undefined)

          if (!clientEmail) return

          await sendCancellationEmail({
            clientEmail,
            clientName: (clientProfile?.displayName as string | undefined) ?? clientEmail,
            nailistBusinessName: (nailist?.businessName as string | undefined) ?? '',
            serviceName: existingData.serviceName as string,
            startTime: existingData.startTime?.toDate?.() ?? new Date(existingData.startTime),
          })
          console.log(`[cancel] ✅ cancellation email sent to ${clientEmail}`)
        } catch (err) {
          console.error('[cancel] ❌ email failed', err)
        }
      })()
    }

    return NextResponse.json({ message: 'Status updated', status })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error(`PATCH /api/appointments/${id}/status error:`, error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}
