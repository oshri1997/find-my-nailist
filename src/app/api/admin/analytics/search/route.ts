import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'

const SAMPLE_LIMIT = 3000

interface Counted {
  value: string
  count: number
}

function topCounts(values: string[], limit: number): Counted[] {
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request)) return adminUnauthorized()

  const db = adminDb()
  const snap = await db
    .collection(COLLECTIONS.SEARCH_EVENTS)
    .orderBy('createdAt', 'desc')
    .limit(SAMPLE_LIMIT)
    .get()

  const events = snap.docs.map(d => {
    const data = d.data()
    return {
      query: (data.query as string | null) ?? null,
      filter: (data.filter as string) ?? 'הכל',
      resultsCount: (data.resultsCount as number) ?? 0,
    }
  })

  const queries = events.map(e => e.query?.trim().toLowerCase()).filter((q): q is string => !!q)
  const filters = events.map(e => e.filter)
  const zeroResultQueries = events
    .filter(e => e.resultsCount === 0 && e.query)
    .map(e => e.query!.trim().toLowerCase())

  return NextResponse.json({
    data: {
      sampledEvents: events.length,
      topQueries: topCounts(queries, 20),
      topFilters: topCounts(filters, 20),
      zeroResultQueries: topCounts(zeroResultQueries, 20),
    },
  })
}
