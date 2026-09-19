import { render, screen, waitFor } from '@testing-library/react'
import AdminLayout from '@/app/admin/layout'

const replace = jest.fn()
let authState: { user: { email: string } | null; loading: boolean; isAdmin: boolean }

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/feedback',
  useRouter: () => ({ replace, back: jest.fn() }),
}))

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ ...authState, signOut: jest.fn() }),
}))

describe('AdminLayout', () => {
  beforeEach(() => {
    replace.mockReset()
    authState = { user: { email: 'admin@nailistiot.fun' }, loading: false, isAdmin: true }
  })

  it('exposes the feedback workspace in the authenticated admin navigation', () => {
    render(<AdminLayout><div>תוכן</div></AdminLayout>)
    const feedbackLinks = screen.getAllByRole('link', { name: 'פניות' })
    expect(feedbackLinks).not.toHaveLength(0)
    expect(feedbackLinks[0]).toHaveAttribute('href', '/admin/feedback')
  })

  it('renders no loader of its own while the account is still resolving', () => {
    authState = { user: null, loading: true, isAdmin: false }
    const { container } = render(<AdminLayout><div>תוכן מוגן</div></AdminLayout>)

    // AuthProvider's global layer already covers this wait — a second
    // animation here is the "two spinners" bug.
    expect(container.querySelector('[data-testid="nail-polish-brush"]')).not.toBeInTheDocument()
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument()
    expect(screen.queryByText('תוכן מוגן')).not.toBeInTheDocument()
  })

  it('keeps protected admin content hidden and redirects non-admin visitors', async () => {
    authState = { user: { email: 'client@nailistiot.fun' }, loading: false, isAdmin: false }
    render(<AdminLayout><div>תוכן מוגן</div></AdminLayout>)
    expect(screen.queryByText('תוכן מוגן')).not.toBeInTheDocument()
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'))
  })
})
