import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request)) return adminUnauthorized()

  const db = adminDb()
  const snap = await db.collection(COLLECTIONS.AUDIT_LOGS).orderBy('createdAt', 'desc').limit(200).get()

  const entries = snap.docs.map(d => {
    const data = d.data()
    return {
      id: d.id,
      actorUid: data.actorUid ?? '',
      actorEmail: data.actorEmail ?? '',
      action: data.action ?? '',
      targetType: data.targetType ?? '',
      targetId: data.targetId ?? '',
      metadata: data.metadata ?? {},
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    }
  })

  return NextResponse.json({ data: entries })
}
