import { NextRequest, NextResponse } from 'next/server'
import { sendAppointmentRequest, sendClientConfirmedEmail } from '@/lib/email'

// Protected by a secret param — only for verifying email flows
// ?secret=xxx              → basic connectivity check
// ?secret=xxx&type=booking → simulate new booking emails (nailist + client)
// ?secret=xxx&type=confirmed → simulate client confirmation email
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.DEBUG_EMAIL_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })
  }

  const to = request.nextUrl.searchParams.get('to') ?? 'test@example.com'
  const type = request.nextUrl.searchParams.get('type') ?? 'ping'

  try {
    if (type === 'booking') {
      const fakeConfirmUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://find-my-nailist-production.up.railway.app'}/api/appointments/confirm?token=TEST_TOKEN`
      await sendAppointmentRequest({
        clientEmail: to,
        nailistEmail: to,
        clientName: 'לקוחה לדוגמה',
        nailistBusinessName: 'סטודיו בדיקה',
        serviceName: "ג'ל צרפתי",
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        price: 150,
        currency: 'ILS',
        confirmUrl: fakeConfirmUrl,
      })
      return NextResponse.json({ ok: true, type: 'booking', sentTo: to })
    }

    if (type === 'confirmed') {
      await sendClientConfirmedEmail({
        clientEmail: to,
        clientName: 'לקוחה לדוגמה',
        nailistBusinessName: 'סטודיו בדיקה',
        serviceName: "ג'ל צרפתי",
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        price: 150,
        currency: 'ILS',
      })
      return NextResponse.json({ ok: true, type: 'confirmed', sentTo: to })
    }

    // Default: simple ping using the confirmed email function
    await sendClientConfirmedEmail({
      clientEmail: to,
      clientName: 'בדיקה',
      nailistBusinessName: 'בדיקת חיבור',
      serviceName: 'ping',
      startTime: new Date(),
      price: 0,
      currency: 'ILS',
    })
    return NextResponse.json({ ok: true, type: 'ping', sentTo: to })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Debug email error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
