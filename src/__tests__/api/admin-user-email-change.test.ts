/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockVerifyAdmin = jest.fn()
const mockRequestEmailChange = jest.fn()
const mockConfirmEmailChange = jest.fn()

jest.mock('@/lib/admin-auth', () => ({
  verifyAdmin: (...args: unknown[]) => mockVerifyAdmin(...args),
  adminUnauthorized: () => new Response(JSON.stringify({ error: 'אין הרשאה' }), { status: 403 }),
}))

jest.mock('@/lib/admin-email-change', () => ({
  requestEmailChange: (...args: unknown[]) => mockRequestEmailChange(...args),
  confirmEmailChange: (...args: unknown[]) => mockConfirmEmailChange(...args),
}))

import { POST } from '@/app/api/admin/users/[id]/email/route'

function call(body: unknown, id = 'u1') {
  const req = new NextRequest('http://localhost/api/admin/users/u1/email', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  return POST(req, { params: Promise.resolve({ id }) })
}

const adminCtx = { uid: 'admin-1', email: 'admin@example.com' }

describe('POST /api/admin/users/[id]/email', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockVerifyAdmin.mockResolvedValue(adminCtx)
    mockRequestEmailChange.mockResolvedValue({ ok: true, data: { challengeId: 'c1', sentTo: 'guard@example.com' } })
    mockConfirmEmailChange.mockResolvedValue({ ok: true, data: { targetUid: 'u1', newEmail: 'fixed@gmail.com' } })
  })

  it('rejects a non-admin caller before any step runs', async () => {
    mockVerifyAdmin.mockResolvedValue(null)
    const res = await call({ step: 'request', email: 'fixed@gmail.com' })

    expect(res.status).toBe(403)
    expect(mockRequestEmailChange).not.toHaveBeenCalled()
    expect(mockConfirmEmailChange).not.toHaveBeenCalled()
  })

  it('rejects an unknown step', async () => {
    const res = await call({ step: 'apply', email: 'fixed@gmail.com' })
    expect(res.status).toBe(400)
    expect(mockRequestEmailChange).not.toHaveBeenCalled()
  })

  it('starts the challenge and returns where the code went', async () => {
    const res = await call({ step: 'request', email: 'fixed@gmail.com' })
    const json = await res.json()

    expect(mockRequestEmailChange).toHaveBeenCalledWith({
      targetUid: 'u1', newEmail: 'fixed@gmail.com', admin: adminCtx,
    })
    expect(json.data).toEqual({ challengeId: 'c1', sentTo: 'guard@example.com' })
  })

  it('rejects a request step without an email', async () => {
    const res = await call({ step: 'request' })
    expect(res.status).toBe(400)
    expect(mockRequestEmailChange).not.toHaveBeenCalled()
  })

  it('rejects a confirm step missing the challenge id or code', async () => {
    expect((await call({ step: 'confirm', code: '123456' })).status).toBe(400)
    expect((await call({ step: 'confirm', challengeId: 'c1' })).status).toBe(400)
    expect(mockConfirmEmailChange).not.toHaveBeenCalled()
  })

  it('applies the change on a valid confirm step', async () => {
    const res = await call({ step: 'confirm', challengeId: 'c1', code: '123456' })
    const json = await res.json()

    expect(mockConfirmEmailChange).toHaveBeenCalledWith({
      challengeId: 'c1', code: '123456', admin: adminCtx,
    })
    expect(json.data.newEmail).toBe('fixed@gmail.com')
  })

  it('passes the underlying failure status through', async () => {
    mockConfirmEmailChange.mockResolvedValue({ ok: false, error: 'קוד שגוי', status: 400 })
    const res = await call({ step: 'confirm', challengeId: 'c1', code: '000000' })

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('קוד שגוי')
  })

  it('targets the user id from the route, not the body', async () => {
    await call({ step: 'request', email: 'fixed@gmail.com', targetUid: 'someone-else' }, 'u9')
    expect(mockRequestEmailChange).toHaveBeenCalledWith(expect.objectContaining({ targetUid: 'u9' }))
  })
})
