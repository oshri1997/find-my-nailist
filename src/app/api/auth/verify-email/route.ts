import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { sendVerificationEmail } from '@/lib/email'
import { FieldValue } from 'firebase-admin/firestore'

const RESEND_COOLDOWN_MS = 10 * 60 * 1000

// Unlike reset-password, this always requires a real session — it's for the
// signed-in user's own account, not a public "type any email" form, so there's
// no account-enumeration concern here worth hiding behind a blanket {ok:true}.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let decoded: { uid: string; email?: string; email_verified?: boolean }
  try {
    decoded = await adminAuth().verifyIdToken(token)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!decoded.email) {
    return NextResponse.json({ error: 'No email on account' }, { status: 400 })
  }

  if (decoded.email_verified) {
    return NextResponse.json({ ok: true, alreadyVerified: true })
  }

  const db = adminDb()
  const userRef = db.collection(COLLECTIONS.USERS).doc(decoded.uid)

  // Rate-limited to one send per 10 minutes — generateEmailVerificationLink
  // is itself a Firebase-throttled operation, so hammering it via repeated
  // resend clicks (deliberate spam or an impatient double-click) only makes
  // failures more likely, not less.
  const userSnap = await userRef.get()
  const lastSentAt = userSnap.data()?.lastVerificationEmailSentAt?.toDate?.() as Date | undefined
  if (lastSentAt) {
    const elapsedMs = Date.now() - lastSentAt.getTime()
    if (elapsedMs < RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / 1000)
      const minutesLeft = Math.ceil(retryAfterSeconds / 60)
      return NextResponse.json(
        { error: `ניתן לשלוח שוב רק בעוד ${minutesLeft} דקות`, retryAfterSeconds },
        { status: 429 }
      )
    }
  }

  // Marked before the actual send, not after — every attempt (successful or
  // failed) counts against the cooldown, so a send that's currently failing
  // (e.g. a provider-side outage) can't be retried in a tight loop either.
  await userRef.set({ lastVerificationEmailSentAt: FieldValue.serverTimestamp() }, { merge: true })

  try {
    const link = await adminAuth().generateEmailVerificationLink(decoded.email)
    await sendVerificationEmail({ email: decoded.email, verifyLink: link })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[verify-email] send failed:', err)
    return NextResponse.json({ error: 'שגיאה בשליחת המייל — נסי שוב בעוד כמה דקות' }, { status: 500 })
  }
}
