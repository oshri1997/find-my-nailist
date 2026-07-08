/**
 * The dashboard greeting ("שלום, X") should prefer the app-resolved
 * displayName (her real entered name) over the raw Firebase Auth
 * displayName, which is whatever her sign-in provider has on file — same
 * fix as the navbar (see NavbarDisplayName.test.tsx).
 */
import { render, screen, waitFor } from '@testing-library/react'
import NailistDashboard from '@/app/dashboard/nailist/page'

const mockUseAuth = jest.fn()
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}))

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: null }) } as Response)
})

describe('NailistDashboard — greeting displayName precedence', () => {
  it('greets with the resolved displayName instead of the raw Firebase Auth one', async () => {
    mockUseAuth.mockReturnValue({
      user: { displayName: 'DrakAtos YT', email: 'drakatosyt@gmail.com' },
      displayName: 'ישראלה ישראלית',
    })
    render(<NailistDashboard />)
    await waitFor(() => expect(screen.getByText('שלום, ישראלה')).toBeInTheDocument())
  })

  it('falls back to the Firebase Auth displayName when no resolved name is available', async () => {
    mockUseAuth.mockReturnValue({
      user: { displayName: 'Oshri Test', email: 'oshri@test.com' },
      displayName: null,
    })
    render(<NailistDashboard />)
    await waitFor(() => expect(screen.getByText('שלום, Oshri')).toBeInTheDocument())
  })
})
