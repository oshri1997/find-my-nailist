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

  it('prefers the app-resolved displayName over the raw Firebase Auth displayName from the sign-in provider', () => {
    // Regression: a client who signed in with Google (whose account happens
    // to have an unrelated nickname/handle as its Google profile name) but
    // entered her real name during onboarding should see her real name here,
    // not the Google-provided one.
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1', displayName: 'DrakAtos YT', email: 'drakatosyt@gmail.com', photoURL: null },
      role: 'CLIENT',
      isAdmin: false,
      displayName: 'ישראלה ישראלית',
      signOut: jest.fn(),
    })
    render(<Navbar />)

    expect(screen.getByText('ישראלה')).toBeInTheDocument()
    expect(screen.queryByText('DrakAtos')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('ישראלה'))
    expect(screen.getByText('ישראלה ישראלית')).toBeInTheDocument()
  })
})
