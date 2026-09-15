/**
 * @jest-environment node
 */
const mockGetUser = jest.fn()
const mockUpdateUser = jest.fn().mockResolvedValue(undefined)
const mockSendAdminActionCodeEmail = jest.fn().mockResolvedValue(undefined)
const mockWriteAuditLog = jest.fn().mockResolvedValue(undefined)

type DocData = Record<string, unknown>
const users: Record<string, DocData> = {}
const challenges: Record<string, DocData> = {}
const userWrites: { id: string; data: DocData }[] = []
let challengeSeq = 0

function challengeRef(id: string) {
  return {
    id,
    set: jest.fn(async (data: DocData) => { challenges[id] = data }),
  }
}

function usersCollection() {
  return {
    doc: (id: string) => ({
      id,
      get: jest.fn(async () => ({ exists: !!users[id], data: () => users[id] })),
      set: jest.fn(async (data: DocData) => {
        userWrites.push({ id, data })
        users[id] = { ...users[id], ...data }
      }),
    }),
  }
}

const mockDb = {
  collection: jest.fn((name: string) =>
    name === 'users'
      ? usersCollection()
      : { doc: (id?: string) => challengeRef(id ?? `chal-${++challengeSeq}`) }
  ),
  runTransaction: jest.fn(async (fn: (tx: unknown) => unknown) =>
    fn({
      get: async (ref: { id: string }) => ({
        exists: !!challenges[ref.id],
        data: () => challenges[ref.id],
      }),
      update: (ref: { id: string }, data: DocData) => {
        for (const [k, v] of Object.entries(data)) {
          challenges[ref.id][k] = v === '__increment__'
            ? ((challenges[ref.id][k] as number) ?? 0) + 1
            : v
        }
      },
    })
  ),
}

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: () => mockDb,
  adminAuth: () => ({ getUser: mockGetUser, updateUser: mockUpdateUser }),
}))

jest.mock('@/lib/email', () => ({
  sendAdminActionCodeEmail: (...args: unknown[]) => mockSendAdminActionCodeEmail(...args),
}))

jest.mock('@/lib/audit-log', () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
}))

jest.mock('@/lib/cost-quota', () => ({
  CostQuotaExceeded: class CostQuotaExceeded extends Error {},
  reserveCostQuota: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/email-domain', () => ({
  validateEmailDomain: jest.fn().mockResolvedValue({ status: 'valid' }),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    delete: () => '__deleted__',
    serverTimestamp: () => '__ts__',
    increment: () => '__increment__',
  },
  Timestamp: { fromMillis: (ms: number) => ({ toMillis: () => ms }) },
}))

import { requestEmailChange, confirmEmailChange } from '@/lib/admin-email-change'

const admin = { uid: 'admin-1', email: 'admin@example.com' }

function sentCode(): string {
  return mockSendAdminActionCodeEmail.mock.calls.at(-1)![0].code
}

async function startChange(newEmail = 'fixed@gmail.com') {
  const result = await requestEmailChange({ targetUid: 'u1', newEmail, admin })
  if (!result.ok) throw new Error(result.error)
  return { challengeId: result.data.challengeId, code: sentCode() }
}

