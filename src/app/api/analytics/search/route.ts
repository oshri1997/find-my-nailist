import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { z } from 'zod'

const schema = z.object({
  query: z.string().trim().max(100).optional(),
  filter: z.string().trim().max(50),
  resultsCount: z.number().int().min(0),
})

// Anonymous, fire-and-forget search analytics — powers the admin "מה לקוחות
// מחפשות" dashboard. No auth required (most searches happen logged out); a
// bad or missing body just means the event is skipped, never a hard failure
// visible to the visitor.
export async function POST(request: NextRequest) {
  try {
    const body = schema.safeParse(await request.json())
    if (!body.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const { query, filter, resultsCount } = body.data
    const { FieldValue } = await import('firebase-admin/firestore')

    await adminDb().collection(COLLECTIONS.SEARCH_EVENTS).add({
      query: query || null,
      filter,
      resultsCount,
      createdAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ message: 'ok' }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to log search' }, { status: 500 })
  }
}
