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

function mockFetch() {
  global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url.startsWith('/api/admin/users/bulk')) {
      const body = JSON.parse((init?.body as string) ?? '{}')
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: { succeeded: body.userIds, failed: [] } }),
      } as Response)
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
