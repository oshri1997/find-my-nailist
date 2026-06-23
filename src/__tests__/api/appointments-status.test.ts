/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// ── Firebase Admin mocks ────────────────────────────────────────────────────

type DocData = Record<string, unknown>

const docStore: Record<string, DocData> = {}

const mockUpdateFn = jest.fn().mockResolvedValue(undefined)

const mockDocRef = (collection: string, id: string) => ({
  get: jest.fn().mockImplementation(() =>
    Promise.resolve({
      exists: !!docStore[`${collection}/${id}`],
      data: () => docStore[`${collection}/${id}`] ?? undefined,
      id,
    })
  ),
  update: mockUpdateFn,
})

const mockDb = {
  collection: jest.fn((name: string) => ({
    doc: (id: string) => mockDocRef(name, id),
  })),
}

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

const mockSendReviewRequestEmail = jest.fn().mockResolvedValue(undefined)
const mockSendCancellationEmail = jest.fn().mockResolvedValue(undefined)

jest.mock('@/lib/email', () => ({
  sendReviewRequestEmail: (...args: unknown[]) => mockSendReviewRequestEmail(...args),
  sendCancellationEmail: (...args: unknown[]) => mockSendCancellationEmail(...args),
}))

// ── Import after mocks ──────────────────────────────────────────────────────

import { PATCH } from '@/app/api/appointments/[id]/status/route'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/appointments/appointment-1/status', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const mockParams: { params: Promise<{ id: string }> } = {
  params: Promise.resolve({ id: 'appointment-1' }),
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('PATCH /api/appointments/[id]/status', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default appointment doc
    docStore['appointments/appointment-1'] = {
      status: 'CONFIRMED',
      clientProfileId: 'client-profile-1',
      nailistProfileId: 'nailist-profile-1',
      serviceName: 'מניקור',
      clientDisplayName: 'לקוחה',
      reviewRequested: false,
      startTime: { toDate: () => new Date('2026-06-20T10:00:00Z') },
    }

    docStore['clientProfiles/client-profile-1'] = {
      displayName: 'לקוחה',
      email: 'client@test.com',
      userId: 'client-user-1',
    }

    docStore['nailistProfiles/nailist-profile-1'] = {
      businessName: 'סטודיו נייל',
      userId: 'nailist-user-1',
    }

    docStore['users/client-user-1'] = { email: 'client@test.com' }
    docStore['users/nailist-user-1'] = { email: 'nailist@test.com' }
  })

  it('returns 400 for invalid status value', async () => {
    const req = makeRequest({ status: 'INVALID_STATUS' })
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(400)
  })

  it('returns 200 when status is updated to CONFIRMED', async () => {
    const req = makeRequest({ status: 'CONFIRMED' })
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('CONFIRMED')
  })

  it('returns 200 when status is updated to CANCELLED', async () => {
    const req = makeRequest({ status: 'CANCELLED' })
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(200)
  })

  it('returns 200 when status is updated to COMPLETED', async () => {
    const req = makeRequest({ status: 'COMPLETED' })
    const res = await PATCH(req, mockParams)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('COMPLETED')
  })

  it('sends review request email when status → COMPLETED (first time)', async () => {
    docStore['appointments/appointment-1'].reviewRequested = false

    const req = makeRequest({ status: 'COMPLETED' })
    await PATCH(req, mockParams)

    // Fire-and-forget: give it a tick to resolve
    await new Promise((r) => setTimeout(r, 10))

    expect(mockSendReviewRequestEmail).toHaveBeenCalledTimes(1)
    expect(mockSendReviewRequestEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        clientEmail: 'client@test.com',
        appointmentId: 'appointment-1',
      })
    )
  })

  it('does NOT send review email when reviewRequested is already true (idempotency)', async () => {
    docStore['appointments/appointment-1'].reviewRequested = true

    const req = makeRequest({ status: 'COMPLETED' })
    await PATCH(req, mockParams)

    await new Promise((r) => setTimeout(r, 10))

    expect(mockSendReviewRequestEmail).not.toHaveBeenCalled()
  })

  it('sends cancellation email when status → CANCELLED', async () => {
    const req = makeRequest({ status: 'CANCELLED' })
    await PATCH(req, mockParams)

    await new Promise((r) => setTimeout(r, 10))

    expect(mockSendCancellationEmail).toHaveBeenCalledTimes(1)
    expect(mockSendCancellationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        clientEmail: 'client@test.com',
        nailistBusinessName: 'סטודיו נייל',
      })
    )
  })

  it('does NOT send cancellation email when status → CONFIRMED', async () => {
    const req = makeRequest({ status: 'CONFIRMED' })
    await PATCH(req, mockParams)

    await new Promise((r) => setTimeout(r, 10))

    expect(mockSendCancellationEmail).not.toHaveBeenCalled()
  })
})
