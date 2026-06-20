import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// Protected by a secret param — only for verifying Resend credentials
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.DEBUG_EMAIL_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const key = process.env.RESEND_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })
  }

  const to = request.nextUrl.searchParams.get('to') ?? process.env.GMAIL_USER ?? 'test@example.com'

  try {
    const resend = new Resend(key)
    const result = await resend.emails.send({
      from: 'מצאי נייליסטית <onboarding@resend.dev>',
      to: [to],
      subject: '✅ בדיקת מייל — מצאי נייליסטית',
      html: `<div dir="rtl" style="font-family:Arial,sans-serif">
        <h2 style="color:#d946a8">המייל עובד! 🎉</h2>
        <p>Resend מחובר בהצלחה — מעכשיו לקוחות ונייליסטיות יקבלו מיילים על תורים.</p>
      </div>`,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: result.data?.id, sentTo: to })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Debug email error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
