import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// Protected by a secret param — only for verifying Gmail credentials
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.DEBUG_EMAIL_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) {
    return NextResponse.json({ error: 'GMAIL_USER or GMAIL_APP_PASSWORD not set' }, { status: 500 })
  }

  try {
    const transport = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })

    await transport.verify()

    await transport.sendMail({
      from: `"מצאי נייליסטית" <${user}>`,
      to: user,
      subject: '✅ בדיקת מייל — מצאי נייליסטית',
      html: `<div dir="rtl" style="font-family:Arial,sans-serif">
        <h2 style="color:#d946a8">המייל עובד! 🎉</h2>
        <p>Gmail מחובר בהצלחה — מעכשיו לקוחות ונייליסטיות יקבלו מיילים על תורים.</p>
        <p style="color:#888;font-size:12px">נשלח מ: ${user}</p>
      </div>`,
    })

    return NextResponse.json({ ok: true, message: `Test email sent to ${user}` })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Debug email error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
