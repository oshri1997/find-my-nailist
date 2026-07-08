import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'

const COOKIE_NAME = 'auth-token'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 14, // 14 days
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    // Verify the token is valid before setting the cookie
    const decoded = await adminAuth().verifyIdToken(token)

    // Suspended accounts keep a cryptographically valid token until it
    // naturally expires (Firebase doesn't revoke on its own), so this is
    // the actual enforcement point — every sign-in and token refresh comes
    // through here (see auth-provider.tsx's onIdTokenChanged).
    const userSnap = await adminDb().collection(COLLECTIONS.USERS).doc(decoded.uid).get()
    if (userSnap.data()?.suspended === true) {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS)
    return response
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' })
  return response
}
