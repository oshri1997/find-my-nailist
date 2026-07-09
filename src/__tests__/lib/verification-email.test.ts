/**
 * Direct coverage for the centralized cooldown logic in
 * sendRoleAwareVerificationEmail — this is now the single source of truth
 * shared by both /api/auth/verify-email (manual resend) and
 * /api/me/set-role (the first, role-aware send), so it's worth testing on
 * its own rather than only indirectly through those two routes' mocks.
 */
const mockGenerateEmailVerificationLink = jest.fn().mockResolvedValue('https://verify/link')
const mockSendVerificationEmail = jest.fn().mockResolvedValue(undefined)
const mockDocSet = jest.fn().mockResolvedValue(undefined)

type DocData = Record<string, unknown> | undefined
const docStore: Record<string, DocData> = {}

function makeDocRef(path: string) {
  return {
    get: jest.fn().mockImplementation(() =>
      Promise.resolve({ exists: !!docStore[path], data: () => docStore[path] })
    ),
    set: mockDocSet,
  }
}

const mockDb = {
  collection: jest.fn((name: string) => ({
    doc: (id: string) => makeDocRef(`${name}/${id}`),
  })),
}

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: jest.fn(() => ({ generateEmailVerificationLink: mockGenerateEmailVerificationLink })),
  adminDb: jest.fn(() => mockDb),
}))

jest.mock('@/lib/email', () => ({
  sendVerificationEmail: (...args: unknown[]) => mockSendVerificationEmail(...args),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

import { sendRoleAwareVerificationEmail } from '@/lib/verification-email'

describe('sendRoleAwareVerificationEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGenerateEmailVerificationLink.mockResolvedValue('https://verify/link')
    for (const key of Object.keys(docStore)) delete docStore[key]
  })

  it('sends and stamps lastVerificationEmailSentAt when there is no prior send', async () => {
    const result = await sendRoleAwareVerificationEmail('uid-1', 'a@test.com', 'CLIENT')
    expect(result).toEqual({ ok: true })
    expect(mockGenerateEmailVerificationLink).toHaveBeenCalledWith('a@test.com')
    expect(mockSendVerificationEmail).toHaveBeenCalledWith({
      email: 'a@test.com',
      verifyLink: 'https://verify/link',
      role: 'CLIENT',
    })
    expect(mockDocSet).toHaveBeenCalledWith(
      { lastVerificationEmailSentAt: 'SERVER_TIMESTAMP' },
      { merge: true }
    )
  })

  it('rejects a second call within the 10-minute cooldown without sending again', async () => {
    // Regression (Fix #2): before centralizing this check, calling
    // sendRoleAwareVerificationEmail a second time in quick succession (e.g.
    // a retried /api/me/set-role PATCH) had no rate-limit protection at all
    // and would trigger a second real generateEmailVerificationLink call.
    docStore['users/uid-1'] = {
      lastVerificationEmailSentAt: { toDate: () => new Date(Date.now() - 60 * 1000) }, // 1 min ago
    }
    const result = await sendRoleAwareVerificationEmail('uid-1', 'a@test.com', 'CLIENT')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.rateLimited).toBe(true)
      expect(result.retryAfterSeconds).toBeGreaterThan(0)
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(9 * 60)
    }
    expect(mockGenerateEmailVerificationLink).not.toHaveBeenCalled()
    expect(mockSendVerificationEmail).not.toHaveBeenCalled()
  })

  it('allows sending again once the 10-minute cooldown has fully elapsed', async () => {
    docStore['users/uid-1'] = {
      lastVerificationEmailSentAt: { toDate: () => new Date(Date.now() - 11 * 60 * 1000) }, // 11 min ago
    }
    const result = await sendRoleAwareVerificationEmail('uid-1', 'a@test.com', 'NAILIST')
    expect(result).toEqual({ ok: true })
    expect(mockGenerateEmailVerificationLink).toHaveBeenCalled()
    expect(mockSendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'NAILIST' })
    )
  })

  it('stamps the cooldown before sending, so a failing send still counts against the cooldown', async () => {
    mockSendVerificationEmail.mockRejectedValueOnce(new Error('provider outage'))
    await expect(sendRoleAwareVerificationEmail('uid-1', 'a@test.com', 'CLIENT')).rejects.toThrow('provider outage')
    expect(mockDocSet).toHaveBeenCalledWith(
      { lastVerificationEmailSentAt: 'SERVER_TIMESTAMP' },
      { merge: true }
    )
  })
})
