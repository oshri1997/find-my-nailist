import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ role: null }, { status: 401 })

    const decoded = await adminAuth().verifyIdToken(token)
    const db = adminDb()
    const snap = await db.collection(COLLECTIONS.USERS).doc(decoded.uid).get()

    if (!snap.exists) return NextResponse.json({ role: null })
    return NextResponse.json({ role: snap.data()?.role ?? 'CLIENT' })
  } catch {
    return NextResponse.json({ role: null }, { status: 401 })
  }
}
