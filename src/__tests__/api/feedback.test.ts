/** @jest-environment node */
import { NextRequest } from 'next/server'

type StoredDoc = Record<string, unknown>

const docs: Record<string, Record<string, StoredDoc>> = {}
let nextFeedbackId = 1
let transactionRetryCount = 0
let transactionCallbackCalls = 0
const verifyIdTokenMock = jest.fn()
const getMetadataMock = jest.fn()

// Firestore references in this focused mock carry their collection as a hidden
// implementation detail; production code only relies on id/get/set semantics.
function documentRef(collection: string, id: string) {
  return {
    id,
    collection,
    get: jest.fn().mockImplementation(async () => {
      const data = docs[collection]?.[id]
      return { exists: Boolean(data), data: () => data }
    }),
  }
}

const mockDb = {
  collection: jest.fn((collection: string) => {
    const filters: Array<[string, unknown]> = []
    const query: any = {
      where: jest.fn((field: string, _operator: string, value: unknown) => { filters.push([field, value]); return query }),
      orderBy: jest.fn().mockReturnThis(),
      startAfter: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn(async () => ({ docs: Object.entries(docs[collection] ?? {})
        .filter(([, data]) => filters.every(([field, value]) => data[field] === value))
        .map(([id, data]) => ({ id, data: () => data })) })),
    }
    return {
    doc: jest.fn((requestedId?: string) => documentRef(
      collection,
      requestedId ?? (collection === 'feedback' ? `feedback-${nextFeedbackId++}` : 'generated-id')
    )),
    where: query.where,
    orderBy: query.orderBy,
  }}),
  runTransaction: jest.fn().mockImplementation(async (callback: (tx: {
    get: (ref: ReturnType<typeof documentRef>) => ReturnType<typeof ref.get>
    set: (ref: ReturnType<typeof documentRef>, data: StoredDoc) => void
  }) => Promise<void>) => {
    for (let attempt = 0; attempt <= transactionRetryCount; attempt++) {
      const writes: Array<{ ref: ReturnType<typeof documentRef>; data: StoredDoc }> = []
      transactionCallbackCalls++
      await callback({
        get: (ref: ReturnType<typeof documentRef>) => ref.get(),
        set: (ref: ReturnType<typeof documentRef>, data: StoredDoc) => writes.push({ ref, data }),
      })

      // A Firestore transaction discards the writes from a conflicted attempt
      // and reruns the callback before committing its final attempt.
      if (attempt === transactionRetryCount) {
        for (const { ref, data } of writes) {
          docs[ref.collection] ??= {}
          docs[ref.collection][ref.id] = data
        }
      }
    }
  }),
}

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({ verifyIdToken: verifyIdTokenMock })),
  adminDb: jest.fn(() => mockDb),
  adminStorage: jest.fn(() => ({ bucket: () => ({ file: () => ({ getMetadata: getMetadataMock }) }) })),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
  FieldPath: { documentId: jest.fn(() => '__name__') },
}))

import { GET, POST } from '@/app/api/feedback/route'

const validPayload = {
  type: 'BUG',
  subject: 'לא ניתן לבחור שעה',
  description: 'אחרי בחירת שירות לא מופיעות שעות זמינות.',
  pageUrl: '/nailists/abc',
  appVersion: '1.2.3',
  userAgent: 'Mozilla/5.0',
}

