import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EmailVerificationBanner } from '@/components/layout/email-verification-banner'

const mockUseAuth = jest.fn()
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}))

beforeEach(() => {
  jest.clearAllMocks()
})

describe('EmailVerificationBanner', () => {
  it('renders nothing for a signed-out visitor', () => {
    mockUseAuth.mockReturnValue({ user: null })
    const { container } = render(<EmailVerificationBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for an already-verified user', () => {
    mockUseAuth.mockReturnValue({ user: { emailVerified: true } })
    const { container } = render(<EmailVerificationBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the verification prompt for an unverified signed-in user', () => {
    mockUseAuth.mockReturnValue({ user: { emailVerified: false } })
    render(<EmailVerificationBanner />)
    expect(screen.getByText('כדי להזמין תור צריך קודם לאשר את ההרשמה במייל.')).toBeInTheDocument()
  })

  it('resends the verification email and shows confirmation', async () => {
    mockUseAuth.mockReturnValue({ user: { emailVerified: false } })
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response)
    render(<EmailVerificationBanner />)

    fireEvent.click(screen.getByRole('button', { name: 'שליחה מחדש' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/verify-email', { method: 'POST' })
    })
    expect(await screen.findByText('נשלח!')).toBeInTheDocument()
  })
})
