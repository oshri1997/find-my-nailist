import { render } from '@testing-library/react'
import { HomeRedirect } from '@/components/home/home-redirect'

const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

const mockUseAuth = jest.fn()
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}))

beforeEach(() => {
  jest.clearAllMocks()
})

describe('HomeRedirect', () => {
  it('does nothing while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, onboardingCompleted: true, loading: true })
    render(<HomeRedirect />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does nothing for a signed-out visitor', () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, onboardingCompleted: true, loading: false })
    render(<HomeRedirect />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('sends a fully-onboarded nailist straight to her dashboard', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, role: 'NAILIST', onboardingCompleted: true, loading: false })
    render(<HomeRedirect />)
    expect(mockReplace).toHaveBeenCalledWith('/dashboard/nailist')
  })

  it('sends an incomplete-onboarding nailist directly to /onboarding, not the dashboard first', () => {
    // Regression: previously always redirected to /dashboard/nailist, which
    // OnboardingGuard would then immediately bounce again to /onboarding —
    // a redundant, visible double-redirect for any nailist mid-onboarding.
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, role: 'NAILIST', onboardingCompleted: false, loading: false })
    render(<HomeRedirect />)
    expect(mockReplace).toHaveBeenCalledWith('/onboarding')
    expect(mockReplace).not.toHaveBeenCalledWith('/dashboard/nailist')
  })

  it('sends a fully-onboarded client to /search', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, role: 'CLIENT', onboardingCompleted: true, loading: false })
    render(<HomeRedirect />)
    expect(mockReplace).toHaveBeenCalledWith('/search')
  })

  it('sends an incomplete-onboarding client directly to /onboarding/client, not /search first', () => {
    // Same double-redirect concern as the nailist case above: /search would
    // just get bounced to /onboarding/client by OnboardingGuard anyway.
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, role: 'CLIENT', onboardingCompleted: false, loading: false })
    render(<HomeRedirect />)
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/client')
    expect(mockReplace).not.toHaveBeenCalledWith('/search')
  })
})
