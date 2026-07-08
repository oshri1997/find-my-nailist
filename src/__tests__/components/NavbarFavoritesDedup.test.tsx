/**
 * Regression: "מועדפות" used to render both as a standalone action-cluster
 * button (CLIENT only) and as "המועדפות שלי" inside the profile dropdown —
 * both pointing at /my-favorites, visibly duplicated at once (reported by
 * the user). Now it only lives in the dropdown.
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

describe('Navbar — favorites link dedup', () => {
  it('renders exactly one /my-favorites link for a logged-in CLIENT (inside the dropdown)', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1', displayName: 'שרה כהן', email: 'sarah@test.com', photoURL: null },
      role: 'CLIENT',
      isAdmin: false,
      signOut: jest.fn(),
    })
    render(<Navbar />)

    // Before opening the dropdown, no /my-favorites link should be present
    // as a standalone action-cluster button.
    expect(screen.queryAllByRole('link').filter(a => a.getAttribute('href') === '/my-favorites')).toHaveLength(0)

    fireEvent.click(screen.getByText('שרה'))
    const favoritesLinks = screen.getAllByRole('link').filter(a => a.getAttribute('href') === '/my-favorites')
    expect(favoritesLinks).toHaveLength(1)
    expect(favoritesLinks[0]).toHaveTextContent('המועדפות שלי')
  })

  it('still shows the "התורים שלי" action-cluster button for CLIENT', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1', displayName: 'שרה כהן', email: 'sarah@test.com', photoURL: null },
      role: 'CLIENT',
      isAdmin: false,
      signOut: jest.fn(),
    })
    render(<Navbar />)
    expect(screen.getByText('התורים שלי')).toBeInTheDocument()
  })
})
