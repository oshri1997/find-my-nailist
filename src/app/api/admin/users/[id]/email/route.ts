import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'
import { requestEmailChange, confirmEmailChange } from '@/lib/admin-email-change'

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
    if (typeof body.challengeId !== 'string' || typeof body.code !== 'string') {
      return NextResponse.json({ error: 'קוד אישור לא תקין' }, { status: 400 })
    }
    const result = await confirmEmailChange({ challengeId: body.challengeId, code: body.code, admin })
    return result.ok
      ? NextResponse.json({ data: result.data })
      : NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
}
