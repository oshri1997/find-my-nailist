import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'

const schema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { status } = schema.parse(body)
    const db = adminDb()

    await db.collection(COLLECTIONS.APPOINTMENTS).doc(id).update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ message: 'Status updated', status })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error(`PATCH /api/appointments/${id}/status error:`, error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}
