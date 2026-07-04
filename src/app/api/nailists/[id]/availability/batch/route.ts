import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { computeDateAvailability } from '@/lib/booking-utils'

function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d, 12).getDay()
}

function addDays(dateStr: string, count: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + count)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// The `from`/`dates` range is Israel-local calendar dates (the client's own
// "today"), but this route runs on a server with no TZ set (UTC). Deriving
// "today" from the server's own new Date() can land on the wrong calendar
// date entirely during the UTC-offset window around Israel's midnight, which
// silently skips the already-elapsed-time filter for the real "today" (no
// date in the requested range matches the server's todayStr). Read both off
// Asia/Jerusalem explicitly instead of the runtime's local clock.
function israelNow(): { dateStr: string; minutesSinceMidnight: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date()).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value
    return acc
  }, {} as Record<string, string>)
  return {
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    minutesSinceMidnight: Number(parts.hour) * 60 + Number(parts.minute),
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: nailistProfileId } = await params
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const days = Math.min(parseInt(searchParams.get('days') ?? '21', 10), 180)
  const durationMinutes = parseInt(searchParams.get('durationMinutes') ?? '60', 10)

  if (!from || !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    return NextResponse.json({ error: 'from param required (YYYY-MM-DD)' }, { status: 400 })
  }

  try {
    const db = adminDb()
    const dates = Array.from({ length: days }, (_, i) => addDays(from, i))

    const hoursSnap = await db
      .collection(COLLECTIONS.WORKING_HOURS)
      .where('nailistProfileId', '==', nailistProfileId)
      .get()

    const workingHoursByDay = new Map<number, { startTime: string; endTime: string; isActive: boolean }>()
    hoursSnap.docs.forEach((doc) => {
      const data = doc.data()
      workingHoursByDay.set(data.dayOfWeek, {
        startTime: data.startTime,
        endTime: data.endTime,
        isActive: data.isActive,
      })
    })

    const endDateStr = addDays(from, days)
    const fromDate = new Date(`${from}T00:00:00`)
    const toDate = new Date(`${endDateStr}T00:00:00`)

    const appointmentsSnap = await db
      .collection(COLLECTIONS.APPOINTMENTS)
      .where('nailistProfileId', '==', nailistProfileId)
      .get()

    const rangeAppointments = appointmentsSnap.docs
      .map((doc) => {
        const data = doc.data()
        if (!['PENDING', 'CONFIRMED'].includes(data.status)) return null
        const start: Date = data.startTime?.toDate?.() ?? new Date(data.startTime)
        const end: Date = data.endTime?.toDate?.() ?? new Date(data.endTime)
        if (start >= toDate || end <= fromDate) return null
        return { startTime: start.toISOString(), endTime: end.toISOString() }
      })
      .filter((a): a is { startTime: string; endTime: string } => a !== null)

    const { dateStr: todayStr, minutesSinceMidnight: todayNowMinutes } = israelNow()

    const result: Record<string, { workingDay: boolean; fullyBooked: boolean }> = {}
    for (const date of dates) {
      result[date] = computeDateAvailability(
        date,
        workingHoursByDay.get(getDayOfWeek(date)),
        durationMinutes,
        rangeAppointments,
        date === todayStr ? todayNowMinutes : undefined
      )
    }

    return NextResponse.json({ data: result })
  } catch (err) {
    console.error('batch availability error:', err)
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
  }
}
