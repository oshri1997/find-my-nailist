import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { sendVerificationEmail } from '@/lib/email'
import { FieldValue } from 'firebase-admin/firestore'

const RESEND_COOLDOWN_MS = 10 * 60 * 1000

export type SendVerificationEmailResult =
  | { ok: true }
  | { ok: false; rateLimited: true; retryAfterSeconds: number }

// Shared by every caller that can trigger a verification email — the
// initial send (once role is known, at /api/me/set-role) and the manual
// resend (/api/auth/verify-email). The 10-minute cooldown lives here, not
// in each route, so no call path can bypass it (e.g. a retried
// role-selection request silently double-sending).
export async function sendRoleAwareVerificationEmail(
  uid: string,
  email: string,
  role: 'NAILIST' | 'CLIENT'
): Promise<SendVerificationEmailResult> {
  const db = adminDb()
  const userRef = db.collection(COLLECTIONS.USERS).doc(uid)

  const userSnap = await userRef.get()
  const lastSentAt = userSnap.data()?.lastVerificationEmailSentAt?.toDate?.() as Date | undefined
  if (lastSentAt) {
    const elapsedMs = Date.now() - lastSentAt.getTime()
    if (elapsedMs < RESEND_COOLDOWN_MS) {
      return { ok: false, rateLimited: true, retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / 1000) }
    }
  }

  // Marked before the actual send, not after — every attempt (successful or
  // failed) counts against the cooldown, so a send that's currently failing
  // (e.g. a provider-side outage) can't be retried in a tight loop either.
  await userRef.set({ lastVerificationEmailSentAt: FieldValue.serverTimestamp() }, { merge: true })

  const link = await adminAuth().generateEmailVerificationLink(email)
  await sendVerificationEmail({ email, verifyLink: link, role })
  return { ok: true }
}
