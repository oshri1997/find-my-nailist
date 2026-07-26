import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue } from 'firebase-admin/firestore'
import { exchangeGoogleCalendarCode } from '@/lib/google-calendar'

const STATE_COOKIE = 'gcal-oauth-state'

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')

  const stateCookie = request.cookies.get(STATE_COOKIE)?.value ?? ''
  const [nonce, storedNext] = stateCookie.split('|')
  const next = storedNext || '/'

  const response = (destination: string) => {
    const res = NextResponse.redirect(new URL(destination, appUrl))
    res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' })
    return res
  }

  // CSRF check — a mismatched/missing nonce means this callback wasn't
  // triggered by a connect request we issued (or the cookie expired).
  if (!nonce || !state || state !== nonce) {
    return response(next)
  }

  // The user declined consent, or Google sent back neither a code nor an
  // error we can act on — either way, calendar sync is optional, so fall
  // through to `next` rather than surfacing a failure.
  if (error || !code) {
    return response(next)
  }

  const token = request.cookies.get('auth-token')?.value
  if (!token) return response(next)

  let uid: string
  try {
    uid = (await adminAuth().verifyIdToken(token)).uid
  } catch {
    return response(next)
  }

  try {
    const tokens = await exchangeGoogleCalendarCode(code)
    await adminDb().collection(COLLECTIONS.USERS).doc(uid).set(
      { googleCalendarTokens: tokens, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    )
  } catch (err) {
    console.error('[google-calendar] token exchange/store failed', err)
    return response(next)
  }

  const destination = new URL(next, appUrl)
  destination.searchParams.set('gcal', 'connected')
  const res = NextResponse.redirect(destination)
  res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
