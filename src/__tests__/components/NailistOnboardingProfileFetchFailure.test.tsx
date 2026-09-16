/**
 * Regression test for an e2e failure (e2e/onboarding.spec.ts — "clicking
 * נייליסטית calls set-role and redirects").
 *
 * /onboarding is reached straight after set-role, before the nailist profile
 * document exists, so GET /api/me/nailist-profile answers 404 until it does.
 * The original code read that response with `r.json()` and never noticed the
 * status, so a 404 simply left the page waiting. Routing the read through a
 * hook that rejects on a non-OK status made the same 404 look like a hard
 * failure, and the page bounced the signed-in nailist out to /login.
 *
 * Only a signed-out user may be redirected from this page.
 */
import { render, screen, waitFor } from '@/__tests__/utils/render'
import OnboardingPage from '@/app/onboarding/page'

const replaceMock = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: (...args: unknown[]) => replaceMock(...args), push: jest.fn() }),
}))

const mockUseAuth = jest.fn()
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('@/components/ui/places-input', () => ({
  PlacesInput: () => <button>mock-select-address</button>,
}))

function mockProfileResponse(response: Partial<Response> & { json: () => Promise<unknown> }) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (String(url).includes('/api/me/nailist-profile')) return Promise.resolve(response as Response)
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseAuth.mockReturnValue({ user: { uid: 'nailist-user-1' }, loading: false, refreshRole: jest.fn() })
})

describe('Nailist onboarding — profile read failures', () => {
  it('keeps a signed-in nailist on the page when the profile read 404s', async () => {
    mockProfileResponse({ ok: false, status: 404, json: async () => ({ error: 'not found' }) })

    render(<OnboardingPage />)

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    // Give any redirect effect a chance to run before asserting it did not.
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(replaceMock).not.toHaveBeenCalledWith('/login')
  })

  it('does not bounce to /login when the profile read fails outright', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/api/me/nailist-profile')) return Promise.reject(new Error('network down'))
      return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
    })

    render(<OnboardingPage />)

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(replaceMock).not.toHaveBeenCalledWith('/login')
  })

  it('still redirects a signed-out visitor to /login', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, refreshRole: jest.fn() })
    mockProfileResponse({ ok: true, json: async () => ({ data: null }) })

    render(<OnboardingPage />)

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/login'))
  })

  it('sends an already-onboarded nailist to her dashboard', async () => {
    mockProfileResponse({
      ok: true,
      json: async () => ({ data: { id: 'nailist-1', onboardingCompleted: true } }),
    })

    render(<OnboardingPage />)

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/dashboard/nailist'))
  })

  it('lets onboarding start once the profile exists', async () => {
    mockProfileResponse({ ok: true, json: async () => ({ data: { id: 'nailist-1' } }) })

    render(<OnboardingPage />)

    await waitFor(() => expect(screen.getByText('mock-select-address')).toBeInTheDocument())
    expect(replaceMock).not.toHaveBeenCalledWith('/login')
  })
})
