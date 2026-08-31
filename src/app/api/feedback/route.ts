import { NextRequest, NextResponse } from 'next/server'
import { FieldPath, FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'

const MAX_SUBMISSIONS_PER_DAY = 5
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000
const FIRST_PARTY_HTTPS_ORIGINS = new Set([
  'https://nailistiot.fun',
  'https://dev.nailistiot.fun',
])

// Firestore has no safe arbitrary substring search. Store only bounded
// prefixes of server-owned report snapshots so the manager can use a single
// indexed `array-contains` query (for example, "תור" or "oshri"). We do not
// index the full description: it is usually sensitive and would inflate every
// report document/index entry without making triage meaningfully better.
const MAX_SEARCH_TERMS = 120
const MAX_SEARCH_TOKEN_LENGTH = 40
const FEEDBACK_PAGE_SIZE = 20
const FEEDBACK_SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024
const FEEDBACK_SCREENSHOT_CONTENT_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export function buildFeedbackSearchTerms(values: string[]): string[] {
  const terms = new Set<string>()

  for (const value of values) {
    const normalized = value
      .normalize('NFKD')
      .toLocaleLowerCase('he-IL')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()

    for (const rawToken of normalized.split(/\s+/)) {
      if (!rawToken) continue
      const token = rawToken.slice(0, MAX_SEARCH_TOKEN_LENGTH)
      for (let length = 1; length <= token.length; length++) {
        terms.add(token.slice(0, length))
        if (terms.size >= MAX_SEARCH_TERMS) return [...terms]
      }
    }
  }

  return [...terms]
}

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
  screenshotStorageKey: z.string().trim().max(300).optional(),
})

function isOwnedScreenshotKey(key: string, uid: string) {
  // UUID-like generated filename prevents a caller from attaching another
  // object in their folder (or a crafted nested path) to an unrelated report.
  return new RegExp(`^feedback/${uid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/[a-zA-Z0-9-]{16,}\.(png|jpe?g|webp)$`).test(key)
}

async function validateOwnedScreenshot(storageKey: string | undefined, uid: string): Promise<string | undefined> {
  if (!storageKey) return undefined
  if (!isOwnedScreenshotKey(storageKey, uid)) throw new Error('INVALID_SCREENSHOT')
  try {
    const [metadata] = await adminStorage().bucket().file(storageKey).getMetadata()
    const size = Number(metadata.size)
    if (!Number.isFinite(size) || size < 1 || size > FEEDBACK_SCREENSHOT_MAX_BYTES || !FEEDBACK_SCREENSHOT_CONTENT_TYPES.has(metadata.contentType ?? '')) {
      throw new Error('INVALID_SCREENSHOT')
    }
    return storageKey
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_SCREENSHOT') throw error
    // Private attachments must fail closed: a transient Storage lookup cannot
    // be converted into a permanent, unverified report reference.
    throw new Error('SCREENSHOT_UNAVAILABLE')
  }
}

function timestamp(value: unknown) {
  return value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function'
    ? value.toDate().toISOString()
    : null
}

function serializeOwnFeedback(id: string, data: Record<string, unknown>) {
  // Keep admin-only fields, browser fingerprints, email and storage keys out
  // of the reporter endpoint. A report owner sees only their own text/status.
  return {
    id,
    type: data.type,
    subject: typeof data.subject === 'string' ? data.subject : '',
    description: typeof data.description === 'string' ? data.description : '',
    status: data.status,
    pageUrl: typeof data.pageUrl === 'string' ? data.pageUrl : '',
    createdAt: timestamp(data.createdAt),
    updatedAt: timestamp(data.updatedAt),
  }
}

async function authenticatedUid(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  try { return await adminAuth().verifyIdToken(token) } catch { return null }
}

export async function GET(request: NextRequest) {
  const decoded = await authenticatedUid(request)
  if (!decoded) return NextResponse.json({ error: 'יש להתחבר כדי לצפות בפניות' }, { status: 401 })

  const cursor = request.nextUrl.searchParams.get('cursor')
  if (cursor && !/^[A-Za-z0-9_-]{1,200}$/.test(cursor)) return NextResponse.json({ error: 'סמן העמוד אינו תקין' }, { status: 400 })
  try {
    let query = adminDb().collection(COLLECTIONS.FEEDBACK)
      .where('reporterUid', '==', decoded.uid)
      .orderBy('createdAt', 'desc')
      .orderBy(FieldPath.documentId(), 'desc')
    if (cursor) {
      const cursorSnap = await adminDb().collection(COLLECTIONS.FEEDBACK).doc(cursor).get()
      if (!cursorSnap.exists || cursorSnap.data()?.reporterUid !== decoded.uid) return NextResponse.json({ error: 'סמן העמוד אינו תקין' }, { status: 400 })
      query = query.startAfter(cursorSnap)
    }
    const snap = await query.limit(FEEDBACK_PAGE_SIZE + 1).get()
    const docs = snap.docs.slice(0, FEEDBACK_PAGE_SIZE)
    return NextResponse.json({
      data: docs.map((doc) => serializeOwnFeedback(doc.id, doc.data() as Record<string, unknown>)),
      nextCursor: snap.docs.length > FEEDBACK_PAGE_SIZE ? docs.at(-1)?.id ?? null : null,
    })
  } catch (error) {
    console.error('GET /api/feedback error:', error)
    return NextResponse.json({ error: 'לא הצלחנו לטעון את הפניות.' }, { status: 500 })
  }
}

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
    const screenshotStorageKey = await validateOwnedScreenshot(data.screenshotStorageKey, decoded.uid)
    const db = adminDb()
    const userSnap = await db.collection(COLLECTIONS.USERS).doc(decoded.uid).get()
    const user = userSnap.data() as { email?: string; displayName?: string; role?: string } | undefined
    const reporterEmail = decoded.email ?? user?.email ?? ''
    const reporterDisplayName = user?.displayName?.trim() || reporterEmail || 'משתמשת'
    const searchTerms = buildFeedbackSearchTerms([
      data.subject,
      reporterDisplayName,
      reporterEmail,
    ])
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
          ...(screenshotStorageKey ? { screenshotStorageKey } : {}),
          searchTerms,
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
      if (error instanceof Error && error.message === 'INVALID_SCREENSHOT') {
        return NextResponse.json({ error: 'הצילום שצורף אינו תקין. נסי לבחור תמונה חדשה.' }, { status: 400 })
      }
      if (error instanceof Error && error.message === 'SCREENSHOT_UNAVAILABLE') {
        return NextResponse.json({ error: 'לא הצלחנו לאמת את הצילום. נסי שוב או שלחי את הפנייה בלי צילום.' }, { status: 503 })
      }
      throw error
    }

    return NextResponse.json({
      data: {
        id: feedbackRef.id,
        type: data.type,
        status: 'NEW',
      },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_SCREENSHOT') {
      return NextResponse.json({ error: 'הצילום שצורף אינו תקין. נסי לבחור תמונה חדשה.' }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'SCREENSHOT_UNAVAILABLE') {
      return NextResponse.json({ error: 'לא הצלחנו לאמת את הצילום. נסי שוב או שלחי את הפנייה בלי צילום.' }, { status: 503 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'פרטי הפנייה אינם תקינים' }, { status: 400 })
    }
    console.error('POST /api/feedback error:', error)
    return NextResponse.json({ error: 'לא הצלחנו לשלוח את הפנייה. נסי שוב.' }, { status: 500 })
  }
}
