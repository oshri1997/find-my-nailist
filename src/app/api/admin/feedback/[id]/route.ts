import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'
import type { FeedbackPriority, FeedbackStatus } from '@/types'

const statusSchema = z.enum(['NEW', 'IN_REVIEW', 'PLANNED', 'RESOLVED', 'CLOSED'])
const prioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL'])
const updateSchema = z.object({
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  internalNote: z.string().trim().max(2000).nullable().optional(),
}).strict().refine((data) => Object.values(data).some((value) => value !== undefined), {
  message: 'יש לעדכן לפחות שדה אחד',
})

const VALID_STATUS_TRANSITIONS: Record<FeedbackStatus, readonly FeedbackStatus[]> = {
  NEW: ['IN_REVIEW', 'CLOSED'],
  IN_REVIEW: ['PLANNED', 'RESOLVED', 'CLOSED'],
  PLANNED: ['IN_REVIEW', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['IN_REVIEW', 'CLOSED'],
  CLOSED: ['IN_REVIEW'],
}

type TransactionResult =
  | { kind: 'NOT_FOUND' }
  | { kind: 'INVALID_TRANSITION'; currentStatus: FeedbackStatus }
  | { kind: 'UNCHANGED'; data: Record<string, unknown> }
  | { kind: 'UPDATED'; data: Record<string, unknown>; changes: Record<string, unknown> }

function serializeFeedback(id: string, data: Record<string, unknown>, updatedAt?: string) {
  const timestamp = (value: unknown) => {
    if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
      return value.toDate().toISOString()
    }
    return null
  }

  return {
    id,
    reporterUid: typeof data.reporterUid === 'string' ? data.reporterUid : '',
    reporterEmail: typeof data.reporterEmail === 'string' ? data.reporterEmail : '',
    reporterDisplayName: typeof data.reporterDisplayName === 'string' ? data.reporterDisplayName : '',
    reporterRole: typeof data.reporterRole === 'string' ? data.reporterRole : null,
    type: data.type,
    subject: typeof data.subject === 'string' ? data.subject : '',
    description: typeof data.description === 'string' ? data.description : '',
    status: data.status,
    priority: data.priority,
    pageUrl: typeof data.pageUrl === 'string' ? data.pageUrl : '',
    appVersion: typeof data.appVersion === 'string' ? data.appVersion : null,
    internalNote: typeof data.internalNote === 'string' ? data.internalNote : null,
    createdAt: timestamp(data.createdAt),
    updatedAt: updatedAt ?? timestamp(data.updatedAt),
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(request)
  if (!admin) return adminUnauthorized()

  let body: z.infer<typeof updateSchema>
  try {
    body = updateSchema.parse(await request.json())
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'פרטי עדכון הפנייה אינם תקינים' }, { status: 400 })
    }
    return NextResponse.json({ error: 'גוף הבקשה אינו תקין' }, { status: 400 })
  }

  const { id } = await params
  if (!id || id.length > 150) return NextResponse.json({ error: 'מזהה פנייה לא תקין' }, { status: 400 })

  const db = adminDb()
  const ref = db.collection(COLLECTIONS.FEEDBACK).doc(id)
  const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc()

  try {
    const result = await db.runTransaction(async (tx): Promise<TransactionResult> => {
      const snap = await tx.get(ref)
      if (!snap.exists) return { kind: 'NOT_FOUND' }

      const current = snap.data() as Record<string, unknown>
      const currentStatus = current.status as FeedbackStatus
      const currentPriority = current.priority as FeedbackPriority
      if (!Object.hasOwn(VALID_STATUS_TRANSITIONS, currentStatus)) {
        return { kind: 'INVALID_TRANSITION', currentStatus }
      }

      if (body.status && body.status !== currentStatus && !VALID_STATUS_TRANSITIONS[currentStatus].includes(body.status)) {
        return { kind: 'INVALID_TRANSITION', currentStatus }
      }

      const updates: Record<string, unknown> = {}
      const changes: Record<string, unknown> = {}
      if (body.status !== undefined && body.status !== currentStatus) {
        updates.status = body.status
        changes.status = { from: currentStatus, to: body.status }
      }
      if (body.priority !== undefined && body.priority !== currentPriority) {
        updates.priority = body.priority
        changes.priority = { from: currentPriority, to: body.priority }
      }
      const currentNote = typeof current.internalNote === 'string' ? current.internalNote : null
      const requestedNote = body.internalNote === undefined ? currentNote : body.internalNote
      if (requestedNote !== currentNote) {
        updates.internalNote = requestedNote
        // Do not duplicate potentially sensitive manager notes into audit logs.
        changes.internalNoteChanged = true
      }

      if (Object.keys(updates).length === 0) return { kind: 'UNCHANGED', data: current }

      updates.updatedAt = FieldValue.serverTimestamp()
      tx.update(ref, updates)
      // Unlike the best-effort helper used by legacy admin actions, a report
      // update must have a durable audit record. Writing both documents in
      // this transaction means Firestore commits both or neither.
      tx.set(auditRef, {
        actorUid: admin.uid,
        actorEmail: admin.email,
        action: 'FEEDBACK_UPDATE',
        targetType: 'feedback',
        targetId: id,
        metadata: changes,
        createdAt: FieldValue.serverTimestamp(),
      })
      return { kind: 'UPDATED', data: { ...current, ...updates }, changes }
    })

    if (result.kind === 'NOT_FOUND') return NextResponse.json({ error: 'פנייה לא נמצאה' }, { status: 404 })
    if (result.kind === 'INVALID_TRANSITION') {
      return NextResponse.json({ error: `אי אפשר לעבור מהסטטוס ${result.currentStatus}` }, { status: 409 })
    }

    if (result.kind === 'UNCHANGED') {
      return NextResponse.json({ data: serializeFeedback(id, result.data), changed: false })
    }

    return NextResponse.json({
      data: serializeFeedback(id, result.data, new Date().toISOString()),
      changed: true,
    })
  } catch (error) {
    console.error('PATCH /api/admin/feedback/[id] error:', error)
    return NextResponse.json({ error: 'לא הצלחנו לעדכן את הפנייה' }, { status: 500 })
  }
}
