import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  durationMinutes: z.number().int().min(15).optional(),
  price: z.number().min(0).optional(),
  currency: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = request.cookies.get('auth-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let decoded: { uid: string }
  try {
    decoded = await adminAuth().verifyIdToken(token)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data = patchSchema.parse(body)
    const db = adminDb()

    const svcDoc = await db.collection(COLLECTIONS.SERVICES).doc(id).get()
    if (!svcDoc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const nailistSnap = await db
      .collection(COLLECTIONS.NAILIST_PROFILES)
      .where('userId', '==', decoded.uid)
      .limit(1)
      .get()
    const ownedProfileId = nailistSnap.empty ? null : nailistSnap.docs[0].id
    if (!ownedProfileId || ownedProfileId !== svcDoc.data()!.nailistProfileId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.collection(COLLECTIONS.SERVICES).doc(id).update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('PATCH /api/services/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await adminAuth().verifyIdToken(token)

    await adminDb().collection(COLLECTIONS.SERVICES).doc(id).update({
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 })
  }
}
