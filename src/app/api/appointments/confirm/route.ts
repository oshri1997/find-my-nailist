import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue } from 'firebase-admin/firestore'
import { sendClientConfirmedEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nailistiot.fun'
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

    // Transactional check-then-update — a plain read-then-write here would let
    // two concurrent GETs (double-click, or an email-security scanner
    // prefetching the link before a human opens it) both observe PENDING and
    // both flip to CONFIRMED, each firing its own confirmation email.
    const currentStatus = await db.runTransaction(async (tx) => {
      const freshSnap = await tx.get(doc.ref)
      const freshApt = freshSnap.data()!
      if (freshApt.status !== 'PENDING') return freshApt.status as string
      tx.update(doc.ref, {
        status: 'CONFIRMED',
        confirmToken: FieldValue.delete(),
        confirmTokenExpiresAt: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      return null
    })

    if (currentStatus !== null) {
      // Report the appointment's real current status — "already confirmed"
      // would be actively misleading for one that was actually auto-cancelled
      // (e.g. a stale-PENDING cleanup) in the meantime.
      return NextResponse.redirect(`${appUrl}/appointments/confirmed?already=1&status=${currentStatus}`)
    }

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
    const clientEmail: string | undefined =
      (clientProfile?.email as string | undefined) || (clientUserSnap?.data()?.email as string | undefined)

    console.log('[confirm] clientProfileId:', apt.clientProfileId,
      '| clientProfile.email:', clientProfile?.email,
      '| clientUserId:', clientUserId,
      '| userEmail:', clientUserSnap?.data()?.email,
      '| resolved clientEmail:', clientEmail)

    let emailSent = false
    if (clientEmail) {
      const startTime: Date = apt.startTime?.toDate?.() ?? new Date(apt.startTime)
      try {
        await sendClientConfirmedEmail({
          clientEmail,
          clientName: (clientProfile?.displayName as string | undefined) ?? clientEmail,
          nailistBusinessName,
          serviceName: apt.serviceName,
          startTime,
          price: apt.price,
          currency: apt.currency,
        })
        emailSent = true
        console.log('[confirm] ✅ confirmation email sent to', clientEmail)
      } catch (emailErr) {
        console.error('[confirm] ❌ email failed for', clientEmail, '—', emailErr)
      }
    } else {
      console.warn('[confirm] ⚠️ no clientEmail found — clientProfileId:', apt.clientProfileId)
    }

    const redirectUrl = new URL(`${appUrl}/appointments/confirmed`)
    if (!emailSent) redirectUrl.searchParams.set('emailError', '1')
    return NextResponse.redirect(redirectUrl.toString())
  } catch (err) {
    console.error('Confirm appointment error:', err)
    return NextResponse.redirect(`${appUrl}/appointments/confirmed?error=server`)
  }
}
