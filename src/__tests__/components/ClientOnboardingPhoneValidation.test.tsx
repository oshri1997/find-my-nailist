/**
 * Regression: the phone step accepted any non-empty string (including
 * obvious garbage like a 34-digit paste), so an invalid number sailed
 * through to the final submit, where the server rejected it with a generic
 * "שגיאה בשמירה" that appeared to blame whatever field the visitor touched
 * last (usually address) instead of the actual problem. Validating inline
 * at the phone step itself prevents that entirely.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import ClientOnboardingPage from '@/app/onboarding/client/page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}))

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { uid: 'client-user-1' }, loading: false }),
}))

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: null }) } as Response)
})

function advanceToPhoneStep() {
  render(<ClientOnboardingPage />)
  fireEvent.change(screen.getByPlaceholderText('שרה'), { target: { value: 'שרה' } })
  fireEvent.change(screen.getByPlaceholderText('כהן'), { target: { value: 'כהן' } })
  fireEvent.click(screen.getByText('המשיכי'))
}

describe('Client onboarding — phone step validation', () => {
  it('disables המשיכי and shows no error before anything is typed', () => {
    advanceToPhoneStep()
    expect(screen.getByText('המשיכי').closest('button')).toBeDisabled()
    expect(screen.queryByText('מספר טלפון אינו תקין')).not.toBeInTheDocument()
  })

  it('rejects a long string of garbage digits instead of accepting it', () => {
    advanceToPhoneStep()
    fireEvent.change(screen.getByPlaceholderText('050-1234567'), {
      target: { value: '1232131231231231231231231231231231' },
    })

    expect(screen.getByText('מספר טלפון אינו תקין')).toBeInTheDocument()
    expect(screen.getByText('המשיכי').closest('button')).toBeDisabled()
  })

  it('rejects a too-short number', () => {
    advanceToPhoneStep()
    fireEvent.change(screen.getByPlaceholderText('050-1234567'), { target: { value: '123456' } })

    expect(screen.getByText('מספר טלפון אינו תקין')).toBeInTheDocument()
    expect(screen.getByText('המשיכי').closest('button')).toBeDisabled()
  })

  it('accepts a real Israeli mobile number and enables continue with no error', () => {
    advanceToPhoneStep()
    fireEvent.change(screen.getByPlaceholderText('050-1234567'), { target: { value: '050-1234567' } })

    expect(screen.queryByText('מספר טלפון אינו תקין')).not.toBeInTheDocument()
    expect(screen.getByText('המשיכי').closest('button')).not.toBeDisabled()
  })
})
