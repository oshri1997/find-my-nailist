import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
  if (!webhookSecret) return new NextResponse('Webhook is not configured', { status: 503 })

  try {
    const payload = await request.text()
    const event = new Resend(process.env.RESEND_API_KEY).webhooks.verify({
      payload,
      headers: {
        id: request.headers.get('svix-id') ?? '',
        timestamp: request.headers.get('svix-timestamp') ?? '',
        signature: request.headers.get('svix-signature') ?? '',
      },
      webhookSecret,
    })

    if (event.type !== 'email.bounced' && event.type !== 'email.suppressed') {
      return NextResponse.json({ ok: true })
    }

    const db = adminDb()
    const recipients = event.data.to.map((email) => email.trim().toLowerCase())
    for (const email of recipients) {
      const users = await db.collection(COLLECTIONS.USERS).where('email', '==', email).get()
      const batch = db.batch()
      for (const user of users.docs) {
        batch.set(user.ref, {
          emailDeliveryStatus: event.type === 'email.suppressed' ? 'SUPPRESSED' : 'BOUNCED',
          emailDeliveryBouncedAt: FieldValue.serverTimestamp(),
          emailDeliveryEventId: event.data.email_id,
        }, { merge: true })
      }
      if (!users.empty) await batch.commit()
    }
    return NextResponse.json({ ok: true })
  } catch {
    return new NextResponse('Invalid webhook', { status: 400 })
  }
}
