import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'

const schema = z.object({
  source: z.enum(['google', 'direct', 'other']),
})

const RATE_COOKIE = 'visit-rate'
const RATE_WINDOW_SECONDS = 10 * 60
const MAX_VISITS_PER_WINDOW = 3
const MAX_TRANSIENT_RATE_LIMITS = 10_000
const PRODUCTION_ORIGIN = 'https://nailistiot.fun'

type RateLimit = { issuedAt: number; count: number }

// Process-local only: HMAC keys prevent raw client network identities from
// entering memory as map keys, logs, cookies, or Firestore. Expired records
// are pruned on requests and the hard cap prevents unbounded memory use.
const transientNetworkLimits = new Map<string, RateLimit>()

function isAllowedOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  return process.env.RAILWAY_ENVIRONMENT_NAME === 'production' && origin === PRODUCTION_ORIGIN
}

function cookieSecret() {
  return process.env.VISIT_ANALYTICS_COOKIE_SECRET ?? ''
}

function sign(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

function networkRateKey(request: NextRequest, secret: string) {
  // Railway's proxy supplies this header. A missing header gets one shared,
  // opaque fallback bucket rather than bypassing the server-side limiter.
  const forwarded = request.headers.get('x-forwarded-for')
  const networkIdentity = forwarded?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'network-identity-unavailable'
  return sign(`network:${networkIdentity}`, secret)
}

function consumeTransientNetworkLimit(request: NextRequest, secret: string, now: number) {
  const cutoff = now - RATE_WINDOW_SECONDS * 1000
  for (const [key, limit] of transientNetworkLimits) {
    if (limit.issuedAt <= cutoff) transientNetworkLimits.delete(key)
  }

  const key = networkRateKey(request, secret)
  const previous = transientNetworkLimits.get(key)
  if (previous && previous.count >= MAX_VISITS_PER_WINDOW) return false
  if (!previous && transientNetworkLimits.size >= MAX_TRANSIENT_RATE_LIMITS) return false

  transientNetworkLimits.set(key, {
    issuedAt: previous?.issuedAt ?? now,
    count: (previous?.count ?? 0) + 1,
  })
  return true
}

function readRateLimit(raw: string | undefined, secret: string, now: number): RateLimit | null {
  if (!raw) return null
  const [issuedAtText, countText, signature] = raw.split('.')
  if (!issuedAtText || !countText || !signature) return null
  const value = `${issuedAtText}.${countText}`
  const expected = sign(value, secret)
  const supplied = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (supplied.length !== expectedBuffer.length || !timingSafeEqual(supplied, expectedBuffer)) return null

  const issuedAt = Number(issuedAtText)
  const count = Number(countText)
  if (!Number.isInteger(issuedAt) || !Number.isInteger(count) || count < 0 || issuedAt > now || now - issuedAt > RATE_WINDOW_SECONDS * 1000) return null
  return { issuedAt, count }
}

function writeRateCookie(response: NextResponse, rateLimit: RateLimit, secret: string) {
  const value = `${rateLimit.issuedAt}.${rateLimit.count}`
  response.cookies.set(RATE_COOKIE, `${value}.${sign(value, secret)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/analytics/visit',
    maxAge: RATE_WINDOW_SECONDS,
  })
}

// Anonymous, session-scoped acquisition analytics. The client sends only a
// coarse referrer category; no user ID, URL, IP address, or identifier is kept.
export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })

  const secret = cookieSecret()
  if (!secret) return NextResponse.json({ error: 'Analytics unavailable' }, { status: 503 })

  const now = Date.now()
  if (!consumeTransientNetworkLimit(request, secret, now)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const rawRateCookie = request.cookies.get(RATE_COOKIE)?.value
  const previous = readRateLimit(rawRateCookie, secret, now)
  if (rawRateCookie && !previous) {
    return NextResponse.json({ error: 'Invalid rate limit' }, { status: 429 })
  }
  const rateLimit = previous ?? { issuedAt: now, count: 0 }
  if (rateLimit.count >= MAX_VISITS_PER_WINDOW) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = schema.safeParse(await request.json())
    if (!body.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const { FieldValue } = await import('firebase-admin/firestore')
    await adminDb().collection(COLLECTIONS.VISIT_EVENTS).add({
      source: body.data.source,
      createdAt: FieldValue.serverTimestamp(),
    })

    const response = NextResponse.json({ message: 'ok' }, { status: 201 })
    writeRateCookie(response, { ...rateLimit, count: rateLimit.count + 1 }, secret)
    return response
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to log visit' }, { status: 500 })
  }
}
