import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
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
  try {
    const body = await request.json()
    const { status } = schema.parse(body)
    const db = adminDb()

    await db.collection(COLLECTIONS.APPOINTMENTS).doc(id).update({
      status,
      ...(status === 'COMPLETED' ? { reviewRequested: true } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    })

    if (status === 'COMPLETED') {
      void (async () => {
        try {
          const apptSnap = await db.collection(COLLECTIONS.APPOINTMENTS).doc(id).get()
          const appt = apptSnap.data()
          if (!appt || appt.reviewRequested) return

          const [clientProfileSnap, nailistSnap] = await Promise.all([
            db.collection(COLLECTIONS.CLIENT_PROFILES).doc(appt.clientProfileId).get(),
            db.collection(COLLECTIONS.NAILIST_PROFILES).doc(appt.nailistProfileId).get(),
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
            clientName: (appt.clientDisplayName as string | undefined) ?? clientEmail,
            nailistBusinessName: (nailist?.businessName as string | undefined) ?? '',
            serviceName: appt.serviceName as string,
            startTime: appt.startTime?.toDate?.() ?? new Date(appt.startTime),
            appUrl: process.env.NEXT_PUBLIC_APP_URL,
          })
          console.log(`[complete] ✅ review request email sent to ${clientEmail}`)
        } catch (err) {
          console.error('[complete] ❌ review request email failed', err)
        }
      })()
    }

    if (status === 'CANCELLED') {
      // fire-and-forget — don't block the response
      void (async () => {
        try {
          const apptSnap = await db.collection(COLLECTIONS.APPOINTMENTS).doc(id).get()
          const appt = apptSnap.data()
          if (!appt) return

          const [clientProfileSnap, nailistSnap] = await Promise.all([
            db.collection(COLLECTIONS.CLIENT_PROFILES).doc(appt.clientProfileId).get(),
            db.collection(COLLECTIONS.NAILIST_PROFILES).doc(appt.nailistProfileId).get(),
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
            serviceName: appt.serviceName as string,
            startTime: appt.startTime?.toDate?.() ?? new Date(appt.startTime),
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
