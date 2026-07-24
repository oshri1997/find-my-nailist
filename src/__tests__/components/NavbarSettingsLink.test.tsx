/**
 * Covers the "הגדרות חשבון" link added to the profile dropdown — it must
 * reach every logged-in user (client, nailist, admin), not just one role,
 * since /settings is the shared account-settings page.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { Navbar } from '@/components/layout/navbar'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
}))

const mockUseAuth = jest.fn()
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('@/components/theme-toggle', () => ({ ThemeToggle: () => null }))

describe.each([['CLIENT'], ['NAILIST']])('Navbar — settings link (%s)', (role) => {
  it('shows a settings link pointing at /settings', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1', displayName: 'שרה כהן', email: 'sarah@test.com', photoURL: null },
      role,
      isAdmin: false,
      signOut: jest.fn(),
    })
    render(<Navbar />)

    fireEvent.click(screen.getByText('שרה'))

    const link = screen.getByText('הגדרות חשבון').closest('a')!
    expect(link).toHaveAttribute('href', '/settings')
  })
})
