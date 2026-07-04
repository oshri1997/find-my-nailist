import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

const hoursSchema = z.object({
  hours: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      isActive: z.boolean(),
      startTime: z.string().regex(TIME_RE, 'Invalid time format (expected HH:MM)'),
      endTime: z.string().regex(TIME_RE, 'Invalid time format (expected HH:MM)'),
    }).refine((h) => !h.isActive || h.startTime < h.endTime, {
      message: 'startTime must be before endTime on an active working day',
    })
  ),
})

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

    const { hours } = hoursSchema.parse(await request.json())

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update working hours' }, { status: 500 })
  }
}
