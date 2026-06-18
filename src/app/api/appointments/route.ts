import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { z } from 'zod'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

const createSchema = z.object({
  nailistProfileId: z.string(),
  clientProfileId: z.string(),
  serviceId: z.string(),
  startTime: z.string().datetime(),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createSchema.parse(body)
    const db = adminDb()

    const serviceSnap = await db.collection(COLLECTIONS.SERVICES).doc(data.serviceId).get()
    if (!serviceSnap.exists) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }
    const service = serviceSnap.data()!

    const startTime = new Date(data.startTime)
    const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000)

    // Check for conflicts
    const conflictSnap = await db
      .collection(COLLECTIONS.APPOINTMENTS)
      .where('nailistProfileId', '==', data.nailistProfileId)
      .where('status', 'in', ['PENDING', 'CONFIRMED'])
      .where('startTime', '<', Timestamp.fromDate(endTime))
      .where('endTime', '>', Timestamp.fromDate(startTime))
      .limit(1)
      .get()

    if (!conflictSnap.empty) {
      return NextResponse.json({ error: 'Time slot not available' }, { status: 409 })
    }

    const now = FieldValue.serverTimestamp()
    const appointmentRef = await db.collection(COLLECTIONS.APPOINTMENTS).add({
      ...data,
      startTime: Timestamp.fromDate(startTime),
      endTime: Timestamp.fromDate(endTime),
      status: 'PENDING',
      price: service.price,
      currency: service.currency,
      serviceName: service.name,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({ data: { id: appointmentRef.id } }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('POST /api/appointments error:', error)
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
  }
}
