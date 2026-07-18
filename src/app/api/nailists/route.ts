import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { isAuthenticatedRequest, computeHasContactInfo, stripNailistContactFields } from '@/lib/nailist-contact'
import { findNextAvailableSlot, computeDateAvailability, getDayOfWeek, israelNow, type WorkingHours, type BookedSlot } from '@/lib/booking-utils'

import { geohashQueryBounds, distanceBetween } from 'geofire-common'
import { FieldPath, type Firestore } from 'firebase-admin/firestore'

// No specific service is known yet at search time, so slots are computed
// against this representative duration — long enough to cover most services,
// short enough not to under-report availability for quick ones.
const DEFAULT_SLOT_DURATION_MINUTES = 60

function sanitizeNailists(nailists: Array<Record<string, unknown>>, isAuthenticated: boolean): void {
  nailists.forEach((n) => {
    n.hasContactInfo = computeHasContactInfo(n)
    if (!isAuthenticated) stripNailistContactFields(n)
  })
}

async function attachServiceNames(
  db: Firestore,
  nailists: Array<Record<string, unknown>>,
): Promise<void> {
  const ids = nailists.map((n) => n.id as string).filter(Boolean)
  if (ids.length === 0) return

  const serviceMap: Record<string, string[]> = {}

  // Firestore 'in' supports max 30 items per query
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30))

  await Promise.all(
    chunks.map(async (chunk) => {
      const snap = await db
        .collection(COLLECTIONS.SERVICES)
        .where('nailistProfileId', 'in', chunk)
        .get()
      snap.docs.forEach((doc) => {
        const d = doc.data()
        if (!d.isActive) return
        if (!serviceMap[d.nailistProfileId]) serviceMap[d.nailistProfileId] = []
        serviceMap[d.nailistProfileId].push(d.name as string)
      })
    }),
  )

  nailists.forEach((n) => {
    n.serviceNames = serviceMap[n.id as string] ?? []
  })
}

