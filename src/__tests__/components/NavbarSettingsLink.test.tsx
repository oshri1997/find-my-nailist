/**
 * /settings is the shared account-settings page, so every logged-in account
 * must have a route to it — but not the same route. A client reaches it from
 * the navbar's profile dropdown; a nailist has no dropdown (it duplicated her
 * dashboard sidebar, which carries the link instead), so her navbar shows only
 * an identity badge.
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

function signIn(role: string) {
  mockUseAuth.mockReturnValue({
    user: { uid: 'u1', displayName: 'שרה כהן', email: 'sarah@test.com', photoURL: null },
    role,
    isAdmin: false,
    signOut: jest.fn(),
  })
}

describe('Navbar — profile dropdown', () => {
  it('gives a client the dropdown, with a settings link pointing at /settings', () => {
    signIn('CLIENT')
    render(<Navbar />)

    const profileMenuButton = screen.getByRole('button', { name: 'תפריט החשבון של שרה' })
    expect(profileMenuButton).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(profileMenuButton)
    expect(screen.getByRole('button', { name: 'תפריט החשבון של שרה' })).toHaveAttribute('aria-expanded', 'true')

    expect(screen.getByText('הגדרות חשבון').closest('a')).toHaveAttribute('href', '/settings')
    expect(screen.getByText('יציאה מהחשבון')).toBeInTheDocument()
  })

  it('shows a nailist her name and photo without a dropdown', () => {
    signIn('NAILIST')
    render(<Navbar />)

    expect(screen.queryByRole('button', { name: 'תפריט החשבון של שרה' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.queryByText('הגדרות חשבון')).not.toBeInTheDocument()

    // The badge itself stays, plus the way back into her dashboard.
    expect(screen.getByText('שרה')).toBeInTheDocument()
    expect(screen.getByText('דשבורד').closest('a')).toHaveAttribute('href', '/dashboard/nailist')
  })
})
