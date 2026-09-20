import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'
import { announcementBodySchema } from '@/lib/announcement-body'
import { serializeAnnouncement } from '@/lib/announcements'
import { writeAuditLog } from '@/lib/audit-log'

const createSchema = z.object({
  title: z.string().trim().min(1, 'כותרת נדרשת').max(200),
  body: announcementBodySchema,
  audience: z.enum(['ALL', 'NAILIST', 'CLIENT']),
  priority: z.enum(['MAJOR', 'MINOR']),
}).strict()

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return adminUnauthorized()

  try {
    const snap = await adminDb()
      .collection(COLLECTIONS.ANNOUNCEMENTS)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()

    return NextResponse.json({ data: snap.docs.map((doc) => serializeAnnouncement(doc.id, doc.data())) })
  } catch (error) {
    console.error('GET /api/admin/announcements error:', error)
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 })
  }
}

// Publishes immediately — there is no persisted DRAFT state (see the
// AnnouncementDoc comment in src/types/index.ts). Once written here the
// content is frozen; a mistake is fixed via PATCH .../[id] (retract) plus a
// fresh POST, never by editing this document.
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return adminUnauthorized()

  let body: z.infer<typeof createSchema>
  try {
    body = createSchema.parse(await request.json())
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'פרטי ההכרזה אינם תקינים' }, { status: 400 })
    }
    return NextResponse.json({ error: 'גוף הבקשה אינו תקין' }, { status: 400 })
  }

  try {
    const { FieldValue } = await import('firebase-admin/firestore')
    const db = adminDb()
    const ref = db.collection(COLLECTIONS.ANNOUNCEMENTS).doc()
    const now = FieldValue.serverTimestamp()

    await ref.set({
      title: body.title,
      body: body.body,
      audience: body.audience,
      priority: body.priority,
      status: 'PUBLISHED',
      publishedAt: now,
      createdBy: admin.uid,
      createdAt: now,
      updatedAt: now,
    })

    await writeAuditLog({
      actorUid: admin.uid,
      actorEmail: admin.email,
      action: 'ANNOUNCEMENT_PUBLISH',
      targetType: 'announcement',
      targetId: ref.id,
      metadata: { title: body.title, audience: body.audience, priority: body.priority },
    })

    const snap = await ref.get()
    return NextResponse.json({ data: serializeAnnouncement(ref.id, snap.data()!) }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/announcements error:', error)
    return NextResponse.json({ error: 'הפרסום נכשל' }, { status: 500 })
  }
}
