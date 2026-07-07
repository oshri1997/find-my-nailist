/**
 * @jest-environment node
 */
const mockAdd = jest.fn().mockResolvedValue({ id: 'log-1' })
const mockCollection = jest.fn(() => ({ add: mockAdd }))

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: () => ({ collection: mockCollection }),
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
}))

import { writeAuditLog } from '@/lib/audit-log'
import { COLLECTIONS } from '@/lib/firebase/collections'

describe('writeAuditLog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('writes to the auditLogs collection with a server timestamp', async () => {
    await writeAuditLog({
      actorUid: 'admin-1',
      actorEmail: 'admin@test.com',
      action: 'USER_DELETE',
      targetType: 'user',
      targetId: 'target-1',
      metadata: { email: 'target@test.com' },
    })

    expect(mockCollection).toHaveBeenCalledWith(COLLECTIONS.AUDIT_LOGS)
    expect(mockAdd).toHaveBeenCalledWith({
      actorUid: 'admin-1',
      actorEmail: 'admin@test.com',
      action: 'USER_DELETE',
      targetType: 'user',
      targetId: 'target-1',
      metadata: { email: 'target@test.com' },
      createdAt: 'SERVER_TIMESTAMP',
    })
  })

  it('swallows write failures instead of throwing, so the caller action still succeeds', async () => {
    mockAdd.mockRejectedValueOnce(new Error('firestore down'))
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    await expect(writeAuditLog({
      actorUid: 'admin-1',
      actorEmail: 'admin@test.com',
      action: 'REVIEW_DELETE',
      targetType: 'review',
      targetId: 'r1',
    })).resolves.toBeUndefined()

    expect(consoleErrorSpy).toHaveBeenCalledWith('audit log write failed:', expect.any(Error))
    consoleErrorSpy.mockRestore()
  })
})
