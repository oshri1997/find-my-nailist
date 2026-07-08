import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { z } from 'zod'
import { FieldValue, Timestamp, type Firestore, type DocumentReference } from 'firebase-admin/firestore'
import { sendAppointmentRequest, sendReviewRequestEmail, sendCancellationEmail } from '@/lib/email'
import { randomUUID } from 'crypto'

// Firestore batched writes cap at 500 operations — split larger update sets into chunks.
const BATCH_WRITE_LIMIT = 500

async function chunkedBatchUpdate(
  db: Firestore,
  refs: DocumentReference[],
  data: Record<string, unknown>
) {
  for (let i = 0; i < refs.length; i += BATCH_WRITE_LIMIT) {
    const batch = db.batch()
    refs.slice(i, i + BATCH_WRITE_LIMIT).forEach((ref) => batch.update(ref, data))
    await batch.commit()
  }
}

const createSchema = z.object({
  nailistProfileId: z.string(),
  clientProfileId: z.string(),
  serviceId: z.string(),
  startTime: z.string().datetime(),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let decoded: { uid: string; email_verified?: boolean }
  try {
    decoded = await adminAuth().verifyIdToken(token)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!decoded.email_verified) {
    return NextResponse.json({ error: 'יש לאמת את כתובת המייל לפני קביעת תור' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = createSchema.parse(body)
    const db = adminDb()

    // Parallel: fetch service + verify client profile ownership
    const [serviceSnap, clientProfileOwnerSnap] = await Promise.all([
      db.collection(COLLECTIONS.SERVICES).doc(data.serviceId).get(),
      db.collection(COLLECTIONS.CLIENT_PROFILES).where('userId', '==', decoded.uid).limit(1).get(),
    ])

    if (!serviceSnap.exists || serviceSnap.data()?.isActive === false) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }
    const service = serviceSnap.data()!

    const ownedProfileId = clientProfileOwnerSnap.empty ? null : clientProfileOwnerSnap.docs[0].id
    if (!ownedProfileId || ownedProfileId !== data.clientProfileId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const startTime = new Date(data.startTime)
    const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000)

    // Fetch nailist + client profiles (needed for denormalized fields + email)
    const [nailistSnap, clientProfileSnap, clientUserSnap] = await Promise.all([
      db.collection(COLLECTIONS.NAILIST_PROFILES).doc(data.nailistProfileId).get(),
      db.collection(COLLECTIONS.CLIENT_PROFILES).doc(data.clientProfileId).get(),
      db.collection(COLLECTIONS.USERS).doc(decoded.uid).get(),
    ])
    const nailist = nailistSnap.data()
    const clientProfile = clientProfileSnap.data()

    const confirmToken = randomUUID()
    const declineToken = randomUUID()
    const tokenExpiresAt = Timestamp.fromDate(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    )

    // Client profiles never actually store a `displayName` field (only
    // firstName/lastName, from onboarding) — the users doc's displayName
    // (set at signup, from Google or the registration form) is the real
    // fallback so a client who somehow reached this without a completed
    // name step still gets a real name instead of a permanent "לקוחה".
    const clientDisplayName = clientProfile?.firstName && clientProfile?.lastName
      ? `${clientProfile.firstName} ${clientProfile.lastName}`
      : (clientProfile?.displayName ?? clientUserSnap.data()?.displayName ?? '')

    const now = FieldValue.serverTimestamp()
    const appointmentData = {
      ...data,
      startTime: Timestamp.fromDate(startTime),
      endTime: Timestamp.fromDate(endTime),
      status: 'PENDING',
      price: service.price,
      currency: service.currency,
      serviceName: service.name,
      nailistBusinessName: nailist?.businessName ?? '',
      clientDisplayName,
      confirmToken,
      confirmTokenExpiresAt: tokenExpiresAt,
      declineToken,
      declineTokenExpiresAt: tokenExpiresAt,
      createdAt: now,
      updatedAt: now,
    }

    // Atomically check for conflicts and insert — prevents double-booking race
    const newDocRef = db.collection(COLLECTIONS.APPOINTMENTS).doc()
    try {
      await db.runTransaction(async (tx) => {
        const conflictSnap = await tx.get(
          db.collection(COLLECTIONS.APPOINTMENTS)
            .where('nailistProfileId', '==', data.nailistProfileId)
        )
        const hasConflict = conflictSnap.docs.some((doc) => {
          const apt = doc.data()
          if (!['PENDING', 'CONFIRMED'].includes(apt.status)) return false
          const aptStart: Date = apt.startTime?.toDate?.() ?? new Date(apt.startTime)
          const aptEnd: Date = apt.endTime?.toDate?.() ?? new Date(apt.endTime)
          return aptStart < endTime && aptEnd > startTime
        })
        if (hasConflict) throw new Error('CONFLICT')
        tx.set(newDocRef, appointmentData)
      })
    } catch (txErr) {
      if (txErr instanceof Error && txErr.message === 'CONFLICT') {
        return NextResponse.json({ error: 'Time slot not available' }, { status: 409 })
      }
      throw txErr
    }

    // Nailist profile may lack email — always fall back to USERS. The
    // client's users doc was already fetched above (for the clientDisplayName
    // fallback) — reuse it instead of fetching it again.
    const nailistUserSnap = nailist?.userId
      ? await db.collection(COLLECTIONS.USERS).doc(nailist.userId).get()
      : null
    const nailistEmail: string | undefined = (nailist?.email as string | undefined) || (nailistUserSnap?.data()?.email as string | undefined) || undefined
    const clientEmail: string | undefined = (clientProfile?.email as string | undefined) || (clientUserSnap.data()?.email as string | undefined) || undefined

    console.log('[booking] email lookup — nailistEmail:', nailistEmail, 'clientEmail:', clientEmail)

    if (nailistEmail && clientEmail) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nailistiot.fun'
      const confirmUrl = `${appUrl}/api/appointments/confirm?token=${confirmToken}`
      const declineUrl = `${appUrl}/api/appointments/decline?token=${declineToken}`
      try {
        await sendAppointmentRequest({
          clientEmail,
          nailistEmail,
          clientName: clientDisplayName || clientEmail,
          nailistBusinessName: nailist?.businessName ?? '',
          serviceName: service.name,
          startTime,
          price: service.price,
          currency: service.currency,
          confirmUrl,
          declineUrl,
        })
        console.log('[booking] ✅ emails sent — nailist:', nailistEmail, '| client:', clientEmail)
      } catch (emailErr) {
        console.error('[booking] ❌ email failed — nailist:', nailistEmail, '| client:', clientEmail, '|', emailErr)
      }
    } else {
      console.warn('[booking] ⚠️ skipping email — nailistEmail:', nailistEmail, 'clientEmail:', clientEmail)
    }

    return NextResponse.json({ data: { id: newDocRef.id } }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('POST /api/appointments error:', error)
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    let decoded: { uid: string; email?: string }
    try {
      decoded = await adminAuth().verifyIdToken(token)
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') ?? 'nailist'
    const db = adminDb()

    let profileId: string | null = null
    if (role === 'nailist') {
      const snap = await db
        .collection(COLLECTIONS.NAILIST_PROFILES)
        .where('userId', '==', decoded.uid)
        .limit(1)
        .get()
      profileId = snap.empty ? null : snap.docs[0].id
    } else {
      const snap = await db
        .collection(COLLECTIONS.CLIENT_PROFILES)
        .where('userId', '==', decoded.uid)
        .limit(1)
        .get()
      if (!snap.empty) {
        profileId = snap.docs[0].id
      } else if (decoded.email) {
        // Fallback: find profile by email (created before userId was linked)
        const emailSnap = await db
          .collection(COLLECTIONS.CLIENT_PROFILES)
          .where('email', '==', decoded.email)
          .limit(1)
          .get()
        if (!emailSnap.empty) {
          profileId = emailSnap.docs[0].id
          void emailSnap.docs[0].ref.update({ userId: decoded.uid })
        }
      }
    }

    if (!profileId) return NextResponse.json({ data: [] })

    const field = role === 'nailist' ? 'nailistProfileId' : 'clientProfileId'
    // Nailist fetches all appointments for accurate stats; client gets last 50 for the UI list
    const limitCount = role === 'nailist' ? 1000 : 50
    const appointmentsSnap = await db
      .collection(COLLECTIONS.APPOINTMENTS)
      .where(field, '==', profileId)
      .orderBy('startTime', 'desc')
      .limit(limitCount)
      .get()

    // Auto-complete CONFIRMED appointments whose end time has passed
    const now = new Date()
    const expired = appointmentsSnap.docs.filter((doc) => {
      const data = doc.data()
      if (data.status !== 'CONFIRMED') return false
      const endTime: Date = data.endTime?.toDate?.() ?? new Date(data.endTime)
      return endTime < now
    })

    if (expired.length > 0) {
      // Per-doc transactions (not a bulk batch write) — a plain pre-read
      // guard on reviewRequested would race against a nailist manually
      // completing the same appointment via PATCH .../status at nearly the
      // same moment (e.g. she has the dashboard open as this GET fires),
      // letting both paths see reviewRequested: false and both email.
      const completions = await Promise.all(
        expired.map((doc) =>
          db.runTransaction(async (tx) => {
            const freshSnap = await tx.get(doc.ref)
            const wasAlreadyRequested = freshSnap.data()?.reviewRequested === true
            tx.update(doc.ref, {
              status: 'COMPLETED',
              reviewRequested: true,
              updatedAt: FieldValue.serverTimestamp(),
            })
            return { doc, wasAlreadyRequested }
          })
        )
      )

      completions.forEach(({ doc, wasAlreadyRequested }) => {
        if (wasAlreadyRequested) return
        const apt = doc.data()
        void (async () => {
          try {
            const [clientProfileSnap, nailistProfileSnap] = await Promise.all([
              db.collection(COLLECTIONS.CLIENT_PROFILES).doc(apt.clientProfileId).get(),
              db.collection(COLLECTIONS.NAILIST_PROFILES).doc(apt.nailistProfileId).get(),
            ])
            const clientProfile = clientProfileSnap.data()
            const nailistProfile = nailistProfileSnap.data()
            const clientUserSnap = clientProfile?.userId
              ? await db.collection(COLLECTIONS.USERS).doc(clientProfile.userId).get()
              : null
            const clientEmail: string | undefined =
              (clientProfile?.email as string | undefined) ||
              (clientUserSnap?.data()?.email as string | undefined) ||
              undefined
            if (clientEmail) {
              await sendReviewRequestEmail({
                clientEmail,
                clientName: apt.clientDisplayName ?? clientEmail,
                nailistBusinessName: apt.nailistBusinessName ?? nailistProfile?.businessName ?? '',
                serviceName: apt.serviceName,
                startTime: apt.startTime?.toDate?.() ?? new Date(apt.startTime),
                appointmentId: doc.id,
                appUrl: process.env.NEXT_PUBLIC_APP_URL,
              })
              console.log('[auto-complete] ✅ review request email sent to', clientEmail)
            }
          } catch (err) {
            console.error('[auto-complete] ❌ review request email failed:', err)
          }
        })()
      })
    }

    // Auto-cancel PENDING appointments with no response after 3 days
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    const stale = appointmentsSnap.docs.filter((doc) => {
      const data = doc.data()
      if (data.status !== 'PENDING') return false
      const createdAt: Date = data.createdAt?.toDate?.() ?? new Date(data.createdAt)
      return createdAt < threeDaysAgo
    })

    if (stale.length > 0) {
      await chunkedBatchUpdate(db, stale.map((doc) => doc.ref), {
        status: 'CANCELLED',
        // Clean up the confirm link's token — otherwise a nailist opening a
        // 7-day-valid confirm email for one of these later gets a
        // status-mismatch error/misleading message instead of a clean
        // "already cancelled" (see /api/appointments/confirm's handling).
        confirmToken: FieldValue.delete(),
        confirmTokenExpiresAt: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      })

      // Unlike a nailist-initiated cancellation (PATCH .../status) or the
      // decline-link flow, this lazy cleanup never told the client her
      // request timed out — she'd otherwise never hear anything at all.
      stale.forEach((doc) => {
        const apt = doc.data()
        void (async () => {
          try {
            const [clientProfileSnap, nailistProfileSnap] = await Promise.all([
              db.collection(COLLECTIONS.CLIENT_PROFILES).doc(apt.clientProfileId).get(),
              db.collection(COLLECTIONS.NAILIST_PROFILES).doc(apt.nailistProfileId).get(),
            ])
            const clientProfile = clientProfileSnap.data()
            const nailistProfile = nailistProfileSnap.data()
            const clientUserSnap = clientProfile?.userId
              ? await db.collection(COLLECTIONS.USERS).doc(clientProfile.userId).get()
              : null
            const clientEmail: string | undefined =
              (clientProfile?.email as string | undefined) ||
              (clientUserSnap?.data()?.email as string | undefined) ||
              undefined
            if (clientEmail) {
              await sendCancellationEmail({
                clientEmail,
                clientName: apt.clientDisplayName ?? clientEmail,
                nailistBusinessName: apt.nailistBusinessName ?? nailistProfile?.businessName ?? '',
                serviceName: apt.serviceName,
                startTime: apt.startTime?.toDate?.() ?? new Date(apt.startTime),
              })
              console.log('[auto-cancel] ✅ cancellation email sent to', clientEmail)
            }
          } catch (err) {
            console.error('[auto-cancel] ❌ cancellation email failed:', err)
          }
        })()
      })
    }

    const expiredIds = new Set(expired.map((d) => d.id))
    const staleIds = new Set(stale.map((d) => d.id))
    const appointments = appointmentsSnap.docs.map((d) => {
      // confirmToken/declineToken authorize the email confirm/decline links with no
      // other auth check — never expose them to either party via this API.
      const { confirmToken, confirmTokenExpiresAt, declineToken, declineTokenExpiresAt, ...data } = d.data()
      return {
        id: d.id,
        ...data,
        status: expiredIds.has(d.id) ? 'COMPLETED' : staleIds.has(d.id) ? 'CANCELLED' : data.status,
        startTime: data.startTime?.toDate?.()?.toISOString() ?? data.startTime,
        endTime: data.endTime?.toDate?.()?.toISOString() ?? data.endTime,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt,
      }
    })

    return NextResponse.json({ data: appointments })
  } catch (error) {
    console.error('GET /api/appointments error:', error)
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
  }
}
