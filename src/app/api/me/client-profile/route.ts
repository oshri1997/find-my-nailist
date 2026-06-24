import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'

const patchSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phoneNumber: z.string().min(1).optional(),
  city: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const decoded = await adminAuth().verifyIdToken(token)
    const db = adminDb()

    const snap = await db
      .collection(COLLECTIONS.CLIENT_PROFILES)
      .where('userId', '==', decoded.uid)
      .limit(1)
      .get()

    if (!snap.empty) {
      const doc = snap.docs[0]
      return NextResponse.json({ data: { id: doc.id, ...doc.data() } })
    }

    // Auto-create a client profile so any logged-in user can book appointments
    const now = FieldValue.serverTimestamp()
    const ref = await db.collection(COLLECTIONS.CLIENT_PROFILES).add({
      userId: decoded.uid,
      email: decoded.email ?? '',
      displayName: decoded.name ?? decoded.email?.split('@')[0] ?? '',
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({ data: { id: ref.id, userId: decoded.uid } }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const decoded = await adminAuth().verifyIdToken(token)
    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const db = adminDb()
    const snap = await db
      .collection(COLLECTIONS.CLIENT_PROFILES)
      .where('userId', '==', decoded.uid)
      .limit(1)
      .get()

    if (snap.empty) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }
    if (parsed.data.firstName !== undefined) updates.firstName = parsed.data.firstName
    if (parsed.data.lastName !== undefined) updates.lastName = parsed.data.lastName
    if (parsed.data.firstName && parsed.data.lastName) {
      updates.displayName = `${parsed.data.firstName} ${parsed.data.lastName}`
    }
    if (parsed.data.phoneNumber !== undefined) updates.phoneNumber = parsed.data.phoneNumber
    if (parsed.data.city !== undefined) updates.city = parsed.data.city

    await snap.docs[0].ref.update(updates)
    return NextResponse.json({ data: { id: snap.docs[0].id, ...updates } })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
