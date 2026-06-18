import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { haversineDistanceKm } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const radius = Number(searchParams.get('radius') ?? '20')
    const pageSize = Number(searchParams.get('pageSize') ?? '12')

    const db = adminDb()
    let q = db.collection(COLLECTIONS.NAILIST_PROFILES).where('isActive', '==', true)

    const snap = await q.limit(50).get()

    let nailists = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

    if (lat && lng) {
      const userLat = Number(lat)
      const userLng = Number(lng)
      nailists = nailists
        .filter((n: any) => n.latitude != null && n.longitude != null)
        .map((n: any) => ({
          ...n,
          distanceKm: haversineDistanceKm(userLat, userLng, n.latitude, n.longitude),
        }))
        .filter((n: any) => n.distanceKm <= radius)
        .sort((a: any, b: any) => a.distanceKm - b.distanceKm)
    }

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
