import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue } from 'firebase-admin/firestore'

async function getProfileId(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  const decoded = await adminAuth().verifyIdToken(token)
  const db = adminDb()
  const snap = await db.collection(COLLECTIONS.NAILIST_PROFILES).where('userId', '==', decoded.uid).limit(1).get()
  if (snap.empty) return null
  return snap.docs[0].id
}

export async function GET(request: NextRequest) {
  try {
    const profileId = await getProfileId(request)
    if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = adminDb()
    const snap = await db
      .collection(COLLECTIONS.WORKING_HOURS)
      .where('nailistProfileId', '==', profileId)
      .get()

    return NextResponse.json({ data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch working hours' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const profileId = await getProfileId(request)
    if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { hours } = await request.json() as {
      hours: Array<{ dayOfWeek: number; isActive: boolean; startTime: string; endTime: string }>
    }

    const db = adminDb()
    const batch = db.batch()
    const now = FieldValue.serverTimestamp()

    // Fetch existing docs to update or create
    const snap = await db
      .collection(COLLECTIONS.WORKING_HOURS)
      .where('nailistProfileId', '==', profileId)
      .get()

    const existingByDay = new Map(snap.docs.map((d) => [d.data().dayOfWeek as number, d.ref]))

    for (const h of hours) {
      const existing = existingByDay.get(h.dayOfWeek)
      if (existing) {
        batch.update(existing, { ...h, updatedAt: now })
      } else {
        const ref = db.collection(COLLECTIONS.WORKING_HOURS).doc()
        batch.set(ref, { nailistProfileId: profileId, ...h, createdAt: now, updatedAt: now })
      }
    }

    await batch.commit()
    return NextResponse.json({ message: 'Working hours updated' })
  } catch {
    return NextResponse.json({ error: 'Failed to update working hours' }, { status: 500 })
  }
}
