import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'
import { serializeAnnouncement } from '@/lib/announcements'

// The only supported transition: PUBLISHED -> RETRACTED. title/body are
// immutable once published (see src/types/index.ts) so this never accepts
// content fields — a mistake is fixed by retracting and publishing a new one.
const patchSchema = z.object({ status: z.literal('RETRACTED') }).strict()

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(request)
  if (!admin) return adminUnauthorized()

  try {
    patchSchema.parse(await request.json())
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'הבקשה תומכת רק בביטול פרסום (status: RETRACTED)' }, { status: 400 })
    }
    return NextResponse.json({ error: 'גוף הבקשה אינו תקין' }, { status: 400 })
  }

  const { id } = await params

  try {
    const { FieldValue } = await import('firebase-admin/firestore')
    const db = adminDb()
    const ref = db.collection(COLLECTIONS.ANNOUNCEMENTS).doc(id)
    const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc()

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists) return { kind: 'NOT_FOUND' as const }

      const current = snap.data()!
      if (current.status !== 'PUBLISHED') return { kind: 'INVALID_TRANSITION' as const, status: current.status }

      const updatedAt = FieldValue.serverTimestamp()
      tx.update(ref, { status: 'RETRACTED', updatedAt })
      tx.set(auditRef, {
        actorUid: admin.uid,
        actorEmail: admin.email,
        action: 'ANNOUNCEMENT_RETRACT',
        targetType: 'announcement',
        targetId: id,
        metadata: { title: current.title },
        createdAt: updatedAt,
      })

      return { kind: 'UPDATED' as const, data: { ...current, status: 'RETRACTED' } }
    })

    if (result.kind === 'NOT_FOUND') return NextResponse.json({ error: 'הכרזה לא נמצאה' }, { status: 404 })
    if (result.kind === 'INVALID_TRANSITION') {
      return NextResponse.json({ error: `אי אפשר לבטל פרסום מסטטוס ${result.status}` }, { status: 409 })
    }

    return NextResponse.json({ data: serializeAnnouncement(id, result.data) })
  } catch (error) {
    console.error('PATCH /api/admin/announcements/[id] error:', error)
    return NextResponse.json({ error: 'עדכון ההכרזה נכשל' }, { status: 500 })
  }
}
