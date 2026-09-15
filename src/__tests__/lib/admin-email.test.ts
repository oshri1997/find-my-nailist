/**
 * @jest-environment node
 */
const mockGetUsers = jest.fn()
const mockSendAdminMessageEmail = jest.fn().mockResolvedValue(undefined)
const mockSendRoleAwareVerificationEmail = jest.fn().mockResolvedValue({ ok: true })
const mockWriteAuditLog = jest.fn().mockResolvedValue(undefined)

type DocData = Record<string, unknown>
const docStore: Record<string, DocData | undefined> = {}
const writes: { id: string; data: DocData }[] = []

function userRef(id: string) {
  return {
    id,
    get: jest.fn().mockImplementation(() =>
      Promise.resolve({ id, exists: !!docStore[id], data: () => docStore[id] })
    ),
    set: jest.fn().mockImplementation((data: DocData) => {
      writes.push({ id, data })
      docStore[id] = { ...docStore[id], ...data }
      return Promise.resolve()
    }),
  }
}

const mockDb = {
  collection: jest.fn(() => ({ doc: (id: string) => userRef(id) })),
  getAll: jest.fn((...refs: { id: string }[]) =>
    Promise.resolve(refs.map(r => ({ id: r.id, exists: !!docStore[r.id], data: () => docStore[r.id] })))
  ),
}

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: () => mockDb,
  adminAuth: () => ({ getUsers: mockGetUsers }),
}))

jest.mock('@/lib/email', () => ({
  sendAdminMessageEmail: (...args: unknown[]) => mockSendAdminMessageEmail(...args),
}))

jest.mock('@/lib/verification-email', () => ({
  sendRoleAwareVerificationEmail: (...args: unknown[]) => mockSendRoleAwareVerificationEmail(...args),
}))

jest.mock('@/lib/audit-log', () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { delete: () => '__deleted__', serverTimestamp: () => '__ts__' },
}))

import { sendAdminEmails } from '@/lib/admin-email'

const admin = { uid: 'admin-1', email: 'admin@example.com' }

