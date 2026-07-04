import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue } from 'firebase-admin/firestore'
import { sendCancellationEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return new NextResponse(errorPage('קישור שגוי', 'לא נמצא טוקן בקישור.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  try {
  const db = adminDb()

  const snap = await db
    .collection(COLLECTIONS.APPOINTMENTS)
    .where('declineToken', '==', token)
    .limit(1)
    .get()

  if (snap.empty) {
    return new NextResponse(errorPage('קישור לא תקין', 'הקישור לא תקין או שהתור כבר טופל.'), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const doc = snap.docs[0]
  const apt = doc.data()

  if (apt.status !== 'PENDING') {
    return new NextResponse(errorPage('התור כבר טופל', 'התור כבר אושר או בוטל בעבר.'), {
      status: 409,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const expires = apt.declineTokenExpiresAt?.toDate?.()
  if (expires && expires < new Date()) {
    return new NextResponse(errorPage('הקישור פג תוקף', 'קישור זה פג תוקף. ניתן לנהל תורים מהדשבורד.'), {
      status: 410,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // Transactional check-then-update — a plain read-then-write here would let
  // two concurrent GETs (double-click, or an email-security scanner
  // prefetching the link) both observe PENDING and both cancel + email.
  const alreadyHandled = await db.runTransaction(async (tx) => {
    const freshSnap = await tx.get(doc.ref)
    if (freshSnap.data()?.status !== 'PENDING') return true
    tx.update(doc.ref, {
      status: 'CANCELLED',
      declineToken: FieldValue.delete(),
      declineTokenExpiresAt: FieldValue.delete(),
      confirmToken: FieldValue.delete(),
      confirmTokenExpiresAt: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    return false
  })

  if (alreadyHandled) {
    return new NextResponse(errorPage('התור כבר טופל', 'התור כבר אושר או בוטל בעבר.'), {
      status: 409,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  void (async () => {
    try {
      const [clientProfileSnap, nailistProfileSnap] = await Promise.all([
        db.collection(COLLECTIONS.CLIENT_PROFILES).doc(apt.clientProfileId).get(),
        db.collection(COLLECTIONS.NAILIST_PROFILES).doc(apt.nailistProfileId).get(),
      ])
      const clientProfile = clientProfileSnap.data()
      const nailistProfile = nailistProfileSnap.data()
      const clientUserSnap = clientProfile?.userId
        ? await db.collection(COLLECTIONS.USERS).doc(clientProfile.userId).get()
        : null
      const clientEmail: string | undefined =
        (clientProfile?.email as string | undefined) ||
        (clientUserSnap?.data()?.email as string | undefined) ||
        undefined
      if (clientEmail) {
        await sendCancellationEmail({
          clientEmail,
          clientName: apt.clientDisplayName ?? clientEmail,
          nailistBusinessName: apt.nailistBusinessName ?? nailistProfile?.businessName ?? '',
          serviceName: apt.serviceName,
          startTime: apt.startTime?.toDate?.() ?? new Date(apt.startTime),
        })
        console.log('[decline] ✅ cancellation email sent to', clientEmail)
      }
    } catch (err) {
      console.error('[decline] ❌ cancellation email failed:', err)
    }
  })()

  return new NextResponse(successPage(apt.clientDisplayName ?? 'הלקוחה', apt.serviceName, apt.nailistBusinessName), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
  } catch (err) {
    console.error('[decline] ❌ Firestore error:', err)
    return new NextResponse(errorPage('שגיאת שרת', 'אירעה שגיאה. אנא נסי שוב מאוחר יותר.'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}

function successPage(clientName: string, serviceName: string, businessName: string) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>התור בוטל</title>
  <style>
    body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fdf4ff}
    .card{background:white;border-radius:20px;padding:40px;max-width:440px;width:90%;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,.1)}
    .icon{font-size:56px;margin-bottom:16px}
    h1{color:#374151;font-size:24px;margin:0 0 8px}
    p{color:#6b7280;line-height:1.6;margin:4px 0}
    .details{background:#f9fafb;border-radius:12px;padding:16px;margin:24px 0;text-align:right}
    .details p{margin:4px 0;font-size:14px}
    a{display:inline-block;margin-top:24px;background:linear-gradient(135deg,#ec4899,#a855f7);color:white;text-decoration:none;padding:14px 36px;border-radius:50px;font-weight:bold;font-size:16px}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">❌</div>
    <h1>התור בוטל</h1>
    <p>ביטלת את התור של <strong>${clientName}</strong></p>
    <div class="details">
      <p><strong>שירות:</strong> ${serviceName}</p>
      <p><strong>עסק:</strong> ${businessName}</p>
    </div>
    <p>הלקוחה תקבל הודעה על הביטול במייל.</p>
    <a href="/dashboard/nailist">לדשבורד</a>
  </div>
</body>
</html>`
}

function errorPage(title: string, message: string) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <style>
    body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fdf4ff}
    .card{background:white;border-radius:20px;padding:40px;max-width:440px;width:90%;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,.1)}
    .icon{font-size:56px;margin-bottom:16px}
    h1{color:#374151;font-size:24px;margin:0 0 8px}
    p{color:#6b7280;line-height:1.6}
    a{display:inline-block;margin-top:24px;background:linear-gradient(135deg,#ec4899,#a855f7);color:white;text-decoration:none;padding:14px 36px;border-radius:50px;font-weight:bold;font-size:16px}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚠️</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/dashboard/nailist">לדשבורד</a>
  </div>
</body>
</html>`
}
