import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'

// Called once when the announcement modal is dismissed, by any means
// (primary button, backdrop click, or Escape) — every dismissal counts as
// "seen everything published up to now", never a per-item read record.
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const decoded = await adminAuth().verifyIdToken(token)
    const { FieldValue } = await import('firebase-admin/firestore')
    await adminDb().collection(COLLECTIONS.USERS).doc(decoded.uid).set(
      { lastSeenAnnouncementsAt: FieldValue.serverTimestamp() },
      { merge: true }
    )

    return NextResponse.json({ message: 'ok' })
  } catch (error) {
    console.error('POST /api/announcements/seen error:', error)
    return NextResponse.json({ error: 'Failed to update watermark' }, { status: 500 })
  }
}
