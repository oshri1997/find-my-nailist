import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { announcementAudienceForRole, serializeAnnouncement } from '@/lib/announcements'
import type { UserRole } from '@/types'

// Unlike the modal's /api/announcements, this is the full published history
// for the caller's audience — no watermark filtering and no MAJOR/MINOR
// split. There is deliberately no per-item read state here.
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const decoded = await adminAuth().verifyIdToken(token)
    const db = adminDb()
    const userSnap = await db.collection(COLLECTIONS.USERS).doc(decoded.uid).get()
    if (!userSnap.exists) return NextResponse.json({ data: [] })

    const audience = announcementAudienceForRole(userSnap.data()?.role as UserRole | undefined)
    if (!audience) return NextResponse.json({ data: [] })

    const snap = await db
      .collection(COLLECTIONS.ANNOUNCEMENTS)
      .where('status', '==', 'PUBLISHED')
      .where('audience', 'in', [audience, 'ALL'])
      .orderBy('publishedAt', 'desc')
      .limit(50)
      .get()

    return NextResponse.json({ data: snap.docs.map((doc) => serializeAnnouncement(doc.id, doc.data())) })
  } catch (error) {
    console.error('GET /api/announcements/archive error:', error)
    return NextResponse.json({ error: 'Failed to fetch announcement archive' }, { status: 500 })
  }
}
