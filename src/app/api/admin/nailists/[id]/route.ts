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
  const { isActive } = body

  if (typeof isActive !== 'boolean') {
    return NextResponse.json({ error: 'isActive חייב להיות boolean' }, { status: 400 })
  }

  await db.collection(COLLECTIONS.NAILIST_PROFILES).doc(id).update({
    isActive,
    updatedAt: FieldValue.serverTimestamp(),
  })

  await writeAuditLog({
    actorUid: admin.uid,
    actorEmail: admin.email,
    action: 'NAILIST_TOGGLE_ACTIVE',
    targetType: 'nailistProfile',
    targetId: id,
    metadata: { isActive },
  })

  return NextResponse.json({ message: isActive ? 'הנייליסטית הופעלה' : 'הנייליסטית הושבתה' })
}
