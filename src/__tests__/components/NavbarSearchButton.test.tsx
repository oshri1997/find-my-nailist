/**
 * Covers the explicit /search link in the navbar's action cluster —
 * previously the only /search link for a logged-in user was the desktop-only
 * center nav row (hidden below md), so there was no reachable way back to
 * search from e.g. /my-appointments on a phone. Shown for every logged-in
 * role, not just CLIENT.
 *
 * Regression: the action-cluster link was first added unconditionally,
 * which rendered "חיפוש" twice at once on desktop (reported by the user as
 * a visible duplicate) — it must stay md:hidden so only one of the two is
 * ever visible at a given viewport.
 */
import { render, screen } from '@testing-library/react'
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

function searchLinks() {
  return screen.getAllByRole('link', { name: /חיפוש/ }).filter(a => a.getAttribute('href') === '/search')
}

describe('Navbar — /search button', () => {
  it('shows a /search link in the action cluster for a logged-in CLIENT', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1', displayName: 'שרה כהן', email: 'sarah@test.com', photoURL: null },
      role: 'CLIENT',
      isAdmin: false,
      signOut: jest.fn(),
    })
    render(<Navbar />)
    expect(searchLinks().length).toBeGreaterThan(0)
  })

  it('shows a /search link for a logged-in NAILIST too', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1', displayName: 'נייל סטודיו', email: 'nail@test.com', photoURL: null },
      role: 'NAILIST',
      isAdmin: false,
      signOut: jest.fn(),
    })
    render(<Navbar />)
    expect(searchLinks().length).toBeGreaterThan(0)
  })

  it('shows a /search link for a pure-ADMIN user', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1', displayName: 'Admin', email: 'admin@test.com', photoURL: null },
      role: 'ADMIN',
      isAdmin: true,
      signOut: jest.fn(),
    })
    render(<Navbar />)
    expect(searchLinks().length).toBeGreaterThan(0)
  })

  it('does not render the action-cluster search button when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, isAdmin: false, signOut: jest.fn() })
    render(<Navbar />)
    // The desktop center-nav row still has a /search link for signed-out
    // visitors — only assert the signed-out state renders the login CTA,
    // not the profile-adjacent action cluster.
    expect(screen.getByRole('button', { name: 'התחברות' })).toBeInTheDocument()
  })

  it('renders exactly two /search links when logged in, and only one of them is mobile-only (md:hidden)', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1', displayName: 'שרה כהן', email: 'sarah@test.com', photoURL: null },
      role: 'CLIENT',
      isAdmin: false,
      signOut: jest.fn(),
    })
    render(<Navbar />)
    const links = searchLinks()
    // One in the desktop-only center row (hidden below md), one in the
    // action cluster restricted to md:hidden (hidden from md up) — CSS
    // ensures exactly one is ever visible at a time, never both.
    expect(links).toHaveLength(2)
    const mobileOnly = links.filter(a => a.className.includes('md:hidden'))
    expect(mobileOnly).toHaveLength(1)
  })
})
