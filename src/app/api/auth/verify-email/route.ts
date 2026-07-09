import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { sendRoleAwareVerificationEmail } from '@/lib/verification-email'

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
  const userSnap = await db.collection(COLLECTIONS.USERS).doc(decoded.uid).get()

  // Role-aware wording — falls back to the client copy for a not-yet-chosen
  // role (missing field defaults to 'CLIENT' throughout this app).
  const role = userSnap.data()?.role === 'NAILIST' ? 'NAILIST' : 'CLIENT'

  try {
    // The 10-minute cooldown check itself now lives inside
    // sendRoleAwareVerificationEmail — single source of truth shared with
    // /api/me/set-role's initial role-aware send, so neither path can bypass it.
    const result = await sendRoleAwareVerificationEmail(decoded.uid, decoded.email, role)
    if (!result.ok) {
      const minutesLeft = Math.ceil(result.retryAfterSeconds / 60)
      return NextResponse.json(
        { error: `ניתן לשלוח שוב רק בעוד ${minutesLeft} דקות`, retryAfterSeconds: result.retryAfterSeconds },
        { status: 429 }
      )
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[verify-email] send failed:', err)
    return NextResponse.json({ error: 'שגיאה בשליחת המייל — נסי שוב בעוד כמה דקות' }, { status: 500 })
  }
}
