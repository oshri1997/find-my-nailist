import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { validateIntervals } from '@/lib/availability-intervals'

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

const timeIntervalSchema = z.object({
  start: z.string().regex(TIME_RE, 'Invalid time format (expected HH:MM)'),
  end: z.string().regex(TIME_RE, 'Invalid time format (expected HH:MM)'),
})

// startTime/endTime stay required for backward compatibility (legacy
// clients, and a best-effort rollback-safety mirror the UI keeps writing
// alongside intervals — see WorkingHoursDoc). When `intervals` is present
// and non-empty it is the source of truth and is validated on its own
// terms; startTime/endTime are otherwise validated exactly as before.
const hoursSchema = z.object({
  hours: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      isActive: z.boolean(),
      startTime: z.string().regex(TIME_RE, 'Invalid time format (expected HH:MM)'),
      endTime: z.string().regex(TIME_RE, 'Invalid time format (expected HH:MM)'),
      intervals: z.array(timeIntervalSchema).optional(),
    }).superRefine((h, ctx) => {
      if (!h.isActive) return
      if (h.intervals && h.intervals.length > 0) {
        const error = validateIntervals(h.intervals)
        if (error) ctx.addIssue({ code: 'custom', message: error, path: ['intervals'] })
        return
      }
      if (h.startTime >= h.endTime) {
        ctx.addIssue({ code: 'custom', message: 'startTime must be before endTime on an active working day' })
      }
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
  } catch (error) {
    console.error(error)
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

    for (const { intervals, ...h } of hours) {
      const hasIntervals = !!intervals && intervals.length > 0
      const existing = existingByDay.get(h.dayOfWeek)
      if (existing) {
        // A save always fully replaces this day's shape. Writing intervals
        // as FieldValue.delete() when the caller didn't send a (non-empty)
        // one prevents a stale intervals[] from a previous save silently
        // outliving this update and continuing to win under the
        // normalization precedence (intervals[] > legacy startTime/
        // endTime) — there must never be two saved shapes for the same day
        // disagreeing with each other. update() (not a full overwrite)
        // leaves every other field on the doc untouched.
        batch.update(existing, { ...h, intervals: hasIntervals ? intervals : FieldValue.delete(), updatedAt: now })
      } else {
        // A brand-new doc has no stale intervals to clear — FieldValue.delete()
        // is only valid inside update()/merge-set(), so simply omit the key.
        const newRef = db.collection(COLLECTIONS.WORKING_HOURS).doc()
        batch.set(newRef, {
          nailistProfileId: profileId,
          ...h,
          ...(hasIntervals ? { intervals } : {}),
          createdAt: now,
          updatedAt: now,
        })
      }
    }

    await batch.commit()
    return NextResponse.json({ message: 'Working hours updated' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Failed to update working hours' }, { status: 500 })
  }
}
