import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'
import { requestEmailChange, confirmEmailChange } from '@/lib/admin-email-change'
import { sendAdminEmails } from '@/lib/admin-email'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(request)
  if (!admin) return adminUnauthorized()

  const { id } = await params
  const body = await request.json().catch(() => null)

  if (body?.step === 'request') {
    if (typeof body.email !== 'string') {
      return NextResponse.json({ error: 'כתובת מייל לא תקינה' }, { status: 400 })
    }
    const result = await requestEmailChange({ targetUid: id, newEmail: body.email, admin })
    return result.ok
      ? NextResponse.json({ data: result.data })
      : NextResponse.json({ error: result.error }, { status: result.status })
  }

  if (body?.step === 'confirm') {
    if (typeof body.challengeId !== 'string' || typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) {
      return NextResponse.json({ error: 'קוד אישור לא תקין' }, { status: 400 })
    }
    const result = await confirmEmailChange({ challengeId: body.challengeId, code: body.code, targetUid: id, admin })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    // A corrected sign-in address is useful only once its owner can verify it.
    // Report a send failure separately: the Auth change itself has succeeded.
    let verification
    try {
      verification = await sendAdminEmails({
        template: 'VERIFICATION',
        userIds: [id],
        admin,
      })
    } catch (error) {
      console.error('[admin-email-change] follow-up verification send failed:', error)
      verification = {
        sent: [],
        skipped: [],
        failed: [{ id, email: result.data.newEmail, error: 'לא ניתן להעביר את קישור האימות לשליחה' }],
      }
    }
    return NextResponse.json({ data: { ...result.data, verification } })
  }

  return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
}
