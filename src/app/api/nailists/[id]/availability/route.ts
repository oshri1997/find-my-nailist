import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { israelWallClockToUtc } from '@/lib/booking-utils'
import { availabilityOverrideDocumentId, resolveAvailabilityIntervals, type AvailabilityOverride } from '@/lib/holiday-availability'
import type { RawDayAvailability } from '@/lib/availability-intervals'

// Maps JS getDay() (0=Sun) to our dayOfWeek field (0=Sun)
function getDayOfWeek(dateStr: string): number {
  // dateStr is YYYY-MM-DD; parse as local noon to avoid timezone edge cases
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d, 12).getDay()
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: nailistProfileId } = await params
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') // YYYY-MM-DD

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date param required (YYYY-MM-DD)' }, { status: 400 })
  }

  try {
    const db = adminDb()
    const dayOfWeek = getDayOfWeek(date)

    // Fetch working hours for this day
    const [hoursSnap, profileSnap, overridesSnap] = await Promise.all([
      db
      .collection(COLLECTIONS.WORKING_HOURS)
      .where('nailistProfileId', '==', nailistProfileId)
      .where('dayOfWeek', '==', dayOfWeek)
      .limit(1)
      .get(),
      db.collection(COLLECTIONS.NAILIST_PROFILES).doc(nailistProfileId).get(),
      db.collection(COLLECTIONS.AVAILABILITY_OVERRIDES)
        .doc(availabilityOverrideDocumentId(nailistProfileId, date))
        .get(),
    ])

    const override = overridesSnap.exists ? overridesSnap.data() as AvailabilityOverride : undefined
    const intervals = resolveAvailabilityIntervals(
      date,
      hoursSnap.empty ? undefined : hoursSnap.docs[0].data() as RawDayAvailability,
      profileSnap.data()?.autoCloseHolidays,
      override,
    )
    if (intervals.length === 0) {
      return NextResponse.json({ data: { workingDay: false, bookedSlots: [] } })
    }

    // Fetch appointments for that date — load all for nailist, filter in JS to avoid index
    const appointmentsSnap = await db
      .collection(COLLECTIONS.APPOINTMENTS)
      .where('nailistProfileId', '==', nailistProfileId)
      .get()

    // Day boundaries in real Israel wall-clock time, not the server's own
    // (UTC) local time — otherwise an appointment near local midnight could
    // be excluded from (or wrongly included in) the wrong calendar day.
    const [y, m, d] = date.split('-').map(Number)
    const nextDay = new Date(y, m - 1, d + 1)
    const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`
    const dayStart = israelWallClockToUtc(date, '00:00')
    const dayEndExclusive = israelWallClockToUtc(nextDayStr, '00:00')

    const bookedSlots = appointmentsSnap.docs
      .map((doc) => {
        const apt = doc.data()
        if (!['PENDING', 'CONFIRMED'].includes(apt.status)) return null
        const start: Date = apt.startTime?.toDate?.() ?? new Date(apt.startTime)
        const end: Date = apt.endTime?.toDate?.() ?? new Date(apt.endTime)
        if (start >= dayEndExclusive || end <= dayStart) return null
        return { startTime: start.toISOString(), endTime: end.toISOString() }
      })
      .filter(Boolean)

    return NextResponse.json({
      data: {
        workingDay: true,
        intervals, // e.g. [{ start: "09:00", end: "13:00" }, { start: "15:00", end: "19:00" }]
        // Best-effort legacy mirror for old cached client bundles that only
        // understand a single startTime/endTime window — the enclosing span
        // of every interval. It is never the source of truth: this route's
        // own server-side booking validation always re-checks against
        // `intervals`, so a stale client offering a slot inside a break can
        // only ever be rejected (409), never allowed to double-book.
        startTime: intervals[0].start,
        endTime: intervals[intervals.length - 1].end,
        bookedSlots,
      },
    })
  } catch (err) {
    console.error('availability error:', err)
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
  }
}