describe('admin email change — request step', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    for (const k of Object.keys(users)) delete users[k]
    for (const k of Object.keys(challenges)) delete challenges[k]
    userWrites.length = 0
    users['u1'] = { email: 'typo@gmail.cin', role: 'CLIENT' }
    mockGetUser.mockResolvedValue({ uid: 'u1', email: 'typo@gmail.cin' })
  })

  it('mails a 6-digit code to the fixed guard address, never to the new address', async () => {
    const result = await requestEmailChange({ targetUid: 'u1', newEmail: 'fixed@gmail.com', admin })

    expect(result.ok).toBe(true)
    const payload = mockSendAdminActionCodeEmail.mock.calls[0][0]
    expect(payload.email).toBe('nailistiotil@gmail.com')
    expect(payload.code).toMatch(/^\d{6}$/)
    expect(payload.details.join(' ')).toContain('fixed@gmail.com')
  })

  it('never applies the change during the request step', async () => {
    await requestEmailChange({ targetUid: 'u1', newEmail: 'fixed@gmail.com', admin })
    expect(mockUpdateUser).not.toHaveBeenCalled()
    expect(userWrites).toHaveLength(0)
  })

  it('stores the code hashed rather than in plain text', async () => {
    const { challengeId, code } = await startChange()
    expect(challenges[challengeId].codeHash).not.toContain(code)
    expect(challenges[challengeId].codeHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('rejects a malformed address', async () => {
    const result = await requestEmailChange({ targetUid: 'u1', newEmail: 'not-an-email', admin })
    expect(result).toMatchObject({ ok: false, status: 400 })
    expect(mockSendAdminActionCodeEmail).not.toHaveBeenCalled()
  })

  it('rejects an address whose domain cannot receive email', async () => {
    const { validateEmailDomain } = jest.requireMock('@/lib/email-domain') as { validateEmailDomain: jest.Mock }
    validateEmailDomain.mockResolvedValueOnce({ status: 'invalid' })

    const result = await requestEmailChange({ targetUid: 'u1', newEmail: 'fixed@example.com', admin })

    expect(result).toMatchObject({ ok: false, status: 400 })
    expect(mockSendAdminActionCodeEmail).not.toHaveBeenCalled()
  })

  it('refuses to repoint an admin account', async () => {
    users['u1'] = { email: 'a@b.com', isAdmin: true }
    const result = await requestEmailChange({ targetUid: 'u1', newEmail: 'fixed@gmail.com', admin })
    expect(result).toMatchObject({ ok: false, status: 403 })
  })

  it('rejects a change to the address already on the account', async () => {
    const result = await requestEmailChange({ targetUid: 'u1', newEmail: ' TYPO@Gmail.CIN ', admin })
    expect(result).toMatchObject({ ok: false, status: 400 })
  })

  it('rejects an unknown user', async () => {
    const result = await requestEmailChange({ targetUid: 'ghost', newEmail: 'a@b.com', admin })
    expect(result).toMatchObject({ ok: false, status: 404 })
  })
})

describe('admin email change — confirm step', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    for (const k of Object.keys(users)) delete users[k]
    for (const k of Object.keys(challenges)) delete challenges[k]
    userWrites.length = 0
    users['u1'] = { email: 'typo@gmail.cin', role: 'CLIENT' }
    mockGetUser.mockResolvedValue({ uid: 'u1', email: 'typo@gmail.cin' })
    mockUpdateUser.mockResolvedValue(undefined)
  })

  it('applies the change in Firebase Auth and marks the new address unverified', async () => {
    const { challengeId, code } = await startChange()
    const result = await confirmEmailChange({ challengeId, code, targetUid: 'u1', admin })

    expect(result.ok).toBe(true)
    expect(mockUpdateUser).toHaveBeenCalledWith('u1', { email: 'fixed@gmail.com', emailVerified: false })
  })

  it('mirrors the new address onto the user doc and clears the stale bounce flag', async () => {
    const { challengeId, code } = await startChange()
    await confirmEmailChange({ challengeId, code, targetUid: 'u1', admin })

    expect(userWrites.at(-1)!.data).toMatchObject({
      email: 'fixed@gmail.com',
      emailDeliveryStatus: '__deleted__',
      lastVerificationEmailSentAt: '__deleted__',
    })
  })

  it('rejects a wrong code and counts the attempt', async () => {
    const { challengeId, code } = await startChange()
    const wrong = code === '000000' ? '111111' : '000000'

    const result = await confirmEmailChange({ challengeId, code: wrong, targetUid: 'u1', admin })
    expect(result).toMatchObject({ ok: false, status: 400 })
    expect(challenges[challengeId].attempts).toBe(1)
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('locks the challenge after 5 wrong codes', async () => {
    const { challengeId, code } = await startChange()
    const wrong = code === '000000' ? '111111' : '000000'
    for (let i = 0; i < 5; i++) await confirmEmailChange({ challengeId, code: wrong, targetUid: 'u1', admin })

    const result = await confirmEmailChange({ challengeId, code, targetUid: 'u1', admin })
    expect(result).toMatchObject({ ok: false, status: 429 })
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('refuses a code that has already been used', async () => {
    const { challengeId, code } = await startChange()
    await confirmEmailChange({ challengeId, code, targetUid: 'u1', admin })
    mockUpdateUser.mockClear()

    const replay = await confirmEmailChange({ challengeId, code, targetUid: 'u1', admin })
    expect(replay).toMatchObject({ ok: false, status: 400 })
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('refuses an expired code', async () => {
    const { challengeId, code } = await startChange()
    challenges[challengeId].expiresAt = { toMillis: () => Date.now() - 1000 }

    const result = await confirmEmailChange({ challengeId, code, targetUid: 'u1', admin })
    expect(result).toMatchObject({ ok: false, status: 400 })
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('refuses a code issued to a different admin', async () => {
    const { challengeId, code } = await startChange()
    const result = await confirmEmailChange({
      challengeId, code, targetUid: 'u1', admin: { uid: 'admin-2', email: 'other@example.com' },
    })
    expect(result).toMatchObject({ ok: false, status: 403 })
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('refuses to apply a challenge to a different user', async () => {
    const { challengeId, code } = await startChange()
    const result = await confirmEmailChange({ challengeId, code, targetUid: 'u2', admin })

    expect(result).toMatchObject({ ok: false, status: 400 })
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('refuses an unknown challenge id', async () => {
    const result = await confirmEmailChange({ challengeId: 'nope', code: '123456', targetUid: 'u1', admin })
    expect(result).toMatchObject({ ok: false, status: 400 })
  })

  it('reports an address already taken by another account', async () => {
    const { challengeId, code } = await startChange()
    mockUpdateUser.mockRejectedValueOnce(Object.assign(new Error('taken'), { code: 'auth/email-already-exists' }))

    const result = await confirmEmailChange({ challengeId, code, targetUid: 'u1', admin })
    expect(result).toMatchObject({ ok: false, status: 409 })
    expect(userWrites).toHaveLength(0)
  })

  it('keeps the code usable when Firebase Auth rejects the first update', async () => {
    const { challengeId, code } = await startChange()
    mockUpdateUser.mockRejectedValueOnce(new Error('temporary provider failure'))

    const failed = await confirmEmailChange({ challengeId, code, targetUid: 'u1', admin })
    const retry = await confirmEmailChange({ challengeId, code, targetUid: 'u1', admin })

    expect(failed).toMatchObject({ ok: false, status: 500 })
    expect(retry).toMatchObject({ ok: true })
    expect(mockUpdateUser).toHaveBeenCalledTimes(2)
  })

  it('records the change in the audit log', async () => {
    const { challengeId, code } = await startChange()
    await confirmEmailChange({ challengeId, code, targetUid: 'u1', admin })

    expect(mockWriteAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'USER_EMAIL_CHANGE',
      targetId: 'u1',
      metadata: { oldEmail: 'typo@gmail.cin', newEmail: 'fixed@gmail.com' },
    }))
  })
})
