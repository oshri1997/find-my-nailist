/**
 * DashboardLayout's redirect-to-login effect used to check only `user`,
 * never `loading` — safe only because AuthProvider used to hide all of
 * `children` (this layout included) behind a spinner until `loading`
 * resolved, so the effect never even mounted with a stale `user === null`.
 * Now that AuthProvider always renders children immediately, this layout
 * mounts while auth state is still resolving, and `user` is `null` during
 * that window too — so the effect must check `loading` itself, or it would
 * bounce a genuinely logged-in nailist to /login on every page load.
 */
import { render, waitFor } from '@testing-library/react'
import DashboardLayout from '@/app/dashboard/layout'

const mockReplace = jest.fn()
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  usePathname: () => '/dashboard/nailist',
}))

const mockUseAuth = jest.fn()
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('@/components/layout/email-verification-banner', () => ({
  EmailVerificationBanner: () => null,
}))

jest.mock('@/components/feedback/FeedbackLauncher', () => ({
  FeedbackLauncher: () => <button type="button">עזרה ומשוב</button>,
}))

jest.mock('@/components/theme-toggle', () => ({ ThemeToggle: () => null }))

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ role: 'NAILIST' }) } as Response)
})

describe('DashboardLayout — auth gate', () => {
  it('does not redirect to /login while auth state is still loading, even though user is null', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true, isAdmin: false, displayName: null, signOut: jest.fn() })
    render(<DashboardLayout>child</DashboardLayout>)

    // Give any effect a tick to (incorrectly) fire.
    await new Promise((r) => setTimeout(r, 10))
    expect(mockReplace).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('redirects to /login once loading has finished and there is still no user', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, isAdmin: false, displayName: null, signOut: jest.fn() })
    render(<DashboardLayout>child</DashboardLayout>)

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'))
  })

  it('fetches the role (does not redirect) once loading has finished and a user is present', async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'nailist-1' }, loading: false, isAdmin: false, displayName: 'שרה', signOut: jest.fn(),
    })
    render(<DashboardLayout>child</DashboardLayout>)

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/me/role', expect.anything()))
    expect(mockReplace).not.toHaveBeenCalledWith('/login')
  })

  it('exposes the feedback entry from the nailist dashboard once access is granted', async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'nailist-1' }, loading: false, isAdmin: false, displayName: 'שרה', signOut: jest.fn(),
    })
    const { getByText } = render(<DashboardLayout>child</DashboardLayout>)

    await waitFor(() => expect(getByText('עזרה ומשוב')).toBeInTheDocument())
  })
})
