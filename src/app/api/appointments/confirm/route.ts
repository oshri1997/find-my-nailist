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

    // Look up client email
    const clientProfileSnap = await db.collection(COLLECTIONS.CLIENT_PROFILES).doc(apt.clientProfileId).get()
    const clientProfile = clientProfileSnap.data()
    const clientUserId = clientProfile?.userId
    const clientUserSnap = clientUserId
      ? await db.collection(COLLECTIONS.USERS).doc(clientUserId).get()
      : null
    const clientEmail: string | undefined = clientProfile?.email || clientUserSnap?.data()?.email

    // Look up nailist business name
    const nailistSnap = await db.collection(COLLECTIONS.NAILIST_PROFILES).doc(apt.nailistProfileId).get()
    const nailistBusinessName: string = nailistSnap.data()?.businessName ?? ''

    if (clientEmail) {
      const startTime: Date = apt.startTime?.toDate?.() ?? new Date(apt.startTime)
      await sendClientConfirmedEmail({
        clientEmail,
        clientName: clientProfile?.displayName ?? clientEmail,
        nailistBusinessName,
        serviceName: apt.serviceName,
        startTime,
        price: apt.price,
        currency: apt.currency,
      })
    }

    return NextResponse.redirect(`${appUrl}/appointments/confirmed`)
  } catch (err) {
    console.error('Confirm appointment error:', err)
    return NextResponse.redirect(`${appUrl}/appointments/confirmed?error=server`)
  }
}
