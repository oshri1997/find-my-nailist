import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'

const schema = z.object({
  action: z.enum(['MARK_PAID', 'CONFIRM_RECEIVED']),
})

// Bit has no merchant webhook for arbitrary individual recipients — this is
// a fully separate, manual/trust-based state machine, deliberately never
// referenced by AppointmentStatus's VALID_TRANSITIONS (status/route.ts) or
// the lazy auto-complete/auto-cancel logic in GET /api/appointments, so a
// deposit claim can never gate or interfere with the real appointment
// lifecycle. A nailist can confirm receipt even without the client's claim
// first — Bit has no verification either way, so her word is authoritative.
const DEPOSIT_TRANSITIONS: Record<string, { action: string; role: 'client' | 'nailist' }[]> = {
  AWAITING_PAYMENT: [
    { action: 'MARK_PAID', role: 'client' },
    { action: 'CONFIRM_RECEIVED', role: 'nailist' },
  ],
  CLIENT_MARKED_PAID: [
    { action: 'CONFIRM_RECEIVED', role: 'nailist' },
  ],
  NAILIST_CONFIRMED: [],
}

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
    const { action } = schema.parse(body)
    const db = adminDb()

    const existingSnap = await db.collection(COLLECTIONS.APPOINTMENTS).doc(id).get()
    if (!existingSnap.exists) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }
    const existingData = existingSnap.data()!

    if (existingData.depositRequired !== true || !existingData.depositStatus) {
      return NextResponse.json({ error: 'This appointment has no deposit to track' }, { status: 400 })
    }

    // The caller could be either side — resolve whichever role (if any) they
    // actually own on this specific appointment.
    const [nailistProfileSnap, clientProfileSnap] = await Promise.all([
      db.collection(COLLECTIONS.NAILIST_PROFILES).where('userId', '==', decoded.uid).limit(1).get(),
      db.collection(COLLECTIONS.CLIENT_PROFILES).where('userId', '==', decoded.uid).limit(1).get(),
    ])
    const ownedNailistProfileId = nailistProfileSnap.empty ? null : nailistProfileSnap.docs[0].id
    const ownedClientProfileId = clientProfileSnap.empty ? null : clientProfileSnap.docs[0].id

    let callerRole: 'client' | 'nailist' | null = null
    if (ownedNailistProfileId && ownedNailistProfileId === existingData.nailistProfileId) callerRole = 'nailist'
    else if (ownedClientProfileId && ownedClientProfileId === existingData.clientProfileId) callerRole = 'client'

    if (!callerRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const currentDepositStatus = existingData.depositStatus as string
    const allowed = (DEPOSIT_TRANSITIONS[currentDepositStatus] ?? []).some(
      (t) => t.action === action && t.role === callerRole
    )
    if (!allowed) {
      return NextResponse.json(
        { error: `Cannot perform ${action} on deposit status ${currentDepositStatus} as ${callerRole}` },
        { status: 409 }
      )
    }

    const nextDepositStatus = action === 'MARK_PAID' ? 'CLIENT_MARKED_PAID' : 'NAILIST_CONFIRMED'
    await db.collection(COLLECTIONS.APPOINTMENTS).doc(id).update({
      depositStatus: nextDepositStatus,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ message: 'Deposit status updated', depositStatus: nextDepositStatus })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error(`PATCH /api/appointments/${id}/deposit error:`, error)
    return NextResponse.json({ error: 'Failed to update deposit status' }, { status: 500 })
  }
}
