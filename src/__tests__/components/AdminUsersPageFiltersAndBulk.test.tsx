import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import AdminUsersPage from '@/app/admin/users/page'

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { uid: 'admin-1' }, refreshRole: jest.fn() }),
}))

const baseUsers = [
  { id: 'u1', email: 'alice@test.com', displayName: 'Alice', photoUrl: null, role: 'CLIENT', isAdmin: false, suspended: false, createdAt: null, onboardingCompleted: true },
  { id: 'u2', email: 'bob@test.com', displayName: 'Bob', photoUrl: null, role: 'NAILIST', isAdmin: false, suspended: true, createdAt: null, onboardingCompleted: false },
  { id: 'admin-1', email: 'admin@test.com', displayName: 'Admin', photoUrl: null, role: 'NAILIST', isAdmin: true, suspended: false, createdAt: null, onboardingCompleted: true },
]

let lastUsersUrl = ''

let lastRolePatchBody: unknown = null

function mockFetch() {
  global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url.startsWith('/api/admin/users/bulk')) {
      const body = JSON.parse((init?.body as string) ?? '{}')
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: { succeeded: body.userIds, failed: [] } }),
      } as Response)
    }
    if (init?.method === 'PATCH' && /\/api\/admin\/users\/[^/]+$/.test(url)) {
      lastRolePatchBody = JSON.parse((init?.body as string) ?? '{}')
      return Promise.resolve({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
    }
    if (url.startsWith('/api/admin/users')) {
      lastUsersUrl = url
      return Promise.resolve({ ok: true, json: async () => ({ data: baseUsers }) } as Response)
    }
    if (url.startsWith('/api/admin/stats')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: { totalUsers: 3 } }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
  })
}

describe('AdminUsersPage — filters', () => {
  beforeEach(() => {
    lastUsersUrl = ''
    mockFetch()
  })

  it('renders suspended/active status badges', async () => {
    render(<AdminUsersPage />)
    await waitFor(() => expect(screen.getByText('alice@test.com')).toBeInTheDocument())
    expect(screen.getAllByText('פעיל').length).toBeGreaterThan(0)
    expect(screen.getByText('מושעה')).toBeInTheDocument()
  })

  it('re-fetches with a role query param when the role filter changes', async () => {
    render(<AdminUsersPage />)
    await waitFor(() => expect(screen.getByText('alice@test.com')).toBeInTheDocument())

    const roleSelect = screen.getAllByRole('combobox')[0]
    fireEvent.change(roleSelect, { target: { value: 'NAILIST' } })

    await waitFor(() => {
      expect(lastUsersUrl).toContain('role=NAILIST')
    })
  })
})

describe('AdminUsersPage — bulk actions', () => {
  beforeEach(() => {
    lastUsersUrl = ''
    mockFetch()
  })

  it('does not allow selecting the admin row (checkbox disabled)', async () => {
    render(<AdminUsersPage />)
    await waitFor(() => expect(screen.getByText('admin@test.com')).toBeInTheDocument())
    const adminCheckbox = screen.getByLabelText('בחר את admin@test.com')
    expect(adminCheckbox).toBeDisabled()
  })

  it('shows the bulk action bar once a row is selected, and suspends on confirm', async () => {
    render(<AdminUsersPage />)
    await waitFor(() => expect(screen.getByText('alice@test.com')).toBeInTheDocument())

    fireEvent.click(screen.getByLabelText('בחר את alice@test.com'))
    const bulkBarLabel = await screen.findByText('1 נבחרו')
    const bulkBar = bulkBarLabel.closest('div') as HTMLElement

    fireEvent.click(within(bulkBar).getByRole('button', { name: /השעה/ }))
    fireEvent.click(screen.getByRole('button', { name: 'אישור' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/users/bulk',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ action: 'suspend', userIds: ['u1'] }),
        })
      )
    })
  })

  it('select-all only selects non-admin rows', async () => {
    render(<AdminUsersPage />)
    await waitFor(() => expect(screen.getByText('alice@test.com')).toBeInTheDocument())

    fireEvent.click(screen.getByLabelText('בחר הכל'))
    expect(await screen.findByText('2 נבחרו')).toBeInTheDocument()
  })
})

describe('AdminUsersPage — convert to admin-only', () => {
  beforeEach(() => {
    lastUsersUrl = ''
    lastRolePatchBody = null
    mockFetch()
  })

  it('promotes a user to ADMIN after confirming the modal', async () => {
    render(<AdminUsersPage />)
    await waitFor(() => expect(screen.getByText('alice@test.com')).toBeInTheDocument())

    const aliceRow = screen.getByText('alice@test.com').closest('tr') as HTMLElement
    fireEvent.click(within(aliceRow).getByTitle('הפוך לאדמין בלבד'))

    expect(await screen.findByText('הפיכה לאדמין בלבד')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'אישור' }))

    await waitFor(() => {
      expect(lastRolePatchBody).toEqual({ role: 'ADMIN' })
    })
  })

  it('renders a pure-ADMIN row with a static badge and no role-toggle buttons', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.startsWith('/api/admin/users/bulk')) return Promise.resolve({ ok: true, json: async () => ({ data: { succeeded: [], failed: [] } }) } as Response)
      if (url.startsWith('/api/admin/users')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [{ id: 'a1', email: 'pureadmin@test.com', displayName: 'Pure Admin', photoUrl: null, role: 'ADMIN', isAdmin: true, suspended: false, createdAt: null, onboardingCompleted: true }],
          }),
        } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
    })

    render(<AdminUsersPage />)
    await waitFor(() => expect(screen.getByText('pureadmin@test.com')).toBeInTheDocument())

    const row = screen.getByText('pureadmin@test.com').closest('tr') as HTMLElement
    expect(within(row).getByText('אדמין בלבד')).toBeInTheDocument()
    expect(within(row).queryByText('נייליסטית')).not.toBeInTheDocument()
    expect(within(row).queryByText('לקוח')).not.toBeInTheDocument()
  })
})
