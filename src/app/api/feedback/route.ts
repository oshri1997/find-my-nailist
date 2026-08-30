import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'

const MAX_SUBMISSIONS_PER_DAY = 5
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000
const FIRST_PARTY_HTTPS_ORIGINS = new Set([
  'https://nailistiot.fun',
  'https://dev.nailistiot.fun',
])

function isAllowedPageUrl(value: string) {
  if (value.startsWith('/')) {
    return !value.startsWith('//') && !value.includes('\\') && !/\s/.test(value)
  }

  try {
    const url = new URL(value)
    if (FIRST_PARTY_HTTPS_ORIGINS.has(url.origin)) return true

    // Keep the form usable during local development without accepting a
    // non-TLS external origin in production.
    return process.env.NODE_ENV !== 'production'
      && url.protocol === 'http:'
      && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  } catch {
    return false
  }
}

const feedbackSchema = z.object({
  type: z.enum(['BUG', 'IDEA', 'QUESTION', 'OTHER']),
  subject: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(4000),
  pageUrl: z.string().trim().min(1).max(2048).refine(isAllowedPageUrl),
  appVersion: z.string().trim().max(100).optional(),
  userAgent: z.string().trim().max(500).optional(),
})

/**
 * Creates an authenticated support request. The rate-limit ledger and the
 * feedback document are written in the same transaction, so parallel browser
 * tabs cannot exceed five reports in the same rolling 24-hour window.
 *
 * There is exactly one bounded ledger document per authenticated user. Every
 * accepted submission atomically prunes old timestamps and rewrites that one
 * document, so no TTL policy or cleanup job is required for correctness or
 * storage growth. `expiresAt` is only business-window metadata for operators.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) {
    return NextResponse.json({ error: 'יש להתחבר כדי לשלוח פנייה' }, { status: 401 })
  }

  let decoded: { uid: string; email?: string }
  try {
    decoded = await adminAuth().verifyIdToken(token)
  } catch {
    return NextResponse.json({ error: 'ההתחברות פגה, יש להתחבר מחדש' }, { status: 401 })
  }

  try {
    const data = feedbackSchema.parse(await request.json())
    const db = adminDb()
    const userSnap = await db.collection(COLLECTIONS.USERS).doc(decoded.uid).get()
    const user = userSnap.data() as { email?: string; displayName?: string; role?: string } | undefined
    const reporterEmail = decoded.email ?? user?.email ?? ''
    const reporterDisplayName = user?.displayName?.trim() || reporterEmail || 'משתמשת'
    const feedbackRef = db.collection(COLLECTIONS.FEEDBACK).doc()
    const rateLimitRef = db.collection(COLLECTIONS.FEEDBACK_RATE_LIMITS).doc(decoded.uid)
    const nowMs = Date.now()

    try {
      await db.runTransaction(async (tx) => {
        const rateLimitSnap = await tx.get(rateLimitRef)
        const rateLimitData = rateLimitSnap.data()
        const previousTimes: number[] = Array.isArray(rateLimitData?.submissionTimes)
          ? (rateLimitData.submissionTimes as unknown[]).filter((time): time is number => typeof time === 'number')
          : []
        // The timestamps are the source of truth. `expiresAt` deliberately
        // does not control enforcement: a stale metadata field must never let
        // a reporter bypass the rolling limit.
        const recentTimes = previousTimes.filter((time) => time > nowMs - RATE_LIMIT_WINDOW_MS)
        if (recentTimes.length >= MAX_SUBMISSIONS_PER_DAY) throw new Error('RATE_LIMITED')

        const now = FieldValue.serverTimestamp()
        tx.set(rateLimitRef, {
          submissionTimes: [...recentTimes, nowMs],
          expiresAt: new Date(nowMs + RATE_LIMIT_WINDOW_MS),
          updatedAt: now,
        })
        tx.set(feedbackRef, {
          ...data,
          reporterUid: decoded.uid,
          reporterEmail,
          reporterDisplayName,
          ...(user?.role ? { reporterRole: user.role } : {}),
          status: 'NEW',
          priority: 'NORMAL',
          createdAt: now,
          updatedAt: now,
        })
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'RATE_LIMITED') {
        return NextResponse.json(
          { error: 'אפשר לשלוח עד 5 פניות ב־24 שעות. נסי שוב מאוחר יותר.' },
          { status: 429 }
        )
      }
      throw error
    }

    return NextResponse.json({
      data: {
        id: feedbackRef.id,
        type: data.type,
        status: 'NEW',
        priority: 'NORMAL',
      },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'פרטי הפנייה אינם תקינים' }, { status: 400 })
    }
    console.error('POST /api/feedback error:', error)
    return NextResponse.json({ error: 'לא הצלחנו לשלוח את הפנייה. נסי שוב.' }, { status: 500 })
  }
}
