import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { z } from 'zod'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { sendAppointmentRequest } from '@/lib/email'
import { randomUUID } from 'crypto'

const createSchema = z.object({
  nailistProfileId: z.string(),
  clientProfileId: z.string(),
  serviceId: z.string(),
  startTime: z.string().datetime(),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createSchema.parse(body)
    const db = adminDb()

    const serviceSnap = await db.collection(COLLECTIONS.SERVICES).doc(data.serviceId).get()
    if (!serviceSnap.exists) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }
    const service = serviceSnap.data()!

    const startTime = new Date(data.startTime)
    const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000)

    // Check for conflicts — single-field query to avoid needing a composite index,
    // then filter by time overlap and status in JS
    const conflictSnap = await db
      .collection(COLLECTIONS.APPOINTMENTS)
      .where('nailistProfileId', '==', data.nailistProfileId)
      .get()

    const hasConflict = conflictSnap.docs.some((doc) => {
      const apt = doc.data()
      if (!['PENDING', 'CONFIRMED'].includes(apt.status)) return false
      const aptStart: Date = apt.startTime?.toDate?.() ?? new Date(apt.startTime)
      const aptEnd: Date = apt.endTime?.toDate?.() ?? new Date(apt.endTime)
      return aptStart < endTime && aptEnd > startTime
    })

    if (hasConflict) {
      return NextResponse.json({ error: 'Time slot not available' }, { status: 409 })
    }

    const confirmToken = randomUUID()
    const confirmTokenExpiresAt = Timestamp.fromDate(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    )

    const now = FieldValue.serverTimestamp()
    const appointmentRef = await db.collection(COLLECTIONS.APPOINTMENTS).add({
      ...data,
      startTime: Timestamp.fromDate(startTime),
      endTime: Timestamp.fromDate(endTime),
      status: 'PENDING',
      price: service.price,
      currency: service.currency,
      serviceName: service.name,
      confirmToken,
      confirmTokenExpiresAt,
      createdAt: now,
      updatedAt: now,
    })

    // Fire-and-forget email — resolve emails for both parties
    const [nailistSnap, clientProfileSnap] = await Promise.all([
      db.collection(COLLECTIONS.NAILIST_PROFILES).doc(data.nailistProfileId).get(),
      db.collection(COLLECTIONS.CLIENT_PROFILES).doc(data.clientProfileId).get(),
    ])
    const nailist = nailistSnap.data()
    const clientProfile = clientProfileSnap.data()

    // Both nailist and client profiles may lack email — always fall back to USERS
    const [nailistUserSnap, clientUserSnap] = await Promise.all([
      nailist?.userId ? db.collection(COLLECTIONS.USERS).doc(nailist.userId).get() : Promise.resolve(null),
      clientProfile?.userId ? db.collection(COLLECTIONS.USERS).doc(clientProfile.userId).get() : Promise.resolve(null),
    ])
    const nailistEmail: string | undefined = (nailist?.email as string | undefined) || (nailistUserSnap?.data()?.email as string | undefined) || undefined
    const clientEmail: string | undefined = (clientProfile?.email as string | undefined) || (clientUserSnap?.data()?.email as string | undefined) || undefined

    console.log('[booking] email lookup — nailistEmail:', nailistEmail, 'clientEmail:', clientEmail)

    if (nailistEmail && clientEmail) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://find-my-nailist-production.up.railway.app'
      const confirmUrl = `${appUrl}/api/appointments/confirm?token=${confirmToken}`
      try {
        await sendAppointmentRequest({
          clientEmail,
          nailistEmail,
          clientName: clientProfile?.displayName ?? clientEmail,
          nailistBusinessName: nailist?.businessName ?? '',
          serviceName: service.name,
          startTime,
          price: service.price,
          currency: service.currency,
          confirmUrl,
        })
        console.log('[booking] ✅ emails sent — nailist:', nailistEmail, '| client:', clientEmail)
      } catch (emailErr) {
        console.error('[booking] ❌ email failed — nailist:', nailistEmail, '| client:', clientEmail, '|', emailErr)
      }
    } else {
      console.warn('[booking] ⚠️ skipping email — nailistEmail:', nailistEmail, 'clientEmail:', clientEmail)
    }

    return NextResponse.json({ data: { id: appointmentRef.id } }, { status: 201 })
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
    const decoded = await adminAuth().verifyIdToken(token)

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
      profileId = snap.empty ? null : snap.docs[0].id
    }

    if (!profileId) return NextResponse.json({ data: [] })

    const field = role === 'nailist' ? 'nailistProfileId' : 'clientProfileId'
    const appointmentsSnap = await db
      .collection(COLLECTIONS.APPOINTMENTS)
      .where(field, '==', profileId)
      .orderBy('startTime', 'desc')
      .limit(50)
      .get()

    const appointments = appointmentsSnap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        ...data,
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
