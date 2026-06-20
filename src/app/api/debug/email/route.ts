import { NextRequest, NextResponse } from 'next/server'
import { sendAppointmentRequest, sendClientConfirmedEmail } from '@/lib/email'
import { Resend } from 'resend'

// Protected by a secret param — only for verifying email flows
// ?secret=xxx              → basic connectivity check
// ?secret=xxx&type=booking → simulate new booking emails (nailist + client)
// ?secret=xxx&type=confirmed → simulate client confirmation email
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
  const type = request.nextUrl.searchParams.get('type') ?? 'ping'

  try {
    if (type === 'booking') {
      // Simulates what happens when a client books an appointment
      const fakeConfirmUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://find-my-nailist-production.up.railway.app'}/api/appointments/confirm?token=TEST_TOKEN`
      await sendAppointmentRequest({
        clientEmail: to,
        nailistEmail: to,
        clientName: 'לקוחה לדוגמה',
        nailistBusinessName: 'סטודיו בדיקה',
        serviceName: 'ג׳ל צרפתי',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        price: 150,
        currency: 'ILS',
        confirmUrl: fakeConfirmUrl,
      })
      return NextResponse.json({ ok: true, type: 'booking', sentTo: to, note: 'שני מיילים נשלחו: ללקוחה + לנייליסטית' })
    }

    if (type === 'confirmed') {
      // Simulates what happens when nailist clicks confirm
      await sendClientConfirmedEmail({
        clientEmail: to,
        clientName: 'לקוחה לדוגמה',
        nailistBusinessName: 'סטודיו בדיקה',
        serviceName: 'ג׳ל צרפתי',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        price: 150,
        currency: 'ILS',
      })
      return NextResponse.json({ ok: true, type: 'confirmed', sentTo: to, note: 'מייל אישור תור נשלח ללקוחה' })
    }

    // Default: simple connectivity ping
    const resend = new Resend(key)
    const result = await resend.emails.send({
      from: 'מצאי נייליסטית <onboarding@resend.dev>',
      to: [to],
      subject: '✅ בדיקת חיבור — מצאי נייליסטית',
      html: '<div dir="rtl"><h2 style="color:#d946a8">Resend עובד! 🎉</h2></div>',
    })
    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
    return NextResponse.json({ ok: true, type: 'ping', id: result.data?.id, sentTo: to })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Debug email error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
