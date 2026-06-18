import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'

const createSchema = z.object({
  nailistProfileId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  durationMinutes: z.number().int().min(15),
  price: z.number().min(0),
  currency: z.string().default('USD'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createSchema.parse(body)
    const db = adminDb()
    const now = FieldValue.serverTimestamp()

    const ref = await db.collection(COLLECTIONS.SERVICES).add({
      ...data,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({ data: { id: ref.id } }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('POST /api/services error:', error)
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
  }
}
