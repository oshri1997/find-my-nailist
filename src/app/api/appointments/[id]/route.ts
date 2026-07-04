import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'

// Single-appointment lookup — used by /my-appointments to resolve a
// ?review=<id> email link even when that appointment has fallen outside the
// client list's most-recent-50 window (GET /api/appointments?role=client
// caps there for UI performance, so an older COMPLETED appointment's review
// link would otherwise silently fail to auto-open the review modal).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const token = request.cookies.get('auth-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let decoded: { uid: string; email?: string }
  try {
    decoded = await adminAuth().verifyIdToken(token)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = adminDb()
    const snap = await db.collection(COLLECTIONS.APPOINTMENTS).doc(id).get()
    if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const clientProfileSnap = await db
      .collection(COLLECTIONS.CLIENT_PROFILES)
      .where('userId', '==', decoded.uid)
      .limit(1)
      .get()
    const ownedClientProfileId = clientProfileSnap.empty ? null : clientProfileSnap.docs[0].id

    // confirmToken/declineToken authorize the email confirm/decline links with no
    // other auth check — never expose them to either party via this API.
    const { confirmToken, confirmTokenExpiresAt, declineToken, declineTokenExpiresAt, ...data } = snap.data()!

    if (!ownedClientProfileId || ownedClientProfileId !== data.clientProfileId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      data: {
        id: snap.id,
        ...data,
        startTime: data.startTime?.toDate?.()?.toISOString() ?? data.startTime,
        endTime: data.endTime?.toDate?.()?.toISOString() ?? data.endTime,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt,
      },
    })
  } catch (error) {
    console.error(`GET /api/appointments/${id} error:`, error)
    return NextResponse.json({ error: 'Failed to fetch appointment' }, { status: 500 })
  }
}
