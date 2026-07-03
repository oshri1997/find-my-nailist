/**
 * Covers JoinLink — wraps "הצטרפי" registration CTAs so an already-logged-in
 * visitor sees an inline "you're already registered" modal instead of being
 * sent through the whole /login?tab=register flow just to land on the same
 * message after a page navigation.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { JoinLink } from '@/components/auth/JoinLink'

const mockUseAuth = jest.fn()
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}))

beforeEach(() => {
  jest.clearAllMocks()
})

describe('JoinLink', () => {
  it('navigates normally to the register page when logged out', () => {
    mockUseAuth.mockReturnValue({ user: null, role: null })
    render(<JoinLink href="/login?tab=register">הצטרפי כנייליסטית</JoinLink>)

    const link = screen.getByText('הצטרפי כנייליסטית').closest('a')!
    expect(link).toHaveAttribute('href', '/login?tab=register')

    // No modal should appear even if somehow clicked while logged out
    fireEvent.click(link)
    expect(screen.queryByText(/כבר רשומה/)).not.toBeInTheDocument()
  })

  it('shows the already-registered modal instead of navigating when logged in as a nailist', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, role: 'NAILIST' })
    render(<JoinLink href="/login?tab=register">הצטרפי כנייליסטית</JoinLink>)

    fireEvent.click(screen.getByText('הצטרפי כנייליסטית'))

    expect(screen.getByText('את כבר רשומה כנייליסטית!')).toBeInTheDocument()
    const dashboardLink = screen.getByText('לדשבורד שלי').closest('a')!
    expect(dashboardLink).toHaveAttribute('href', '/dashboard/nailist')
  })

  it('shows the already-registered modal for a logged-in client, linking to search', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, role: 'CLIENT' })
    render(<JoinLink href="/login?tab=register">הרשמה חינמית</JoinLink>)

    fireEvent.click(screen.getByText('הרשמה חינמית'))

    expect(screen.getByText('את כבר רשומה כלקוחה!')).toBeInTheDocument()
    const searchLink = screen.getByText('לחיפוש נייליסטיות').closest('a')!
    expect(searchLink).toHaveAttribute('href', '/search')
  })

  it('closes the modal on "סגירה" without navigating', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, role: 'NAILIST' })
    render(<JoinLink href="/login?tab=register">הצטרפי כנייליסטית</JoinLink>)

    fireEvent.click(screen.getByText('הצטרפי כנייליסטית'))
    expect(screen.getByText(/כבר רשומה/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('סגירה'))
    expect(screen.queryByText(/כבר רשומה/)).not.toBeInTheDocument()
  })
})
