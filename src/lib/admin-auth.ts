import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'

export async function verifyAdmin(request: NextRequest): Promise<{ uid: string; email: string } | null> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  try {
    const decoded = await adminAuth().verifyIdToken(token)
    const snap = await adminDb().collection(COLLECTIONS.USERS).doc(decoded.uid).get()
    if (snap.data()?.role !== 'ADMIN') return null
    return { uid: decoded.uid, email: decoded.email ?? '' }
  } catch {
    return null
  }
}

export function adminUnauthorized() {
  return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
}