describe('sendAdminEmails', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    for (const key of Object.keys(docStore)) delete docStore[key]
    writes.length = 0
    mockGetUsers.mockResolvedValue({ users: [] })
  })

  it('sends a verification email to an unverified user with their Firebase Auth address', async () => {
    docStore['u1'] = { email: 'typo@exampl.com', displayName: 'דנה', role: 'CLIENT' }
    mockGetUsers.mockResolvedValue({ users: [{ uid: 'u1', email: 'fixed@example.com', emailVerified: false }] })

    const result = await sendAdminEmails({ template: 'VERIFICATION', userIds: ['u1'], admin })

    expect(result.sent).toEqual([{ id: 'u1', email: 'fixed@example.com' }])
    expect(mockSendRoleAwareVerificationEmail).toHaveBeenCalledWith(
      'u1', 'fixed@example.com', 'CLIENT', { skipCooldown: true }
    )
  })

  it('syncs a corrected address onto the user doc and clears the stale bounce flag', async () => {
    docStore['u1'] = { email: 'typo@exampl.com', emailDeliveryStatus: 'BOUNCED', role: 'CLIENT' }
    mockGetUsers.mockResolvedValue({ users: [{ uid: 'u1', email: 'fixed@example.com', emailVerified: false }] })

    await sendAdminEmails({ template: 'VERIFICATION', userIds: ['u1'], admin })

    expect(writes[0].data).toMatchObject({
      email: 'fixed@example.com',
      emailDeliveryStatus: '__deleted__',
      emailDeliveryBouncedAt: '__deleted__',
    })
  })

  it('leaves the user doc untouched when the address already matches', async () => {
    docStore['u1'] = { email: 'same@example.com', role: 'CLIENT' }
    mockGetUsers.mockResolvedValue({ users: [{ uid: 'u1', email: 'same@example.com', emailVerified: false }] })

    await sendAdminEmails({ template: 'VERIFICATION', userIds: ['u1'], admin })

    expect(writes).toHaveLength(0)
  })

  it('skips a verification send for an already-verified address', async () => {
    docStore['u1'] = { email: 'done@example.com', role: 'CLIENT' }
    mockGetUsers.mockResolvedValue({ users: [{ uid: 'u1', email: 'done@example.com', emailVerified: true }] })

    const result = await sendAdminEmails({ template: 'VERIFICATION', userIds: ['u1'], admin })

    expect(result.sent).toHaveLength(0)
    expect(result.skipped[0]).toMatchObject({ id: 'u1', reason: 'המייל כבר מאומת' })
    expect(mockSendRoleAwareVerificationEmail).not.toHaveBeenCalled()
  })

  it('skips a user whose account no longer exists', async () => {
    const result = await sendAdminEmails({ template: 'VERIFICATION', userIds: ['ghost'], admin })

    expect(result.skipped[0].id).toBe('ghost')
    expect(mockSendRoleAwareVerificationEmail).not.toHaveBeenCalled()
  })

  it.each([
    ['BOUNCED', 'המייל חזר בעבר'],
    ['SUPPRESSED', 'הכתובת חסומה לשליחה'],
  ])('does not send to a %s address', async (emailDeliveryStatus, reason) => {
    docStore['u1'] = { email: 'blocked@example.com', emailDeliveryStatus, role: 'CLIENT' }
    mockGetUsers.mockResolvedValue({ users: [{ uid: 'u1', email: 'blocked@example.com', emailVerified: false }] })

    const result = await sendAdminEmails({ template: 'CUSTOM', userIds: ['u1'], subject: 'נושא', message: 'תוכן', admin })

    expect(result.skipped).toEqual([{ id: 'u1', email: 'blocked@example.com', reason }])
    expect(mockSendAdminMessageEmail).not.toHaveBeenCalled()
  })

  it('never falls back to a Firestore-only email address', async () => {
    docStore['u1'] = { email: 'stale@example.com', role: 'CLIENT' }

    const result = await sendAdminEmails({ template: 'CUSTOM', userIds: ['u1'], subject: 'נושא', message: 'תוכן', admin })

    expect(result.skipped[0]).toMatchObject({ id: 'u1', reason: 'למשתמש אין חשבון מייל פעיל' })
    expect(mockSendAdminMessageEmail).not.toHaveBeenCalled()
  })

  it('sends a custom message to every recipient regardless of verification state', async () => {
    docStore['u1'] = { email: 'a@example.com', displayName: 'דנה', role: 'NAILIST' }
    docStore['u2'] = { email: 'b@example.com', displayName: 'נועה', role: 'CLIENT' }
    mockGetUsers.mockResolvedValue({
      users: [
        { uid: 'u1', email: 'a@example.com', emailVerified: true },
        { uid: 'u2', email: 'b@example.com', emailVerified: false },
      ],
    })

    const result = await sendAdminEmails({
      template: 'CUSTOM', userIds: ['u1', 'u2'], subject: 'נושא', message: 'תוכן', admin,
    })

    expect(result.sent).toHaveLength(2)
    expect(mockSendAdminMessageEmail).toHaveBeenCalledWith({
      email: 'a@example.com', subject: 'נושא', message: 'תוכן', name: 'דנה',
    })
  })

  it('uses the operation id to make a custom send retry-safe', async () => {
    docStore['u1'] = { email: 'a@example.com', displayName: 'דנה', role: 'CLIENT' }
    mockGetUsers.mockResolvedValue({ users: [{ uid: 'u1', email: 'a@example.com', emailVerified: false }] })

    await sendAdminEmails({
      template: 'CUSTOM', userIds: ['u1'], subject: 'נושא', message: 'תוכן', operationId: 'send_123456', admin,
    })

    expect(mockSendAdminMessageEmail).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: 'admin-email:send_123456:u1',
    }))
  })

  it('reports a per-recipient failure without aborting the rest of the batch', async () => {
    docStore['u1'] = { email: 'a@example.com', role: 'CLIENT' }
    docStore['u2'] = { email: 'b@example.com', role: 'CLIENT' }
    mockGetUsers.mockResolvedValue({
      users: [
        { uid: 'u1', email: 'a@example.com', emailVerified: false },
        { uid: 'u2', email: 'b@example.com', emailVerified: false },
      ],
    })
    mockSendAdminMessageEmail.mockRejectedValueOnce(new Error('Resend error 429'))

    const result = await sendAdminEmails({
      template: 'CUSTOM', userIds: ['u1', 'u2'], subject: 'נושא', message: 'תוכן', admin,
    })

    expect(result.failed).toEqual([{ id: 'u1', email: 'a@example.com', error: 'Resend error 429' }])
    expect(result.sent).toEqual([{ id: 'u2', email: 'b@example.com' }])
  })

  it('writes an audit entry per delivered email and none for a failure', async () => {
    docStore['u1'] = { email: 'a@example.com', role: 'CLIENT' }
    mockGetUsers.mockResolvedValue({ users: [{ uid: 'u1', email: 'a@example.com', emailVerified: false }] })
    mockSendAdminMessageEmail.mockRejectedValueOnce(new Error('boom'))

    await sendAdminEmails({ template: 'CUSTOM', userIds: ['u1'], subject: 'נושא', message: 'תוכן', admin })
    expect(mockWriteAuditLog).not.toHaveBeenCalled()

    await sendAdminEmails({ template: 'CUSTOM', userIds: ['u1'], subject: 'נושא', message: 'תוכן', admin })
    expect(mockWriteAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorUid: 'admin-1',
      action: 'EMAIL_SEND',
      targetType: 'user',
      targetId: 'u1',
      metadata: expect.objectContaining({ template: 'CUSTOM', recipientEmail: 'a@example.com' }),
    }))
  })

  it('looks up Firebase Auth records in batches of 100', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `u${i}`)
    ids.forEach(id => { docStore[id] = { email: `${id}@example.com`, role: 'CLIENT' } })
    mockGetUsers.mockResolvedValue({ users: [] })

    await sendAdminEmails({ template: 'CUSTOM', userIds: ids, subject: 'נושא', message: 'תוכן', admin })

    expect(mockGetUsers).toHaveBeenCalledTimes(2)
    expect(mockGetUsers.mock.calls[0][0]).toHaveLength(100)
    expect(mockGetUsers.mock.calls[1][0]).toHaveLength(50)
  })
})
