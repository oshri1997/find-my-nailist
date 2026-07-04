/**
 * Covers a bug where the profile dropdown showed only the first name (e.g.
 * "ישר" out of "ישר דקאטוס") instead of the full name — the compact nav
 * button truncated displayName to its first word, and that same truncated
 * value was reused inside the dropdown's header row, which has plenty of
 * room for the full name (same width as the email line right under it).
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

describe('Navbar — display name', () => {
  it('shows only the first name on the compact nav button, but the full name inside the dropdown', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1', displayName: 'ישר דקאטוס', email: 'drakatosyt@gmail.com', photoURL: null },
      role: 'CLIENT',
      isAdmin: false,
      signOut: jest.fn(),
    })
    render(<Navbar />)

    expect(screen.getByText('ישר')).toBeInTheDocument()
    expect(screen.queryByText('ישר דקאטוס')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('ישר'))

    expect(screen.getByText('ישר דקאטוס')).toBeInTheDocument()
  })

  it('falls back to the email prefix when there is no displayName', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1', displayName: null, email: 'sarah@test.com', photoURL: null },
      role: 'CLIENT',
      isAdmin: false,
      signOut: jest.fn(),
    })
    render(<Navbar />)

    fireEvent.click(screen.getAllByText('sarah')[0])
    expect(screen.getAllByText('sarah').length).toBeGreaterThan(0)
  })
})
