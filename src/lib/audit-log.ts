import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { AuditAction } from '@/types'

// Best-effort by design — an admin action (e.g. deleting a user) must still
// succeed even if this write fails; callers await it but the caller's own
// try/catch shouldn't have to special-case audit-log failures.
export async function writeAuditLog(params: {
  actorUid: string
  actorEmail: string
  action: AuditAction
  targetType: 'user' | 'review' | 'nailistProfile'
  targetId: string
  metadata?: Record<string, unknown>
}) {
  try {
    const { FieldValue } = await import('firebase-admin/firestore')
    await adminDb().collection(COLLECTIONS.AUDIT_LOGS).add({
      ...params,
      createdAt: FieldValue.serverTimestamp(),
    })
  } catch (error) {
    console.error('audit log write failed:', error)
  }
}
