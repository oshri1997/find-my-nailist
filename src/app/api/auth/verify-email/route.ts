import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { sendVerificationEmail } from '@/lib/email'

// Unlike reset-password, this always requires a real session — it's for the
// signed-in user's own account, not a public "type any email" form, so there's
// no account-enumeration concern here worth hiding behind a blanket {ok:true}.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let decoded: { email?: string; email_verified?: boolean }
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

  try {
    const link = await adminAuth().generateEmailVerificationLink(decoded.email)
    await sendVerificationEmail({ email: decoded.email, verifyLink: link })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[verify-email] send failed:', err)
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 })
  }
}
