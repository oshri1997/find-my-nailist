import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { generateSlots, isSlotUnavailable } from '@/lib/booking-utils'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d, 12).getDay()
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: nailistProfileId } = await params
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const days = Math.min(parseInt(searchParams.get('days') ?? '21'), 60)
  const durationMinutes = parseInt(searchParams.get('durationMinutes') ?? '60')

  if (!from || !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    return NextResponse.json({ error: 'from param required (YYYY-MM-DD)' }, { status: 400 })
  }

  try {
    const db = adminDb()

    const [hoursSnap, appointmentsSnap] = await Promise.all([
      db.collection(COLLECTIONS.WORKING_HOURS)
        .where('nailistProfileId', '==', nailistProfileId)
        .get(),
      db.collection(COLLECTIONS.APPOINTMENTS)
        .where('nailistProfileId', '==', nailistProfileId)
        .get(),
    ])

    const hoursByDay: Record<number, { startTime: string; endTime: string; isActive: boolean }> = {}
    hoursSnap.docs.forEach((doc) => {
      const h = doc.data()
      hoursByDay[h.dayOfWeek] = { startTime: h.startTime, endTime: h.endTime, isActive: h.isActive }
    })

    const toStr = addDays(from, days)
    const [fromY, fromM, fromD] = from.split('-').map(Number)
    const [toY, toM, toD] = toStr.split('-').map(Number)
    const rangeStart = new Date(fromY, fromM - 1, fromD, 0, 0, 0)
    const rangeEnd = new Date(toY, toM - 1, toD, 23, 59, 59)

    const relevantApts = appointmentsSnap.docs
      .map((doc) => {
        const apt = doc.data()
        if (!['PENDING', 'CONFIRMED'].includes(apt.status)) return null
        const start: Date = apt.startTime?.toDate?.() ?? new Date(apt.startTime)
        const end: Date = apt.endTime?.toDate?.() ?? new Date(apt.endTime)
        if (start > rangeEnd || end < rangeStart) return null
        return { startTime: start.toISOString(), endTime: end.toISOString() }
      })
      .filter(Boolean) as { startTime: string; endTime: string }[]

    const summary: Record<string, { workingDay: boolean; fullyBooked: boolean }> = {}

    for (let i = 0; i < days; i++) {
      const dateStr = addDays(from, i)
      const dayOfWeek = getDayOfWeek(dateStr)
      const hours = hoursByDay[dayOfWeek]

      if (!hours?.isActive) {
        summary[dateStr] = { workingDay: false, fullyBooked: false }
        continue
      }

      const [y, m, d] = dateStr.split('-').map(Number)
      const dayStart = new Date(y, m - 1, d, 0, 0, 0)
      const dayEnd = new Date(y, m - 1, d, 23, 59, 59)

      const dayBooked = relevantApts.filter((apt) => {
        const s = new Date(apt.startTime)
        const e = new Date(apt.endTime)
        return s <= dayEnd && e >= dayStart
      })

      const slots = generateSlots(hours.startTime, hours.endTime)
      const hasAvailable = slots.some(
        (slot) => !isSlotUnavailable(slot, dateStr, durationMinutes, hours.endTime, dayBooked)
      )

      summary[dateStr] = { workingDay: true, fullyBooked: !hasAvailable }
    }

    return NextResponse.json({ data: summary })
  } catch (err) {
    console.error('batch availability error:', err)
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
  }
}