async function attachAvailability(
  db: Firestore,
  nailists: Array<Record<string, unknown>>,
  date?: string,
): Promise<void> {
  const ids = nailists.map((n) => n.id as string).filter(Boolean)
  if (ids.length === 0) return

  const workingHoursMap: Record<string, Map<number, WorkingHours>> = {}
  const appointmentsMap: Record<string, BookedSlot[]> = {}

  // Firestore 'in' supports max 30 items per query
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30))

  await Promise.all(
    chunks.map(async (chunk) => {
      const [hoursSnap, appointmentsSnap] = await Promise.all([
        db.collection(COLLECTIONS.WORKING_HOURS).where('nailistProfileId', 'in', chunk).get(),
        db.collection(COLLECTIONS.APPOINTMENTS).where('nailistProfileId', 'in', chunk).get(),
      ])

      hoursSnap.docs.forEach((doc) => {
        const d = doc.data()
        const nailistProfileId = d.nailistProfileId as string
        if (!workingHoursMap[nailistProfileId]) workingHoursMap[nailistProfileId] = new Map()
        workingHoursMap[nailistProfileId].set(d.dayOfWeek as number, {
          startTime: d.startTime as string,
          endTime: d.endTime as string,
          isActive: d.isActive as boolean,
        })
      })

      appointmentsSnap.docs.forEach((doc) => {
        const d = doc.data()
        if (!['PENDING', 'CONFIRMED'].includes(d.status as string)) return
        const nailistProfileId = d.nailistProfileId as string
        if (!appointmentsMap[nailistProfileId]) appointmentsMap[nailistProfileId] = []
        const start: Date = d.startTime?.toDate?.() ?? new Date(d.startTime)
        const end: Date = d.endTime?.toDate?.() ?? new Date(d.endTime)
        appointmentsMap[nailistProfileId].push({ startTime: start.toISOString(), endTime: end.toISOString() })
      })
    }),
  )

  const today = date ? israelNow() : null

  nailists.forEach((n) => {
    const id = n.id as string
    const workingHours = workingHoursMap[id] ?? new Map()
    const appointments = appointmentsMap[id] ?? []
    n.nextAvailableSlot = findNextAvailableSlot(workingHours, appointments, DEFAULT_SLOT_DURATION_MINUTES)
    if (date) {
      const nowMinutes = today && date === today.dateStr ? today.minutesSinceMidnight : undefined
      const { workingDay, fullyBooked } = computeDateAvailability(
        date,
        workingHours.get(getDayOfWeek(date)),
        DEFAULT_SLOT_DURATION_MINUTES,
        appointments,
        nowMinutes,
      )
      n.availableOnDate = workingDay && !fullyBooked
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const radius = Number(searchParams.get('radius') ?? '20')
    const pageSize = Number(searchParams.get('pageSize') ?? '12')
    const offset = Math.max(0, Number(searchParams.get('offset') ?? '0'))
    const date = searchParams.get('date') ?? undefined

    const db = adminDb()
    const isAuthenticated = await isAuthenticatedRequest(request)

    if (lat && lng) {
      const center: [number, number] = [Number(lat), Number(lng)]
      const bounds = geohashQueryBounds(center, radius * 1000)

      // Filter isActive in JS to avoid requiring a composite (isActive, geohash) Firestore index
      const queries = bounds.map(([start, end]) =>
        db
          .collection(COLLECTIONS.NAILIST_PROFILES)
          .where('geohash', '>=', start)
          .where('geohash', '<=', end)
          .get()
      )

      const snapshots = await Promise.all(queries)
      const seen = new Set<string>()
      const nailists: Array<Record<string, unknown>> = []

      for (const snap of snapshots) {
        for (const doc of snap.docs) {
          if (seen.has(doc.id)) continue
          seen.add(doc.id)
          const data = doc.data() as Record<string, unknown>
          if (!data.isActive) continue
          if (data.latitude == null || data.longitude == null) continue
          const distKm = distanceBetween([data.latitude as number, data.longitude as number], center)
          if (distKm <= radius) {
            nailists.push({ id: doc.id, ...data, distanceKm: distKm })
          }
        }
      }

      nailists.sort((a, b) => (a.distanceKm as number) - (b.distanceKm as number))
      const page = nailists.slice(offset, offset + pageSize)
      await Promise.all([attachServiceNames(db, page), attachAvailability(db, page, date)])
      sanitizeNailists(page, isAuthenticated)

      return NextResponse.json({
        data: page,
        total: nailists.length,
        hasMore: nailists.length > offset + pageSize,
      })
    }

    // No location — paginate active profiles in a stable, deterministic order.
    // Without an explicit orderBy, Firestore doesn't guarantee the same
    // relative ordering across repeated queries, so incrementing limit() per
    // "load more" click could return page 2 with duplicates of or gaps from
    // page 1. orderBy(documentId()) needs no composite index (unlike
    // createdAt, which isn't indexed for this collection) while still being
    // deterministic. Fetch one extra doc beyond the requested page to detect
    // hasMore without a separate count query (Firestore has no cheap COUNT).
    const snap = await db
      .collection(COLLECTIONS.NAILIST_PROFILES)
      .where('isActive', '==', true)
      .orderBy(FieldPath.documentId())
      .limit(offset + pageSize + 1)
      .get()

    const nailists = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    const hasMore = nailists.length > offset + pageSize
    const page = nailists.slice(offset, offset + pageSize)
    await Promise.all([attachServiceNames(db, page), attachAvailability(db, page, date)])
    sanitizeNailists(page, isAuthenticated)

    return NextResponse.json({
      data: page,
      total: nailists.length,
      hasMore,
    })
  } catch (error) {
    console.error('GET /api/nailists error:', error)
    return NextResponse.json({ error: 'Failed to fetch nailists' }, { status: 500 })
  }
}
