import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'
import { sendCancellationEmail } from '@/lib/email'

const schema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const decoded = await adminAuth().verifyIdToken(token)

    const body = await request.json()
    const { status } = schema.parse(body)
    const db = adminDb()

    const aptRef = db.collection(COLLECTIONS.APPOINTMENTS).doc(id)
    const aptSnap = await aptRef.get()
    if (!aptSnap.exists) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }
    const apt = aptSnap.data()!

    // Verify caller owns the nailist profile
    const nailistSnap = await db
      .collection(COLLECTIONS.NAILIST_PROFILES)
      .where('userId', '==', decoded.uid)
      .limit(1)
      .get()
    if (nailistSnap.empty || nailistSnap.docs[0].id !== apt.nailistProfileId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await aptRef.update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    })

    if (status === 'CANCELLED') {
      const [clientProfileSnap, nailistProfileSnap] = await Promise.all([
        db.collection(COLLECTIONS.CLIENT_PROFILES).doc(apt.clientProfileId).get(),
        nailistSnap.docs[0].ref.get(),
      ])
      const clientProfile = clientProfileSnap.data()
      const nailistProfile = nailistProfileSnap.data()

      const clientUserId = clientProfile?.userId
      const clientUserSnap = clientUserId
        ? await db.collection(COLLECTIONS.USERS).doc(clientUserId).get()
        : null
      const clientEmail: string | undefined =
        (clientProfile?.email as string | undefined) || (clientUserSnap?.data()?.email as string | undefined)

      if (clientEmail) {
        const startTime: Date = apt.startTime?.toDate?.() ?? new Date(apt.startTime)
        try {
          await sendCancellationEmail({
            clientEmail,
            clientName: (clientProfile?.displayName as string | undefined) ?? clientEmail,
            nailistBusinessName: nailistProfile?.businessName ?? '',
            serviceName: apt.serviceName,
            startTime,
          })
          console.log('[cancel] ✅ cancellation email sent to', clientEmail)
        } catch (emailErr) {
          console.error('[cancel] ❌ email failed for', clientEmail, '—', emailErr)
        }
      } else {
        console.warn('[cancel] ⚠️ no clientEmail found for appointment', id)
      }
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
