const FROM = 'נייליסטיות <noreply@nailistiot.fun>'
const REPLY_TO = 'noreply@nailistiot.fun'
const APP_URL = 'https://nailistiot.fun'

async function sendResend(to: string, subject: string, html: string, text: string): Promise<void> {
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
      text,
      reply_to: REPLY_TO,
      headers: {
        'List-Unsubscribe': `<mailto:noreply@nailistiot.fun?subject=unsubscribe>, <${APP_URL}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
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
      `בקשת תור אצל ${p.nailistBusinessName} נשלחה`,
      `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
        <h2 style="color:#d946a8">בקשת התור שלך נשלחה!</h2>
        <p>שלום ${p.clientName},</p>
        <p>בקשת התור שלך אצל <strong>${p.nailistBusinessName}</strong> התקבלה ומחכה לאישור.</p>
        <div style="background:#fdf4ff;border-radius:12px;padding:16px;margin:20px 0">
          <p style="margin:4px 0"><strong>שירות:</strong> ${p.serviceName}</p>
          <p style="margin:4px 0"><strong>תאריך ושעה:</strong> ${dateStr}</p>
          <p style="margin:4px 0"><strong>מחיר:</strong> ${symbol}${p.price}</p>
        </div>
        <p>נשלח לך אישור ברגע שהנייליסטית תאשר את התור.</p>
      </div>`,
      `שלום ${p.clientName},\n\nבקשת התור שלך אצל ${p.nailistBusinessName} התקבלה ומחכה לאישור.\n\nשירות: ${p.serviceName}\nתאריך ושעה: ${dateStr}\nמחיר: ${symbol}${p.price}\n\nנשלח לך אישור ברגע שהנייליסטית תאשר את התור.\n\nצוות נייליסטיות`
    ),

    sendResend(
      p.nailistEmail,
      `תור חדש מ-${p.clientName} — ממתין לאישורך`,
      `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
        <h2 style="color:#d946a8">תור חדש מחכה לאישור</h2>
        <div style="background:#fdf4ff;border-radius:12px;padding:16px;margin:20px 0">
          <p style="margin:4px 0"><strong>לקוחה:</strong> ${p.clientName}</p>
          <p style="margin:4px 0"><strong>שירות:</strong> ${p.serviceName}</p>
          <p style="margin:4px 0"><strong>תאריך ושעה:</strong> ${dateStr}</p>
          <p style="margin:4px 0"><strong>מחיר:</strong> ${symbol}${p.price}</p>
        </div>
        <div style="text-align:center;margin:32px 0;display:flex;gap:16px;justify-content:center;flex-wrap:wrap">
          <a href="${p.confirmUrl}"
            style="background:linear-gradient(135deg,#ec4899,#a855f7);color:white;text-decoration:none;padding:18px 48px;border-radius:50px;font-size:20px;font-weight:bold;display:inline-block">
            אישור התור
          </a>
          ${p.declineUrl ? `<a href="${p.declineUrl}"
            style="background:#f3f4f6;color:#6b7280;text-decoration:none;padding:18px 48px;border-radius:50px;font-size:20px;font-weight:bold;display:inline-block;border:2px solid #e5e7eb">
            דחיית התור
          </a>` : ''}
        </div>
        <p style="color:#aaa;font-size:12px;text-align:center">הקישורים תקפים ל-7 ימים. לאחר לחיצה, הלקוחה תקבל עדכון במייל.</p>
      </div>`,
      `תור חדש מ-${p.clientName} ממתין לאישורך.\n\nשירות: ${p.serviceName}\nתאריך ושעה: ${dateStr}\nמחיר: ${symbol}${p.price}\n\nלאישור: ${p.confirmUrl}${p.declineUrl ? `\nלדחייה: ${p.declineUrl}` : ''}\n\nצוות נייליסטיות`
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
    `התור שלך אצל ${p.nailistBusinessName} בוטל`,
    `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
      <div style="background:linear-gradient(135deg,#ec4899,#a855f7);border-radius:16px 16px 0 0;padding:32px;text-align:center">
        <h2 style="color:white;margin:0;font-size:24px">התור בוטל</h2>
      </div>
      <div style="padding:24px;background:#fafafa;border-radius:0 0 16px 16px">
        <p>שלום ${p.clientName},</p>
        <p>לצערנו, <strong>${p.nailistBusinessName}</strong> ביטלה את התור הקרוב שלך.</p>
        <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:20px 0">
          <p style="margin:4px 0"><strong>שירות:</strong> ${p.serviceName}</p>
          <p style="margin:4px 0"><strong>תאריך ושעה:</strong> ${dateStr}</p>
        </div>
        <p>ניתן לקבוע תור חדש דרך האתר בכל עת.</p>
      </div>
    </div>`,
    `שלום ${p.clientName},\n\nלצערנו, ${p.nailistBusinessName} ביטלה את התור הקרוב שלך.\n\nשירות: ${p.serviceName}\nתאריך ושעה: ${dateStr}\n\nניתן לקבוע תור חדש בכל עת: ${APP_URL}\n\nצוות נייליסטיות`
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
    `איך היה התור אצל ${p.nailistBusinessName}?`,
    `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
      <div style="background:linear-gradient(135deg,#ec4899,#a855f7);border-radius:16px 16px 0 0;padding:32px;text-align:center">
        <h2 style="color:white;margin:0;font-size:24px">איך היה התור?</h2>
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
            כתבי ביקורת
          </a>
        </div>
        <p style="color:#aaa;font-size:12px;text-align:center">הביקורת שלך עוזרת לנייליסטיות אחרות לצמוח.</p>
      </div>
    </div>`,
    `שלום ${p.clientName},\n\nהתור שלך אצל ${p.nailistBusinessName} הסתיים. נשמח לשמוע מה חשבת!\n\nשירות: ${p.serviceName}\nתאריך: ${dateStr}\n\nלכתיבת ביקורת: ${url}\n\nצוות נייליסטיות`
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
    `ביקורת חדשה מ-${p.clientName} — ${p.rating}/5 כוכבים`,
    `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
      <div style="background:linear-gradient(135deg,#ec4899,#a855f7);border-radius:16px 16px 0 0;padding:32px;text-align:center">
        <h2 style="color:white;margin:0;font-size:24px">ביקורת חדשה — ${stars}</h2>
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
    </div>`,
    `שלום ${p.nailistName},\n\n${p.clientName} השאירה ביקורת על ${p.serviceName}:\nדירוג: ${p.rating}/5${p.comment ? `\n"${p.comment}"` : ''}\n\nלצפייה בביקורת: ${url}\n\nצוות נייליסטיות`
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
    `התור שלך אצל ${p.nailistBusinessName} אושר`,
    `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2 style="color:#22c55e">התור שלך אושר!</h2>
      <p>שלום ${p.clientName},</p>
      <p><strong>${p.nailistBusinessName}</strong> אישרה את התור שלך!</p>
      <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:16px;margin:20px 0">
        <p style="margin:4px 0"><strong>שירות:</strong> ${p.serviceName}</p>
        <p style="margin:4px 0"><strong>תאריך ושעה:</strong> ${dateStr}</p>
        <p style="margin:4px 0"><strong>מחיר:</strong> ${symbol}${p.price}</p>
      </div>
      <p>מחכות לראותך!</p>
    </div>`,
    `שלום ${p.clientName},\n\n${p.nailistBusinessName} אישרה את התור שלך!\n\nשירות: ${p.serviceName}\nתאריך ושעה: ${dateStr}\nמחיר: ${symbol}${p.price}\n\nמחכות לראותך!\nצוות נייליסטיות`
  )
}

export async function sendPasswordResetEmail(p: {
  email: string
  resetLink: string
}): Promise<void> {
  await sendResend(
    p.email,
    'איפוס סיסמה — נייליסטיות',
    `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
      <div style="background:linear-gradient(135deg,#ec4899,#a855f7);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center">
        <h1 style="color:white;margin:0;font-size:22px;font-weight:900">נייליסטיות</h1>
      </div>
      <div style="background:#fff;border:1px solid #f3e8ff;border-top:none;border-radius:0 0 16px 16px;padding:32px">
        <h2 style="font-size:20px;font-weight:900;margin:0 0 8px">איפוס סיסמה</h2>
        <p style="color:#666;margin:0 0 24px">קיבלנו בקשה לאיפוס הסיסמה לחשבון שלך.</p>
        <p style="color:#666;margin:0 0 24px">לחצי על הכפתור כדי לאפס את הסיסמה — הקישור בתוקף ל-24 שעות.</p>
        <div style="text-align:center;margin:28px 0">
          <a href="${p.resetLink}" style="background:linear-gradient(135deg,#ec4899,#a855f7);color:white;text-decoration:none;border-radius:12px;padding:14px 32px;font-weight:900;font-size:16px;display:inline-block">
            איפוס סיסמה
          </a>
        </div>
        <p style="color:#999;font-size:12px;margin:24px 0 0">אם לא ביקשת לאפס סיסמה, אפשר להתעלם ממייל זה.</p>
        <p style="color:#ccc;font-size:11px;margin:8px 0 0">הקישור: <a href="${p.resetLink}" style="color:#a855f7;word-break:break-all">${p.resetLink}</a></p>
      </div>
    </div>`,
    `איפוס סיסמה — נייליסטיות\n\nלחצי על הקישור הבא לאיפוס הסיסמה (בתוקף ל-24 שעות):\n${p.resetLink}\n\nאם לא ביקשת לאפס סיסמה, אפשר להתעלם ממייל זה.\n\nצוות נייליסטיות`
  )
}
