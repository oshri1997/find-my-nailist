import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'
import {
  sendAdminEmails,
  EMAIL_TEMPLATES,
  MAX_RECIPIENTS,
  type EmailTemplate,
} from '@/lib/admin-email'

const MAX_SUBJECT_LENGTH = 150
const MAX_MESSAGE_LENGTH = 5000
const OPERATION_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return adminUnauthorized()

  const body = await request.json().catch(() => null)
  const template: string = body?.template
  const userIds: unknown = body?.userIds
  const operationId = typeof body?.operationId === 'string' ? body.operationId : undefined

  if (!EMAIL_TEMPLATES.includes(template as EmailTemplate)) {
    return NextResponse.json({ error: 'סוג מייל לא תקין' }, { status: 400 })
  }
  if (!Array.isArray(userIds) || userIds.length === 0 || !userIds.every((id) => typeof id === 'string')) {
    return NextResponse.json({ error: 'רשימת נמענים לא תקינה' }, { status: 400 })
  }
  if (userIds.length > MAX_RECIPIENTS) {
    return NextResponse.json(
      { error: `ניתן לשלוח עד ${MAX_RECIPIENTS} נמענים בפעולה אחת` },
      { status: 400 }
    )
  }
  if (operationId && !OPERATION_ID_PATTERN.test(operationId)) {
    return NextResponse.json({ error: 'מזהה פעולה לא תקין' }, { status: 400 })
  }

  const subject = typeof body?.subject === 'string' ? body.subject.trim() : ''
  const message = typeof body?.message === 'string' ? body.message.trim() : ''

  if (template === 'CUSTOM') {
    if (!subject || !message) {
      return NextResponse.json({ error: 'נדרשים נושא ותוכן להודעה' }, { status: 400 })
    }
    if (subject.length > MAX_SUBJECT_LENGTH || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: 'הנושא או התוכן ארוכים מדי' }, { status: 400 })
    }
  }

  const data = await sendAdminEmails({
    template: template as EmailTemplate,
    userIds: [...new Set(userIds as string[])],
    subject,
    message,
    operationId,
    admin,
  })

  return NextResponse.json({ data })
}
