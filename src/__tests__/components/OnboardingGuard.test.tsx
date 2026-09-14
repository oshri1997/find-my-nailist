import { render } from '@testing-library/react'
import { OnboardingGuard } from '@/components/auth/onboarding-guard'

const mockReplace = jest.fn()
let mockPathname = '/'
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => mockPathname,
}))

const mockUseAuth = jest.fn()
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}))

beforeEach(() => {
  jest.clearAllMocks()
  mockPathname = '/'
})

describe('OnboardingGuard', () => {
  it('does nothing while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: { emailVerified: true }, role: 'NAILIST', onboardingCompleted: false, loading: true })
    render(<OnboardingGuard />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does nothing when there is no signed-in role yet', () => {
    mockUseAuth.mockReturnValue({ user: { emailVerified: true }, role: null, onboardingCompleted: false, loading: false })
    mockPathname = '/search'
    render(<OnboardingGuard />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('redirects an incomplete-onboarding client away from an arbitrary page', () => {
    mockUseAuth.mockReturnValue({ user: { emailVerified: true }, role: 'CLIENT', onboardingCompleted: false, loading: false })
    mockPathname = '/search'
    render(<OnboardingGuard />)
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/client')
  })

  it('does nothing for a fully-onboarded client', () => {
    mockUseAuth.mockReturnValue({ user: { emailVerified: true }, role: 'CLIENT', onboardingCompleted: true, loading: false })
    mockPathname = '/search'
    render(<OnboardingGuard />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does not redirect a client away from /onboarding/client itself', () => {
    mockUseAuth.mockReturnValue({ user: { emailVerified: true }, role: 'CLIENT', onboardingCompleted: false, loading: false })
    mockPathname = '/onboarding/client'
    render(<OnboardingGuard />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does nothing for a fully-onboarded nailist', () => {
    mockUseAuth.mockReturnValue({ user: { emailVerified: true }, role: 'NAILIST', onboardingCompleted: true, loading: false })
    mockPathname = '/dashboard/nailist/services'
    render(<OnboardingGuard />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('redirects an incomplete-onboarding nailist away from an arbitrary page', () => {
    mockUseAuth.mockReturnValue({ user: { emailVerified: true }, role: 'NAILIST', onboardingCompleted: false, loading: false })
    mockPathname = '/dashboard/nailist'
    render(<OnboardingGuard />)
    expect(mockReplace).toHaveBeenCalledWith('/onboarding')
  })

  it('does not redirect away from /onboarding itself', () => {
    mockUseAuth.mockReturnValue({ user: { emailVerified: true }, role: 'NAILIST', onboardingCompleted: false, loading: false })
    mockPathname = '/onboarding'
    render(<OnboardingGuard />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does not redirect away from /accessibility (footer link must stay usable mid-onboarding)', () => {
    // Regression: /accessibility was missing from the allow-list even though
    // the footer groups it with /terms and /privacy, which were allowed.
    mockUseAuth.mockReturnValue({ user: { emailVerified: true }, role: 'NAILIST', onboardingCompleted: false, loading: false })
    mockPathname = '/accessibility'
    render(<OnboardingGuard />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does not redirect away from /how-it-works', () => {
    mockUseAuth.mockReturnValue({ user: { emailVerified: true }, role: 'NAILIST', onboardingCompleted: false, loading: false })
    mockPathname = '/how-it-works'
    render(<OnboardingGuard />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does not redirect away from /login', () => {
    mockUseAuth.mockReturnValue({ user: { emailVerified: true }, role: 'NAILIST', onboardingCompleted: false, loading: false })
    mockPathname = '/login'
    render(<OnboardingGuard />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('never redirects an ADMIN, even with onboardingCompleted: false, since admins skip onboarding entirely', () => {
    mockUseAuth.mockReturnValue({ user: { emailVerified: true }, role: 'ADMIN', onboardingCompleted: false, loading: false })
    mockPathname = '/admin/users'
    render(<OnboardingGuard />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('redirects an unverified user to email verification before onboarding', () => {
    mockUseAuth.mockReturnValue({ user: { emailVerified: false }, role: 'CLIENT', onboardingCompleted: false, loading: false })
    mockPathname = '/onboarding/client'
    render(<OnboardingGuard />)
    expect(mockReplace).toHaveBeenCalledWith('/verify-email')
  })
})
