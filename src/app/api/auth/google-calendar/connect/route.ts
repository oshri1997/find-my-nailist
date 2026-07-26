import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { getGoogleCalendarAuthUrl, isGoogleCalendarConfigured } from '@/lib/google-calendar'
import { sanitizeRedirect } from '@/lib/sanitize-redirect'

const STATE_COOKIE = 'gcal-oauth-state'

// Kicked off right after sign-in (Google or otherwise) and from the Settings
// page's "connect" button alike — a GET redirect, not a fetch, since the
// whole point is to leave the app and land on Google's consent screen.
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
  const next = sanitizeRedirect(request.nextUrl.searchParams.get('next')) || '/'

  const token = request.cookies.get('auth-token')?.value
  if (!token) return NextResponse.redirect(new URL('/login', appUrl))

  try {
    await adminAuth().verifyIdToken(token)
  } catch {
    return NextResponse.redirect(new URL('/login', appUrl))
  }

  // Not configured on this deployment (e.g. local dev without OAuth
  // credentials) — skip straight to `next` rather than breaking sign-in.
  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(new URL(next, appUrl))
  }

  const nonce = randomUUID()
  const response = NextResponse.redirect(getGoogleCalendarAuthUrl(nonce))
  response.cookies.set(STATE_COOKIE, `${nonce}|${next}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10, // 10 minutes — plenty for a consent screen, short-lived by design
  })
  return response
}
