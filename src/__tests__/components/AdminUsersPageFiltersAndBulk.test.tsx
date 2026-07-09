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

  it('surfaces partial bulk-action failures instead of silently dropping them', async () => {
    // Regression: runBulkAction used to read only data.succeeded — a partial
    // failure (some users suspended, one blocked server-side) looked
    // identical to full success, with zero indication anything went wrong.
    global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.startsWith('/api/admin/users/bulk')) {
        const body = JSON.parse((init?.body as string) ?? '{}')
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              succeeded: [body.userIds[0]],
              failed: [{ id: body.userIds[1], error: 'משתמש מוגן' }],
            },
          }),
        } as Response)
      }
      if (url.startsWith('/api/admin/users')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: baseUsers }) } as Response)
      }
      if (url.startsWith('/api/admin/stats')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: { totalUsers: 3 } }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
    })

    render(<AdminUsersPage />)
    await waitFor(() => expect(screen.getByText('alice@test.com')).toBeInTheDocument())

    fireEvent.click(screen.getByLabelText('בחר הכל'))
    const bulkBarLabel = await screen.findByText('2 נבחרו')
    const bulkBar = bulkBarLabel.closest('div') as HTMLElement
    fireEvent.click(within(bulkBar).getByRole('button', { name: /השעה/ }))
    fireEvent.click(screen.getByRole('button', { name: 'אישור' }))

    expect(await screen.findByText(/נכשלה עבור 1 משתמשים/)).toBeInTheDocument()
    expect(screen.getByText(/bob@test\.com.*משתמש מוגן/)).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('סגירה'))
    expect(screen.queryByText(/נכשלה עבור/)).not.toBeInTheDocument()
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

describe('AdminUsersPage — revoke admin access', () => {
  function mockFetchWithAdmins(admins: Array<Record<string, unknown>>) {
    global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH' && /\/api\/admin\/users\/[^/]+$/.test(url)) {
        lastRolePatchBody = JSON.parse((init?.body as string) ?? '{}')
        return Promise.resolve({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
      }
      if (url.startsWith('/api/admin/users')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: admins }) } as Response)
      }
      if (url.startsWith('/api/admin/stats')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: { totalUsers: admins.length } }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
    })
  }

  beforeEach(() => {
    lastRolePatchBody = null
  })

  it('shows a revoke button on another admin\'s row and demotes to CLIENT on confirm', async () => {
    mockFetchWithAdmins([
      { id: 'a2', email: 'other-admin@test.com', displayName: 'Other Admin', photoUrl: null, role: 'ADMIN', isAdmin: true, suspended: false, createdAt: null, onboardingCompleted: true },
    ])
    render(<AdminUsersPage />)
    await waitFor(() => expect(screen.getByText('other-admin@test.com')).toBeInTheDocument())

    const row = screen.getByText('other-admin@test.com').closest('tr') as HTMLElement
    fireEvent.click(within(row).getByTitle('הסר הרשאות אדמין'))

    expect(await screen.findByText('הסרת הרשאות אדמין')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'הסר הרשאות' }))

    await waitFor(() => {
      expect(lastRolePatchBody).toEqual({ role: 'CLIENT' })
    })
  })

  it('does not show a revoke button on the signed-in admin\'s own row (useAuth mock uid: admin-1)', async () => {
    mockFetchWithAdmins([
      { id: 'admin-1', email: 'self-admin@test.com', displayName: 'Self', photoUrl: null, role: 'ADMIN', isAdmin: true, suspended: false, createdAt: null, onboardingCompleted: true },
    ])
    render(<AdminUsersPage />)
    await waitFor(() => expect(screen.getByText('self-admin@test.com')).toBeInTheDocument())

    const row = screen.getByText('self-admin@test.com').closest('tr') as HTMLElement
    expect(within(row).queryByTitle('הסר הרשאות אדמין')).not.toBeInTheDocument()
  })

  it('surfaces the server error in the confirm modal instead of silently failing (e.g. last-admin protection)', async () => {
    global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH' && /\/api\/admin\/users\/[^/]+$/.test(url)) {
        return Promise.resolve({ ok: false, json: async () => ({ error: 'לא ניתן להסיר את האדמין האחרון במערכת' }) } as Response)
      }
      if (url.startsWith('/api/admin/users')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [{ id: 'a2', email: 'last-admin@test.com', displayName: 'Last Admin', photoUrl: null, role: 'ADMIN', isAdmin: true, suspended: false, createdAt: null, onboardingCompleted: true }],
          }),
        } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
    })

    render(<AdminUsersPage />)
    await waitFor(() => expect(screen.getByText('last-admin@test.com')).toBeInTheDocument())

    const row = screen.getByText('last-admin@test.com').closest('tr') as HTMLElement
    fireEvent.click(within(row).getByTitle('הסר הרשאות אדמין'))
    fireEvent.click(await screen.findByRole('button', { name: 'הסר הרשאות' }))

    expect(await screen.findByText('לא ניתן להסיר את האדמין האחרון במערכת')).toBeInTheDocument()
    // Modal stays open on failure so the admin can see the error, not silently close.
    expect(screen.getByText('הסרת הרשאות אדמין')).toBeInTheDocument()
  })
})
