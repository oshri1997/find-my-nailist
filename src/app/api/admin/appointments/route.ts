import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request)) return adminUnauthorized()

  const db = adminDb()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const base = db.collection(COLLECTIONS.APPOINTMENTS)
  const query = status
    ? base.where('status', '==', status).orderBy('startTime', 'desc').limit(100)
    : base.orderBy('startTime', 'desc').limit(100)

  const snap = await query.get()

  const appointments = snap.docs
    .map(d => {
      const data = d.data()
      return {
        id: d.id,
        nailistProfileId: data.nailistProfileId ?? '',
        clientProfileId: data.clientProfileId ?? '',
        nailistName: data.nailistBusinessName ?? '',
        clientName: data.clientName ?? '',
        serviceName: data.serviceName ?? '',
        status: data.status ?? '',
        startTime: data.startTime?.toDate?.()?.toISOString() ?? null,
        price: data.price ?? 0,
        currency: data.currency ?? 'ILS',
      }
    })

  return NextResponse.json({ data: appointments })
}
