import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'

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
    const hoursSnap = await db
      .collection(COLLECTIONS.WORKING_HOURS)
      .where('nailistProfileId', '==', nailistProfileId)
      .where('dayOfWeek', '==', dayOfWeek)
      .limit(1)
      .get()

    if (hoursSnap.empty) {
      return NextResponse.json({ data: { workingDay: false, bookedSlots: [] } })
    }

    const hoursDoc = hoursSnap.docs[0].data()
    if (!hoursDoc.isActive) {
      return NextResponse.json({ data: { workingDay: false, bookedSlots: [] } })
    }

    // Fetch appointments for that date — load all for nailist, filter in JS to avoid index
    const appointmentsSnap = await db
      .collection(COLLECTIONS.APPOINTMENTS)
      .where('nailistProfileId', '==', nailistProfileId)
      .get()

    const [y, m, d] = date.split('-').map(Number)
    const dayStart = new Date(y, m - 1, d, 0, 0, 0)
    const dayEnd = new Date(y, m - 1, d, 23, 59, 59)

    const bookedSlots = appointmentsSnap.docs
      .map((doc) => {
        const apt = doc.data()
        if (!['PENDING', 'CONFIRMED'].includes(apt.status)) return null
        const start: Date = apt.startTime?.toDate?.() ?? new Date(apt.startTime)
        const end: Date = apt.endTime?.toDate?.() ?? new Date(apt.endTime)
        if (start > dayEnd || end < dayStart) return null
        return { startTime: start.toISOString(), endTime: end.toISOString() }
      })
      .filter(Boolean)

    return NextResponse.json({
      data: {
        workingDay: true,
        startTime: hoursDoc.startTime, // "09:00"
        endTime: hoursDoc.endTime,     // "19:00"
        bookedSlots,
      },
    })
  } catch (err) {
    console.error('availability error:', err)
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
  }
}
