import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { isAuthenticatedRequest, computeHasContactInfo, stripNailistContactFields } from '@/lib/nailist-contact'

import { geohashQueryBounds, distanceBetween } from 'geofire-common'
import type { Firestore } from 'firebase-admin/firestore'

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const radius = Number(searchParams.get('radius') ?? '20')
    const pageSize = Number(searchParams.get('pageSize') ?? '12')
    const offset = Math.max(0, Number(searchParams.get('offset') ?? '0'))

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
      await attachServiceNames(db, page)
      sanitizeNailists(page, isAuthenticated)

      return NextResponse.json({
        data: page,
        total: nailists.length,
        hasMore: nailists.length > offset + pageSize,
      })
    }

    // No location — return most recent active profiles. Fetch one extra doc
    // beyond the requested page to detect hasMore without a separate count
    // query (Firestore has no cheap COUNT — this is the standard workaround).
    const snap = await db
      .collection(COLLECTIONS.NAILIST_PROFILES)
      .where('isActive', '==', true)
      .limit(offset + pageSize + 1)
      .get()

    const nailists = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    const hasMore = nailists.length > offset + pageSize
    const page = nailists.slice(offset, offset + pageSize)
    await attachServiceNames(db, page)
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
