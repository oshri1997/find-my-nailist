import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { sendVerificationEmail } from '@/lib/email'
import { FieldValue } from 'firebase-admin/firestore'

// Shared by the initial send (triggered once role is known, at
// /api/me/set-role) and the manual resend (/api/auth/verify-email) — marks
// the attempt on the user doc regardless of outcome, same reasoning as the
// resend route's own cooldown: generateEmailVerificationLink is itself a
// throttled Firebase operation.
export async function sendRoleAwareVerificationEmail(
  uid: string,
  email: string,
  role: 'NAILIST' | 'CLIENT'
): Promise<void> {
  const db = adminDb()
  await db.collection(COLLECTIONS.USERS).doc(uid).set(
    { lastVerificationEmailSentAt: FieldValue.serverTimestamp() },
    { merge: true }
  )
  const link = await adminAuth().generateEmailVerificationLink(email)
  await sendVerificationEmail({ email, verifyLink: link, role })
}
