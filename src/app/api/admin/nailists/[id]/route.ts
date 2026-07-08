import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit-log'
import { FieldValue } from 'firebase-admin/firestore'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verifyAdmin(request)) return adminUnauthorized()

  const { id } = await params
  const db = adminDb()
  const snap = await db.collection(COLLECTIONS.NAILIST_PROFILES).doc(id).get()
  if (!snap.exists) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })

  const data = snap.data()!
  return NextResponse.json({
    data: {
      id: snap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
    },
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(request)
  if (!admin) return adminUnauthorized()

  const { id } = await params
  const db = adminDb()
  const body = await request.json()
  const { isActive, isVerified } = body

  if (isActive === undefined && isVerified === undefined) {
    return NextResponse.json({ error: 'יש לספק isActive ו/או isVerified' }, { status: 400 })
  }
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    return NextResponse.json({ error: 'isActive חייב להיות boolean' }, { status: 400 })
  }
  if (isVerified !== undefined && typeof isVerified !== 'boolean') {
    return NextResponse.json({ error: 'isVerified חייב להיות boolean' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }
  if (isActive !== undefined) updates.isActive = isActive
  if (isVerified !== undefined) updates.isVerified = isVerified

  await db.collection(COLLECTIONS.NAILIST_PROFILES).doc(id).update(updates)

  if (isActive !== undefined) {
    await writeAuditLog({
      actorUid: admin.uid,
      actorEmail: admin.email,
      action: 'NAILIST_TOGGLE_ACTIVE',
      targetType: 'nailistProfile',
      targetId: id,
      metadata: { isActive },
    })
  }
  if (isVerified !== undefined) {
    await writeAuditLog({
      actorUid: admin.uid,
      actorEmail: admin.email,
      action: 'NAILIST_TOGGLE_VERIFIED',
      targetType: 'nailistProfile',
      targetId: id,
      metadata: { isVerified },
    })
  }

  const message = isActive !== undefined
    ? (isActive ? 'הנייליסטית הופעלה' : 'הנייליסטית הושבתה')
    : (isVerified ? 'הנייליסטית אומתה' : 'האימות בוטל')

  return NextResponse.json({ message })
}
