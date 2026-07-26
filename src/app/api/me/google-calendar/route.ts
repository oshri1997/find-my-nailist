import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'

// Only a derived boolean ever leaves this route — never the token object
// itself, which contains a live OAuth refresh token.
export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return NextResponse.json({ connected: false }, { status: 401 })

  let uid: string
  try {
    uid = (await adminAuth().verifyIdToken(token)).uid
  } catch {
    return NextResponse.json({ connected: false }, { status: 401 })
  }

  const snap = await adminDb().collection(COLLECTIONS.USERS).doc(uid).get()
  return NextResponse.json({ connected: !!snap.data()?.googleCalendarTokens })
}
