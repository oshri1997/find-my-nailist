/**
 * Regression test for a bug where finishing the client onboarding wizard
 * bounced the user straight back into onboarding: handleFinish() PATCHes
 * onboardingCompleted:true to Firestore but never refreshed AuthProvider's
 * own (stale, pre-onboarding) context — so OnboardingGuard, still seeing
 * onboardingCompleted:false, redirected the very next page load back to
 * /onboarding/client. Fixed by calling refreshRole() before navigating away.
 */
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import ClientOnboardingPage from '@/app/onboarding/client/page'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: mockPush }),
}))

const mockRefreshRole = jest.fn()
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { uid: 'client-user-1' }, loading: false, refreshRole: mockRefreshRole }),
}))

jest.mock('@/components/ui/places-input', () => ({
  PlacesInput: () => <div>mock-places-input</div>,
}))

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers({ advanceTimers: true })
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: null }) } as Response)
})

afterEach(() => {
  jest.useRealTimers()
})

it('calls refreshRole before navigating to /search when the wizard finishes', async () => {
  render(<ClientOnboardingPage />)

  fireEvent.change(screen.getByPlaceholderText('שרה'), { target: { value: 'שרה' } })
  fireEvent.change(screen.getByPlaceholderText('כהן'), { target: { value: 'כהן' } })
  fireEvent.click(screen.getByText('המשיכי'))

  await waitFor(() => expect(screen.getByPlaceholderText('050-1234567')).toBeInTheDocument())
  fireEvent.change(screen.getByPlaceholderText('050-1234567'), { target: { value: '0501234567' } })
  fireEvent.click(screen.getByText('המשיכי'))

  await waitFor(() => expect(screen.getByText('דלגי לעת עתה')).toBeInTheDocument())
  fireEvent.click(screen.getByText('דלגי לעת עתה'))

  await waitFor(() => expect(screen.getByText('איפה את גרה?')).toBeInTheDocument())
  fireEvent.click(screen.getByText('שמרי'))

  await waitFor(() => expect(mockRefreshRole).toHaveBeenCalled())

  act(() => { jest.advanceTimersByTime(1800) })
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/search'))
})
