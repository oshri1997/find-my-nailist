/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockVerify = jest.fn()
const mockSet = jest.fn()
const mockCommit = jest.fn().mockResolvedValue(undefined)
const mockGet = jest.fn()

jest.mock('resend', () => ({
  Resend: jest.fn(() => ({ webhooks: { verify: mockVerify } })),
}))

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: jest.fn(() => ({
    collection: () => ({ where: () => ({ get: mockGet }) }),
    batch: () => ({ set: mockSet, commit: mockCommit }),
  })),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

import { POST } from '@/app/api/webhooks/resend/route'

function request() {
  return new NextRequest('http://localhost/api/webhooks/resend', {
    method: 'POST',
    body: JSON.stringify({ event: 'placeholder' }),
    headers: { 'svix-id': 'id', 'svix-timestamp': 'timestamp', 'svix-signature': 'signature' },
  })
}

describe('Resend bounce webhook', () => {
  const previousSecret = process.env.RESEND_WEBHOOK_SECRET

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.RESEND_WEBHOOK_SECRET = 'whsec_test'
  })

  afterAll(() => { process.env.RESEND_WEBHOOK_SECRET = previousSecret })

  it('records a bounced recipient only after Resend verifies the signature', async () => {
    mockVerify.mockReturnValue({
      type: 'email.bounced',
      data: { to: ['Sarah@Test.com'], email_id: 'email_123' },
    })
    mockGet.mockResolvedValue({ empty: false, docs: [{ ref: 'user-ref' }] })

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(mockVerify).toHaveBeenCalledWith(expect.objectContaining({ webhookSecret: 'whsec_test' }))
    expect(mockSet).toHaveBeenCalledWith('user-ref', expect.objectContaining({ emailDeliveryStatus: 'BOUNCED', emailDeliveryEventId: 'email_123' }), { merge: true })
    expect(mockCommit).toHaveBeenCalled()
  })

  it('rejects an unverified webhook payload', async () => {
    mockVerify.mockImplementation(() => { throw new Error('bad signature') })

    const res = await POST(request())

    expect(res.status).toBe(400)
    expect(mockSet).not.toHaveBeenCalled()
  })
})
