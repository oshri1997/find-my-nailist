import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const decoded = await adminAuth().verifyIdToken(token)
    const user = await adminDb().collection(COLLECTIONS.USERS).doc(decoded.uid).get()
    return NextResponse.json({ deliveryStatus: user.data()?.emailDeliveryStatus ?? null })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
