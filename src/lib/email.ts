import { Resend } from 'resend'

const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

interface ConfirmationParams {
  clientEmail: string
  nailistEmail: string
  clientName: string
  nailistBusinessName: string
  serviceName: string
  startTime: Date
  price: number
  currency: string
}

export async function sendAppointmentConfirmation(p: ConfirmationParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  const resend = new Resend(apiKey)
  const symbol = p.currency === 'ILS' ? '₪' : '$'
  const dateStr = p.startTime.toLocaleString('he-IL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  await Promise.all([
    resend.emails.send({
      from: FROM,
      to: p.clientEmail,
      subject: `✅ תורך אצל ${p.nailistBusinessName} אושר`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2>התור שלך נקבע! 💅</h2>
        <p>שלום ${p.clientName},</p>
        <p>התור שלך אצל <strong>${p.nailistBusinessName}</strong> נקבע בהצלחה.</p>
        <ul>
          <li><strong>שירות:</strong> ${p.serviceName}</li>
          <li><strong>תאריך ושעה:</strong> ${dateStr}</li>
          <li><strong>מחיר:</strong> ${symbol}${p.price}</li>
        </ul>
        <p>מחכות לראותך! 🌸</p>
      </div>`,
    }),
    resend.emails.send({
      from: FROM,
      to: p.nailistEmail,
      subject: `📅 תור חדש — ${p.clientName}`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2>תור חדש נקבע! 📅</h2>
        <ul>
          <li><strong>לקוחה:</strong> ${p.clientName}</li>
          <li><strong>שירות:</strong> ${p.serviceName}</li>
          <li><strong>תאריך ושעה:</strong> ${dateStr}</li>
          <li><strong>מחיר:</strong> ${symbol}${p.price}</li>
        </ul>
      </div>`,
    }),
  ]).catch((err) => console.error('Email send error:', err))
}
