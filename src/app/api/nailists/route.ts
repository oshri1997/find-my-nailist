import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'

import { geohashQueryBounds, distanceBetween } from 'geofire-common'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const radius = Number(searchParams.get('radius') ?? '20')
    const pageSize = Number(searchParams.get('pageSize') ?? '12')

    const db = adminDb()

    if (lat && lng) {
      const center: [number, number] = [Number(lat), Number(lng)]
      const bounds = geohashQueryBounds(center, radius * 1000)

      const queries = bounds.map(([start, end]) =>
        db
          .collection(COLLECTIONS.NAILIST_PROFILES)
          .where('isActive', '==', true)
          .where('geohash', '>=', start)
          .where('geohash', '<=', end)
          .get()
      )

      const snapshots = await Promise.all(queries)
      const seen = new Set<string>()
      const nailists: unknown[] = []

      for (const snap of snapshots) {
        for (const doc of snap.docs) {
          if (seen.has(doc.id)) continue
          seen.add(doc.id)
          const data = doc.data() as Record<string, unknown>
          if (data.latitude == null || data.longitude == null) continue
          const distKm = distanceBetween([data.latitude as number, data.longitude as number], center)
          if (distKm <= radius) {
            nailists.push({ id: doc.id, ...data, distanceKm: distKm })
          }
        }
      }

      (nailists as Array<{ distanceKm: number }>).sort((a, b) => a.distanceKm - b.distanceKm)
      return NextResponse.json({
        data: nailists.slice(0, pageSize),
        total: nailists.length,
        hasMore: nailists.length > pageSize,
      })
    }

    // No location — return most recent active profiles
    const snap = await db
      .collection(COLLECTIONS.NAILIST_PROFILES)
      .where('isActive', '==', true)
      .limit(50)
      .get()

    const nailists = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

    return NextResponse.json({
      data: nailists.slice(0, pageSize),
      total: nailists.length,
      hasMore: nailists.length > pageSize,
    })
  } catch (error) {
    console.error('GET /api/nailists error:', error)
    return NextResponse.json({ error: 'Failed to fetch nailists' }, { status: 500 })
  }
}
