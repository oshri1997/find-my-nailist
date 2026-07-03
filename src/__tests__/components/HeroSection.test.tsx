/**
 * Covers the "אני נייליסטית" hero button — it used to only special-case an
 * already-logged-in nailist (send to dashboard); a logged-in client fell
 * through to /login?tab=register and just bounced back with an "already
 * registered" error after a real navigation. Now it shows that message
 * inline instead.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { HeroSection } from '@/components/home/hero-section'

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const mockUseAuth = jest.fn()
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}))

beforeEach(() => {
  jest.clearAllMocks()
})

describe('HeroSection — "אני נייליסטית" button', () => {
  it('navigates to /login?tab=register when logged out', () => {
    mockUseAuth.mockReturnValue({ user: null, role: null })
    render(<HeroSection />)

    fireEvent.click(screen.getByText('אני נייליסטית →'))
    expect(pushMock).toHaveBeenCalledWith('/login?tab=register')
  })

  it('navigates straight to the dashboard for a logged-in nailist', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, role: 'NAILIST' })
    render(<HeroSection />)

    fireEvent.click(screen.getByText('אני נייליסטית →'))
    expect(pushMock).toHaveBeenCalledWith('/dashboard/nailist')
  })

  it('shows the already-registered modal for a logged-in client instead of navigating', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, role: 'CLIENT' })
    render(<HeroSection />)

    fireEvent.click(screen.getByText('אני נייליסטית →'))

    expect(pushMock).not.toHaveBeenCalledWith('/login?tab=register')
    expect(screen.getByText('את כבר רשומה כלקוחה!')).toBeInTheDocument()
  })
})
