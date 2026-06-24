const FROM = 'נייליסטיות <noreply@nailistiot.fun>'

async function sendResend(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — skipping email')
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error ${res.status}: ${body}`)
  }

  const data = await res.json() as { id?: string }
  console.log('[email] sent to', to, '| id:', data.id)
}

function formatDate(d: Date) {
  return d.toLocaleString('he-IL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export interface AppointmentEmailParams {
  clientEmail: string
  nailistEmail: string
  clientName: string
  nailistBusinessName: string
  serviceName: string
  startTime: Date
  price: number
  currency: string
  confirmUrl: string
  declineUrl?: string
}

// Sent on booking creation: nailist gets action button, client gets "pending" notice
export async function sendAppointmentRequest(p: AppointmentEmailParams): Promise<void> {
  const symbol = p.currency === 'ILS' ? '₪' : '$'
  const dateStr = formatDate(p.startTime)

  const [clientResult, nailistResult] = await Promise.allSettled([
    sendResend(
      p.clientEmail,
      `⏳ בקשת תור אצל ${p.nailistBusinessName} נשלחה`,
      `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
        <h2 style="color:#d946a8">בקשת התור שלך נשלחה! 💅</h2>
        <p>שלום ${p.clientName},</p>
        <p>בקשת התור שלך אצל <strong>${p.nailistBusinessName}</strong> התקבלה ומחכה לאישור.</p>
        <div style="background:#fdf4ff;border-radius:12px;padding:16px;margin:20px 0">
          <p style="margin:4px 0"><strong>שירות:</strong> ${p.serviceName}</p>
          <p style="margin:4px 0"><strong>תאריך ושעה:</strong> ${dateStr}</p>
          <p style="margin:4px 0"><strong>מחיר:</strong> ${symbol}${p.price}</p>
        </div>
        <p>נשלח לך אישור ברגע שהנייליסטית תאשר את התור 🌸</p>
      </div>`
    ),

    sendResend(
      p.nailistEmail,
      `📅 תור חדש מ-${p.clientName} — ממתין לאישורך`,
      `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
        <h2 style="color:#d946a8">תור חדש מחכה לאישור! 📅</h2>
        <div style="background:#fdf4ff;border-radius:12px;padding:16px;margin:20px 0">
          <p style="margin:4px 0"><strong>לקוחה:</strong> ${p.clientName}</p>
          <p style="margin:4px 0"><strong>שירות:</strong> ${p.serviceName}</p>
          <p style="margin:4px 0"><strong>תאריך ושעה:</strong> ${dateStr}</p>
          <p style="margin:4px 0"><strong>מחיר:</strong> ${symbol}${p.price}</p>
        </div>
        <div style="text-align:center;margin:32px 0;display:flex;gap:16px;justify-content:center;flex-wrap:wrap">
          <a href="${p.confirmUrl}"
            style="background:linear-gradient(135deg,#ec4899,#a855f7);color:white;text-decoration:none;padding:18px 48px;border-radius:50px;font-size:20px;font-weight:bold;display:inline-block">
            ✅ מאשרת את התור
          </a>
          ${p.declineUrl ? `<a href="${p.declineUrl}"
            style="background:#f3f4f6;color:#6b7280;text-decoration:none;padding:18px 48px;border-radius:50px;font-size:20px;font-weight:bold;display:inline-block;border:2px solid #e5e7eb">
            ❌ לא מאשרת
          </a>` : ''}
        </div>
        <p style="color:#aaa;font-size:12px;text-align:center">הקישורים תקפים ל-7 ימים. לאחר לחיצה, הלקוחה תקבל עדכון במייל.</p>
      </div>`
    ),
  ])

  if (clientResult.status === 'rejected') {
    console.error('[email] client booking email error:', clientResult.reason)
  }
  if (nailistResult.status === 'rejected') {
    console.error('[email] nailist booking email error:', nailistResult.reason)
  }
  if (clientResult.status === 'rejected' && nailistResult.status === 'rejected') {
    throw nailistResult.reason
  }
}

// Sent to client when nailist cancels the appointment
export async function sendCancellationEmail(p: {
  clientEmail: string
  clientName: string
  nailistBusinessName: string
  serviceName: string
  startTime: Date
}): Promise<void> {
  const dateStr = formatDate(p.startTime)
  await sendResend(
    p.clientEmail,
    `❌ התור שלך אצל ${p.nailistBusinessName} בוטל`,
    `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
      <div style="background:linear-gradient(135deg,#ec4899,#a855f7);border-radius:16px 16px 0 0;padding:32px;text-align:center">
        <h2 style="color:white;margin:0;font-size:24px">התור בוטל 😔</h2>
      </div>
      <div style="padding:24px;background:#fafafa;border-radius:0 0 16px 16px">
        <p>שלום ${p.clientName},</p>
        <p>לצערנו, <strong>${p.nailistBusinessName}</strong> ביטלה את התור הקרוב שלך.</p>
        <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:20px 0">
          <p style="margin:4px 0"><strong>שירות:</strong> ${p.serviceName}</p>
          <p style="margin:4px 0"><strong>תאריך ושעה:</strong> ${dateStr}</p>
        </div>
        <p>ניתן לקבוע תור חדש דרך האתר בכל עת 💅</p>
      </div>
    </div>`
  )
}

// Sent to client after appointment is COMPLETED — asks for a review
export async function sendReviewRequestEmail(p: {
  clientEmail: string
  clientName: string
  nailistBusinessName: string
  serviceName: string
  startTime: Date
  appointmentId: string
  appUrl?: string
}): Promise<void> {
  const dateStr = formatDate(p.startTime)
  const url = (p.appUrl ?? 'https://nailistiot.fun') + `/my-appointments?review=${p.appointmentId}`
  await sendResend(
    p.clientEmail,
    `איך היה התור ב${p.nailistBusinessName}? ✨`,
    `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
      <div style="background:linear-gradient(135deg,#ec4899,#a855f7);border-radius:16px 16px 0 0;padding:32px;text-align:center">
        <h2 style="color:white;margin:0;font-size:24px">איך היה התור? 💅✨</h2>
      </div>
      <div style="padding:24px;background:#fafafa;border-radius:0 0 16px 16px">
        <p>שלום ${p.clientName},</p>
        <p>התור שלך אצל <strong>${p.nailistBusinessName}</strong> הסתיים. נשמח לשמוע מה חשבת!</p>
        <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:20px 0">
          <p style="margin:4px 0"><strong>שירות:</strong> ${p.serviceName}</p>
          <p style="margin:4px 0"><strong>תאריך:</strong> ${dateStr}</p>
        </div>
        <div style="text-align:center;margin:32px 0">
          <a href="${url}"
            style="background:linear-gradient(135deg,#ec4899,#a855f7);color:white;text-decoration:none;padding:16px 40px;border-radius:50px;font-size:18px;font-weight:bold;display:inline-block">
            ⭐ כתבי ביקורת
          </a>
        </div>
        <p style="color:#aaa;font-size:12px;text-align:center">הביקורת שלך עוזרת לנייליסטיות אחרות לצמוח 🌸</p>
      </div>
    </div>`
  )
}

// Sent to nailist when a client submits a review
export async function sendNailistReviewEmail(p: {
  nailistEmail: string
  nailistName: string
  clientName: string
  rating: number
  comment?: string
  serviceName: string
  appUrl?: string
}): Promise<void> {
  const stars = '⭐'.repeat(p.rating)
  const url = (p.appUrl ?? 'https://nailistiot.fun') + '/dashboard/nailist/reviews'
  const commentHtml = p.comment
    ? `<div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:16px 0;font-style:italic">"${p.comment}"</div>`
    : ''
  await sendResend(
    p.nailistEmail,
    `ביקורת חדשה מ${p.clientName} ⭐`,
    `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
      <div style="background:linear-gradient(135deg,#ec4899,#a855f7);border-radius:16px 16px 0 0;padding:32px;text-align:center">
        <h2 style="color:white;margin:0;font-size:24px">ביקורת חדשה! ${stars}</h2>
      </div>
      <div style="padding:24px;background:#fafafa;border-radius:0 0 16px 16px">
        <p>שלום ${p.nailistName},</p>
        <p><strong>${p.clientName}</strong> השאירה ביקורת על <strong>${p.serviceName}</strong>:</p>
        <div style="text-align:center;font-size:28px;margin:16px 0">${stars}</div>
        ${commentHtml}
        <div style="text-align:center;margin:32px 0">
          <a href="${url}"
            style="background:linear-gradient(135deg,#ec4899,#a855f7);color:white;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:16px;font-weight:bold;display:inline-block">
            צפי בביקורת
          </a>
        </div>
      </div>
    </div>`
  )
}

// Sent to client after nailist clicks confirm
export async function sendClientConfirmedEmail(p: {
  clientEmail: string
  clientName: string
  nailistBusinessName: string
  serviceName: string
  startTime: Date
  price: number
  currency: string
}): Promise<void> {
  const symbol = p.currency === 'ILS' ? '₪' : '$'
  const dateStr = formatDate(p.startTime)

  await sendResend(
    p.clientEmail,
    `✅ התור שלך אצל ${p.nailistBusinessName} אושר!`,
    `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2 style="color:#22c55e">התור שלך אושר! 🎉💅</h2>
      <p>שלום ${p.clientName},</p>
      <p><strong>${p.nailistBusinessName}</strong> אישרה את התור שלך!</p>
      <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:16px;margin:20px 0">
        <p style="margin:4px 0"><strong>שירות:</strong> ${p.serviceName}</p>
        <p style="margin:4px 0"><strong>תאריך ושעה:</strong> ${dateStr}</p>
        <p style="margin:4px 0"><strong>מחיר:</strong> ${symbol}${p.price}</p>
      </div>
      <p>מחכות לראותך! 🌸</p>
    </div>`
  )
}