function makeRequest(body: unknown, token?: string) {
  const request = new NextRequest('http://localhost/api/feedback', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
  if (token) {
    Object.defineProperty(request, 'cookies', {
      get: () => ({ get: (name: string) => name === 'auth-token' ? { value: token } : undefined }),
    })
  }
  return request
}

describe('POST /api/feedback', () => {
  beforeEach(() => {
    for (const key of Object.keys(docs)) delete docs[key]
    docs.users = {
      'user-123': {
        email: 'profile@example.com',
        displayName: 'אושרי מהפרופיל',
        role: 'CLIENT',
      },
    }
    nextFeedbackId = 1
    transactionRetryCount = 0
    transactionCallbackCalls = 0
    jest.clearAllMocks()
    verifyIdTokenMock.mockResolvedValue({ uid: 'user-123', email: 'auth@example.com' })
    getMetadataMock.mockResolvedValue([{ size: '100', contentType: 'image/png' }])
  })

  it('requires an authenticated Firebase cookie', async () => {
    const response = await POST(makeRequest(validPayload))
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual(expect.objectContaining({ error: expect.stringMatching(/להתחבר/) }))
  })

  it('rejects an invalid or expired Firebase token without writing a report', async () => {
    verifyIdTokenMock.mockRejectedValueOnce(new Error('auth/id-token-expired'))

    const response = await POST(makeRequest(validPayload, 'expired-token'))

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual(expect.objectContaining({ error: expect.stringMatching(/פגה/) }))
    expect(docs.feedback).toBeUndefined()
  })

  it('rejects malformed feedback input', async () => {
    const response = await POST(makeRequest({ ...validPayload, type: 'NOPE', subject: '' }, 'token'))
    expect(response.status).toBe(400)
    expect(docs.feedback).toBeUndefined()
  })

  it('accepts exact field boundaries, including one-character text', async () => {
    const minimumResponse = await POST(makeRequest({
      ...validPayload,
      subject: 'א',
      description: 'ב',
      pageUrl: '/',
      appVersion: '1',
      userAgent: 'a',
    }, 'token'))
    const maximumResponse = await POST(makeRequest({
      ...validPayload,
      subject: 's'.repeat(120),
      description: 'd'.repeat(4000),
      pageUrl: `/${'p'.repeat(2047)}`,
      appVersion: 'v'.repeat(100),
      userAgent: 'u'.repeat(500),
    }, 'token'))

    expect(minimumResponse.status).toBe(201)
    expect(maximumResponse.status).toBe(201)
  })

  it.each([
    ['subject', { subject: 's'.repeat(121) }],
    ['description', { description: 'd'.repeat(4001) }],
    ['page URL', { pageUrl: `/${'p'.repeat(2048)}` }],
    ['app version', { appVersion: 'v'.repeat(101) }],
    ['user agent', { userAgent: 'u'.repeat(501) }],
  ])('rejects a %s above its maximum length', async (_label, override) => {
    const response = await POST(makeRequest({ ...validPayload, ...override }, 'token'))
    expect(response.status).toBe(400)
    expect(docs.feedback).toBeUndefined()
  })

  it.each([
    ['protocol-relative URL', '//evil.example/path'],
    ['javascript URL', 'javascript:alert(1)'],
    ['insecure absolute URL', 'http://example.com/path'],
    ['external HTTPS URL', 'https://evil.example/path'],
    ['relative URL with whitespace', '/search bad'],
  ])('rejects an unsafe %s', async (_label, pageUrl) => {
    const response = await POST(makeRequest({ ...validPayload, pageUrl }, 'token'))
    expect(response.status).toBe(400)
    expect(docs.feedback).toBeUndefined()
  })

  it('accepts relative and first-party production/staging URLs in production', async () => {
    const nodeEnv = jest.replaceProperty(process.env, 'NODE_ENV', 'production')
    try {
      expect((await POST(makeRequest(validPayload, 'token'))).status).toBe(201)
      expect((await POST(makeRequest({ ...validPayload, pageUrl: 'https://nailistiot.fun/search?q=tel-aviv' }, 'token'))).status).toBe(201)
      expect((await POST(makeRequest({ ...validPayload, pageUrl: 'https://dev.nailistiot.fun/search' }, 'token'))).status).toBe(201)
    } finally {
      nodeEnv.restore()
    }
  })

  it('accepts localhost HTTP URLs outside production for local development', async () => {
    const nodeEnv = jest.replaceProperty(process.env, 'NODE_ENV', 'development')
    try {
      expect((await POST(makeRequest({ ...validPayload, pageUrl: 'http://localhost:3000/search' }, 'token'))).status).toBe(201)
      expect((await POST(makeRequest({ ...validPayload, pageUrl: 'http://127.0.0.1:3000/search' }, 'token'))).status).toBe(201)
    } finally {
      nodeEnv.restore()
    }
  })

  it('rejects localhost HTTP URLs in production', async () => {
    const nodeEnv = jest.replaceProperty(process.env, 'NODE_ENV', 'production')
    try {
      expect((await POST(makeRequest({ ...validPayload, pageUrl: 'http://localhost:3000/search' }, 'token'))).status).toBe(400)
      expect((await POST(makeRequest({ ...validPayload, pageUrl: 'http://127.0.0.1:3000/search' }, 'token'))).status).toBe(400)
    } finally {
      nodeEnv.restore()
    }
  })

  it('derives reporter identity on the server and ignores spoofed body fields', async () => {
    const response = await POST(makeRequest({
      ...validPayload,
      reporterUid: 'attacker',
      reporterEmail: 'attacker@example.com',
      reporterDisplayName: 'האקרית',
      status: 'RESOLVED',
      priority: 'CRITICAL',
    }, 'token'))

    expect(response.status).toBe(201)
    const stored = docs.feedback['feedback-1']
    expect(stored).toEqual(expect.objectContaining({
      reporterUid: 'user-123',
      reporterEmail: 'auth@example.com',
      reporterDisplayName: 'אושרי מהפרופיל',
      reporterRole: 'CLIENT',
      status: 'NEW',
      priority: 'NORMAL',
    }))
    // Search terms are derived from trusted server snapshots, not accepted
    // from the browser payload. The admin endpoint uses these bounded prefixes
    // in an indexed array-contains query.
    expect(stored.searchTerms).toEqual(expect.arrayContaining(['ל', 'לא', 'ניתן', 'א', 'או', 'אושרי', 'a', 'au', 'auth']))
    expect(stored).not.toEqual(expect.objectContaining({
      reporterUid: 'attacker',
      reporterEmail: 'attacker@example.com',
      reporterDisplayName: 'האקרית',
      status: 'RESOLVED',
      priority: 'CRITICAL',
    }))
    expect(stored).not.toHaveProperty('isAdmin')
  })

  it('enforces the five-reports-per-24-hours limit atomically', async () => {
    const now = Date.now()
    docs.feedbackRateLimits = {
      'user-123': { submissionTimes: [now - 1, now - 2, now - 3, now - 4, now - 5] },
    }

    const response = await POST(makeRequest(validPayload, 'token'))
    expect(response.status).toBe(429)
    expect(await response.json()).toEqual(expect.objectContaining({ error: expect.stringMatching(/5 פניות/) }))
    expect(docs.feedback).toBeUndefined()
  })

  it('prunes timestamps outside the rolling rate-limit window', async () => {
    docs.feedbackRateLimits = {
      'user-123': {
        submissionTimes: [Date.now() - 25 * 60 * 60 * 1000, Date.now() - 1],
        expiresAt: new Date(Date.now() - 1),
      },
    }

    const response = await POST(makeRequest(validPayload, 'token'))
    expect(response.status).toBe(201)
    const ledger = docs.feedbackRateLimits['user-123']
    expect(ledger.submissionTimes).toHaveLength(2)
    expect(ledger.expiresAt).toEqual(expect.any(Date))
    expect((ledger.expiresAt as Date).getTime()).toBeGreaterThan(Date.now())
  })

  it('does not let stale expiry metadata bypass five recent submissions', async () => {
    const now = Date.now()
    docs.feedbackRateLimits = {
      'user-123': {
        submissionTimes: [now - 1, now - 2, now - 3, now - 4, now - 5],
        expiresAt: new Date(now - 1),
      },
    }

    const response = await POST(makeRequest(validPayload, 'token'))

    expect(response.status).toBe(429)
    expect(docs.feedback).toBeUndefined()
    expect(docs.feedbackRateLimits['user-123'].submissionTimes).toHaveLength(5)
  })

  it('commits one report and one rate-limit count when Firestore retries the transaction', async () => {
    transactionRetryCount = 1

    const response = await POST(makeRequest(validPayload, 'token'))

    expect(response.status).toBe(201)
    expect(transactionCallbackCalls).toBe(2)
    expect(Object.keys(docs.feedback)).toEqual(['feedback-1'])
    expect(docs.feedbackRateLimits['user-123'].submissionTimes).toHaveLength(1)
  })

  it('accepts only a verified private screenshot owned by the reporter', async () => {
    const storageKey = 'feedback/user-123/12345678-1234-1234-1234-123456789012.png'
    expect((await POST(makeRequest({ ...validPayload, screenshotStorageKey: storageKey }, 'token'))).status).toBe(201)
    expect(docs.feedback['feedback-1']).toEqual(expect.objectContaining({ screenshotStorageKey: storageKey }))
    expect((await POST(makeRequest({ ...validPayload, screenshotStorageKey: 'feedback/other/12345678-1234-1234-1234-123456789012.png' }, 'token'))).status).toBe(400)
  })

  it('returns only the signed-in reporter’s safe history fields', async () => {
    docs.feedback = {
      mine: { reporterUid: 'user-123', type: 'BUG', subject: 'שלי', description: 'פרטים', status: 'NEW', priority: 'NORMAL', pageUrl: '/search', reporterEmail: 'secret@example.com', internalNote: 'private', userAgent: 'fingerprint', createdAt: { toDate: () => new Date('2026-01-01T00:00:00Z') } },
      other: { reporterUid: 'other-user', type: 'IDEA', subject: 'אחר', description: 'לא שלי', status: 'NEW', priority: 'NORMAL', pageUrl: '/', createdAt: { toDate: () => new Date('2026-01-02T00:00:00Z') } },
    }
    const response = await GET(makeRequest({}, 'token'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].id).toBe('mine')
    expect(body.data[0]).not.toHaveProperty('reporterEmail')
    expect(body.data[0]).not.toHaveProperty('internalNote')
    expect(body.data[0]).not.toHaveProperty('userAgent')
    expect(body.data[0]).not.toHaveProperty('priority')
  })
})
