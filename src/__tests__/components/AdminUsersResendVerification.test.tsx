import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AdminUsersPage from '@/app/admin/users/page'

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { uid: 'admin-1' }, refreshRole: jest.fn() }),
}))

const users = [
  { id: 'u1', email: 'typo@test.com', displayName: 'Alice', photoUrl: null, role: 'CLIENT', isAdmin: false, suspended: false, createdAt: null, onboardingCompleted: true, emailDeliveryStatus: 'BOUNCED' },
  { id: 'admin-1', email: 'admin@test.com', displayName: 'Admin', photoUrl: null, role: 'NAILIST', isAdmin: true, suspended: false, createdAt: null, onboardingCompleted: true, emailDeliveryStatus: null },
]

let lastSendBody: unknown = null
let sendResponse: { ok: boolean; json: unknown }
let usersFetchCount = 0

function mockFetch() {
  global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url.startsWith('/api/admin/emails')) {
      lastSendBody = JSON.parse((init?.body as string) ?? '{}')
      return Promise.resolve({ ok: sendResponse.ok, json: async () => sendResponse.json } as Response)
    }
    if (url.startsWith('/api/admin/stats')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: { totalUsers: 2 } }) } as Response)
    }
    usersFetchCount += 1
    return Promise.resolve({ ok: true, json: async () => ({ data: users }) } as Response)
  })
}

async function clickResend() {
  const buttons = await screen.findAllByTitle('שלח מייל אימות נוסף')
  fireEvent.click(buttons[0])
}

describe('AdminUsersPage — proactive verification resend', () => {
  beforeEach(() => {
    lastSendBody = null
    usersFetchCount = 0
    sendResponse = { ok: true, json: { data: { sent: [{ id: 'u1', email: 'fixed@test.com' }], skipped: [], failed: [] } } }
    mockFetch()
  })

  it('offers the resend action on regular users but not on admin accounts', async () => {
    render(<AdminUsersPage />)
    await screen.findByText('typo@test.com')
    expect(screen.getAllByTitle('שלח מייל אימות נוסף')).toHaveLength(1)
  })

  it('sends a verification email for that one user and confirms the address used', async () => {
    render(<AdminUsersPage />)
    await clickResend()

    await waitFor(() => expect(lastSendBody).toEqual({ template: 'VERIFICATION', userIds: ['u1'] }))
    expect(await screen.findByText('מייל אימות נשלח אל fixed@test.com')).toBeInTheDocument()
  })

  it('reloads the list after a send so a corrected address is reflected', async () => {
    render(<AdminUsersPage />)
    await screen.findByText('typo@test.com')
    const before = usersFetchCount
    await clickResend()

    await waitFor(() => expect(usersFetchCount).toBeGreaterThan(before))
  })

  it('reports a skipped recipient instead of claiming the mail went out', async () => {
    sendResponse = {
      ok: true,
      json: { data: { sent: [], skipped: [{ id: 'u1', email: 'typo@test.com', reason: 'המייל כבר מאומת' }], failed: [] } },
    }
    render(<AdminUsersPage />)
    await clickResend()

    expect(await screen.findByText('typo@test.com: המייל כבר מאומת')).toBeInTheDocument()
    expect(screen.queryByText(/מייל אימות נשלח/)).not.toBeInTheDocument()
  })

  it('reports a failed send', async () => {
    sendResponse = {
      ok: true,
      json: { data: { sent: [], skipped: [], failed: [{ id: 'u1', email: 'typo@test.com', error: 'Resend error 429' }] } },
    }
    render(<AdminUsersPage />)
    await clickResend()

    expect(await screen.findByText('typo@test.com: Resend error 429')).toBeInTheDocument()
  })

  it('surfaces a rejected request', async () => {
    sendResponse = { ok: false, json: { error: 'אין הרשאה' } }
    render(<AdminUsersPage />)
    await clickResend()

    expect(await screen.findByText('אין הרשאה')).toBeInTheDocument()
  })
})
