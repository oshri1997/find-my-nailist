import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { announcementAudienceForRole, serializeAnnouncement } from '@/lib/announcements'
import type { UserRole } from '@/types'

// The modal-trigger cap: MINOR items never open the modal at all (they only
// ever show in the /whats-new archive), and even a burst of unseen MAJOR
// items is digested into one modal, capped here, with the rest reachable
// from the archive rather than stacking N modals in a row.
const MODAL_ITEM_CAP = 5

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const decoded = await adminAuth().verifyIdToken(token)
    const db = adminDb()
    const userSnap = await db.collection(COLLECTIONS.USERS).doc(decoded.uid).get()
    if (!userSnap.exists) return NextResponse.json({ data: null })

    const userData = userSnap.data()!
    const audience = announcementAudienceForRole(userData.role as UserRole | undefined)
    if (!audience) return NextResponse.json({ data: null })

    const { Timestamp } = await import('firebase-admin/firestore')
    const watermark = userData.lastSeenAnnouncementsAt?.toDate?.() ?? userData.createdAt?.toDate?.() ?? new Date(0)

    const snap = await db
      .collection(COLLECTIONS.ANNOUNCEMENTS)
      .where('status', '==', 'PUBLISHED')
      .where('audience', 'in', [audience, 'ALL'])
      .where('publishedAt', '>', Timestamp.fromDate(watermark))
      .orderBy('publishedAt', 'asc')
      .limit(20)
      .get()

    // MINOR items are counted toward the watermark once seen (the client
    // marks everything up to "now" as seen on close) but never trigger the
    // modal themselves — only MAJOR items do.
    const major = snap.docs
      .map((doc) => serializeAnnouncement(doc.id, doc.data()))
      .filter((a) => a.priority === 'MAJOR')

    if (major.length === 0) return NextResponse.json({ data: null })

    return NextResponse.json({
      data: {
        items: major.slice(0, MODAL_ITEM_CAP),
        hasMore: major.length > MODAL_ITEM_CAP,
      },
    })
  } catch (error) {
    console.error('GET /api/announcements error:', error)
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 })
  }
}
