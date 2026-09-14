import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { sendAdminMessageEmail } from '@/lib/email'
import { sendRoleAwareVerificationEmail } from '@/lib/verification-email'
import { writeAuditLog } from '@/lib/audit-log'
import { FieldValue } from 'firebase-admin/firestore'

export const EMAIL_TEMPLATES = ['VERIFICATION', 'CUSTOM'] as const
export type EmailTemplate = (typeof EMAIL_TEMPLATES)[number]

export const MAX_RECIPIENTS = 100

export interface AdminEmailRecipient {
  id: string
  email: string
  displayName: string
  role: 'NAILIST' | 'CLIENT'
  emailVerified: boolean
}

export type AdminEmailSendResult = {
  sent: { id: string; email: string }[]
  skipped: { id: string; email: string; reason: string }[]
  failed: { id: string; email: string; error: string }[]
}

// Firebase Auth holds the address mail is actually delivered to — after an
// admin corrects a typo'd address there, the Firestore user doc still carries
// the old one until the user verifies (see /api/me/sync-email). Everything
// admin-initiated therefore reads the address from Auth, not Firestore.
export async function resolveRecipients(userIds: string[]): Promise<Map<string, AdminEmailRecipient>> {
  const db = adminDb()
  const result = new Map<string, AdminEmailRecipient>()
  if (userIds.length === 0) return result

  const userDocs = await db.getAll(
    ...userIds.map((id) => db.collection(COLLECTIONS.USERS).doc(id))
  )

  // getUsers takes at most 100 identifiers per call.
  const authRecords = new Map<string, { email?: string; emailVerified: boolean }>()
  for (let i = 0; i < userIds.length; i += 100) {
    const { users } = await adminAuth().getUsers(
      userIds.slice(i, i + 100).map((uid) => ({ uid }))
    )
    users.forEach((u) => authRecords.set(u.uid, { email: u.email, emailVerified: u.emailVerified }))
  }

  userDocs.forEach((doc) => {
    if (!doc.exists) return
    const data = doc.data()!
    const auth = authRecords.get(doc.id)
    const email = auth?.email ?? (data.email as string | undefined)
    if (!email) return
    result.set(doc.id, {
      id: doc.id,
      email,
      displayName: (data.displayName as string | undefined) ?? '',
      role: data.role === 'NAILIST' ? 'NAILIST' : 'CLIENT',
      emailVerified: auth?.emailVerified ?? false,
    })
  })

  return result
}

// Keeps the Firestore mirror in step with an address an admin corrected in
// Firebase Auth, and clears a bounce flag raised against the old address —
// otherwise the admin list keeps showing the typo and a "mail bounced" badge
// long after the problem was fixed.
async function syncCorrectedEmail(recipient: AdminEmailRecipient): Promise<void> {
  const db = adminDb()
  const userRef = db.collection(COLLECTIONS.USERS).doc(recipient.id)
  const snap = await userRef.get()
  if (snap.data()?.email === recipient.email) return

  await userRef.set(
    {
      email: recipient.email,
      emailDeliveryStatus: FieldValue.delete(),
      emailDeliveryBouncedAt: FieldValue.delete(),
      emailDeliveryEventId: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
}

export interface SendAdminEmailsParams {
  template: EmailTemplate
  userIds: string[]
  subject?: string
  message?: string
  admin: { uid: string; email: string }
}

export async function sendAdminEmails(params: SendAdminEmailsParams): Promise<AdminEmailSendResult> {
  const recipients = await resolveRecipients(params.userIds)
  const result: AdminEmailSendResult = { sent: [], skipped: [], failed: [] }

  for (const id of params.userIds) {
    const recipient = recipients.get(id)
    if (!recipient) {
      result.skipped.push({ id, email: '', reason: 'למשתמש אין כתובת מייל או שהחשבון נמחק' })
      continue
    }

    if (params.template === 'VERIFICATION' && recipient.emailVerified) {
      result.skipped.push({ id, email: recipient.email, reason: 'המייל כבר מאומת' })
      continue
    }

    try {
      if (params.template === 'VERIFICATION') {
        await syncCorrectedEmail(recipient)
        await sendRoleAwareVerificationEmail(recipient.id, recipient.email, recipient.role, { skipCooldown: true })
      } else {
        await sendAdminMessageEmail({
          email: recipient.email,
          subject: params.subject!,
          message: params.message!,
          name: recipient.displayName,
        })
      }
      result.sent.push({ id, email: recipient.email })

      await writeAuditLog({
        actorUid: params.admin.uid,
        actorEmail: params.admin.email,
        action: 'EMAIL_SEND',
        targetType: 'user',
        targetId: id,
        metadata: { template: params.template, recipientEmail: recipient.email, subject: params.subject },
      })
    } catch (error) {
      console.error('[admin-email] send failed for', id, error)
      result.failed.push({
        id,
        email: recipient.email,
        error: error instanceof Error ? error.message : 'שליחת המייל נכשלה',
      })
    }
  }

  return result
}
