import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue } from 'firebase-admin/firestore'
import { sendClientConfirmedEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://find-my-nailist-production.up.railway.app'
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(`${appUrl}/appointments/confirmed?error=invalid`)
  }

  try {
    const db = adminDb()

    const snap = await db
      .collection(COLLECTIONS.APPOINTMENTS)
      .where('confirmToken', '==', token)
      .limit(1)
      .get()

    if (snap.empty) {
      return NextResponse.redirect(`${appUrl}/appointments/confirmed?error=invalid`)
    }

    const doc = snap.docs[0]
    const apt = doc.data()

    const expiresAt: Date = apt.confirmTokenExpiresAt?.toDate?.() ?? new Date(0)
    if (new Date() > expiresAt) {
      return NextResponse.redirect(`${appUrl}/appointments/confirmed?error=expired`)
    }

    if (apt.status !== 'PENDING') {
      return NextResponse.redirect(`${appUrl}/appointments/confirmed?already=1`)
    }

    await doc.ref.update({
      status: 'CONFIRMED',
      confirmToken: FieldValue.delete(),
      confirmTokenExpiresAt: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Look up client email (CLIENT_PROFILES may lack email — fall back to USERS)
    const [clientProfileSnap, nailistSnap] = await Promise.all([
      db.collection(COLLECTIONS.CLIENT_PROFILES).doc(apt.clientProfileId).get(),
      db.collection(COLLECTIONS.NAILIST_PROFILES).doc(apt.nailistProfileId).get(),
    ])
    const clientProfile = clientProfileSnap.data()
    const nailistBusinessName: string = nailistSnap.data()?.businessName ?? ''

    const clientUserId = clientProfile?.userId
    const clientUserSnap = clientUserId
      ? await db.collection(COLLECTIONS.USERS).doc(clientUserId).get()
      : null
    const clientEmail: string | undefined = clientProfile?.email || clientUserSnap?.data()?.email

    console.log('[confirm] clientProfileId:', apt.clientProfileId,
      '| clientProfile.email:', clientProfile?.email,
      '| clientUserId:', clientUserId,
      '| userEmail:', clientUserSnap?.data()?.email,
      '| resolved clientEmail:', clientEmail)

    if (clientEmail) {
      const startTime: Date = apt.startTime?.toDate?.() ?? new Date(apt.startTime)
      try {
        await sendClientConfirmedEmail({
          clientEmail,
          clientName: clientProfile?.displayName ?? clientEmail,
          nailistBusinessName,
          serviceName: apt.serviceName,
          startTime,
          price: apt.price,
          currency: apt.currency,
        })
        console.log('[confirm] client confirmation email sent to', clientEmail)
      } catch (emailErr) {
        console.error('[confirm] failed to send client email:', emailErr)
      }
    } else {
      console.warn('[confirm] no clientEmail found — skipping confirmation email')
    }

    return NextResponse.redirect(`${appUrl}/appointments/confirmed`)
  } catch (err) {
    console.error('Confirm appointment error:', err)
    return NextResponse.redirect(`${appUrl}/appointments/confirmed?error=server`)
  }
}
