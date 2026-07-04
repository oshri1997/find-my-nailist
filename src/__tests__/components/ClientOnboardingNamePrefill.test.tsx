/**
 * Covers skipping the client onboarding wizard's name step when
 * firstName/lastName were already collected at registration (the
 * email/password signup form now asks for them directly — see
 * login/page.tsx). Google sign-in never collects them, so the step still
 * shows in that case.
 */
import { render, screen, waitFor } from '@testing-library/react'
import ClientOnboardingPage from '@/app/onboarding/client/page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}))

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { uid: 'client-user-1' }, loading: false }),
}))

jest.mock('@/components/ui/places-input', () => ({
  PlacesInput: () => <div>mock-places-input</div>,
}))

beforeEach(() => {
  jest.clearAllMocks()
})

describe('Client onboarding — skips the name step when already collected', () => {
  it('jumps straight to the phone step when the profile already has firstName/lastName', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'profile-1', firstName: 'שרה', lastName: 'לוי' } }),
    } as Response)

    render(<ClientOnboardingPage />)

    await waitFor(() => {
      expect(screen.getByText('מה מספר הטלפון שלך?')).toBeInTheDocument()
    })
    expect(screen.queryByText('מה השם שלך?')).not.toBeInTheDocument()
  })

  it('still shows the name step when the profile has no name yet (e.g. Google sign-in)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'profile-1' } }),
    } as Response)

    render(<ClientOnboardingPage />)

    await waitFor(() => {
      expect(screen.getByText('מה השם שלך?')).toBeInTheDocument()
    })
  })

  it('still shows the name step when the profile fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false } as Response)

    render(<ClientOnboardingPage />)

    await waitFor(() => {
      expect(screen.getByText('מה השם שלך?')).toBeInTheDocument()
    })
  })
})
