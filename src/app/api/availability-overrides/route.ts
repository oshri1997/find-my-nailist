import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { availabilityOverrideDocumentId } from '@/lib/holiday-availability'
import { validateIntervals } from '@/lib/availability-intervals'

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const dateRe = /^\d{4}-\d{2}-\d{2}$/
const timeIntervalSchema = z.object({
  start: z.string().regex(TIME_RE),
  end: z.string().regex(TIME_RE),
})
const overrideSchema = z.discriminatedUnion('mode', [
  z.object({ date: z.string().regex(dateRe), mode: z.literal('CLOSED') }),
  z.object({
    date: z.string().regex(dateRe), mode: z.literal('OPEN'),
    startTime: z.string().regex(TIME_RE),
    endTime: z.string().regex(TIME_RE),
    intervals: z.array(timeIntervalSchema).optional(),
  }).superRefine((override, ctx) => {
    if (override.intervals && override.intervals.length > 0) {
      const error = validateIntervals(override.intervals)
      if (error) ctx.addIssue({ code: 'custom', message: error, path: ['intervals'] })
      return
    }
    if (override.startTime >= override.endTime) {
      ctx.addIssue({ code: 'custom', message: 'startTime must be before endTime' })
    }
  }),
])

async function getProfileId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  const decoded = await adminAuth().verifyIdToken(token)
  const snap = await adminDb()
    .collection(COLLECTIONS.NAILIST_PROFILES)
    .where('userId', '==', decoded.uid)
    .limit(1)
    .get()
  return snap.empty ? null : snap.docs[0].id
}

export async function GET(request: NextRequest) {
  try {
    const profileId = await getProfileId(request)
    if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const snap = await adminDb()
      .collection(COLLECTIONS.AVAILABILITY_OVERRIDES)
      .where('nailistProfileId', '==', profileId)
      .get()
    return NextResponse.json({ data: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch date overrides' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const profileId = await getProfileId(request)
    if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const override = overrideSchema.parse(await request.json())
    const db = adminDb()
    const ref = db.collection(COLLECTIONS.AVAILABILITY_OVERRIDES)
      .doc(availabilityOverrideDocumentId(profileId, override.date))
    // A save always fully replaces this date's override. On an OPEN save
    // that didn't send a (non-empty) intervals[], clear any stale one from
    // a previous save with FieldValue.delete() — otherwise it would keep
    // winning under normalization precedence even though this save meant
    // to go back to a single legacy window (see working-hours/route.ts for
    // the same reasoning).
    const intervalsField = override.mode === 'OPEN' && !(override.intervals && override.intervals.length > 0)
      ? FieldValue.delete()
      : undefined
    await ref.set({
      nailistProfileId: profileId,
      ...override,
      ...(intervalsField !== undefined ? { intervals: intervalsField } : {}),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
    return NextResponse.json({ message: 'Date override updated' })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to update date override' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const profileId = await getProfileId(request)
    if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const date = new URL(request.url).searchParams.get('date')
    if (!date || !dateRe.test(date)) return NextResponse.json({ error: 'date param required (YYYY-MM-DD)' }, { status: 400 })
    await adminDb().collection(COLLECTIONS.AVAILABILITY_OVERRIDES)
      .doc(availabilityOverrideDocumentId(profileId, date))
      .delete()
    return NextResponse.json({ message: 'Date override removed' })
  } catch {
    return NextResponse.json({ error: 'Failed to remove date override' }, { status: 500 })
  }
}
