import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminAuth } from '@/lib/firebase/admin'
import { sendPasswordResetEmail } from '@/lib/email'

const schema = z.object({
  email: z.string().email(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid email' }, { status: 400 })
  }

  const { email } = parsed.data

  // Always return success to avoid leaking whether an email is registered
  try {
    const link = await adminAuth().generatePasswordResetLink(email)
    void sendPasswordResetEmail({ email, resetLink: link }).catch(err =>
      console.error('[reset-password] email send failed:', err)
    )
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? ''
    // user-not-found → swallow silently (security: don't leak account existence)
    if (code !== 'auth/user-not-found') {
      console.error('[reset-password] generatePasswordResetLink failed:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
