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

    const serverNow = new Date()
    const todayStr = `${serverNow.getFullYear()}-${String(serverNow.getMonth() + 1).padStart(2, '0')}-${String(serverNow.getDate()).padStart(2, '0')}`
    const todayNowMinutes = serverNow.getHours() * 60 + serverNow.getMinutes()

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
