/**
 * Covers the login page's handling of ?suspended=1, set by auth-provider.tsx
 * when a signed-in session is force-logged-out because /api/auth/session
 * reported the account as suspended.
 */
import { render, screen } from '@testing-library/react'
import LoginPage from '@/app/(auth)/login/page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams('suspended=1'),
}))

jest.mock('@/lib/firebase/auth-helpers', () => ({
  signInWithEmail: jest.fn(),
  signInWithGoogle: jest.fn(),
  signUpWithEmail: jest.fn(),
}))

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: null, loading: false }),
}))

jest.mock('@/components/auth/LegalModal', () => {
  return function MockLegalModal() {
    return null
  }
})

describe('Login page — suspended account message', () => {
  it('shows "החשבון הושבת" when navigated to with ?suspended=1', () => {
    render(<LoginPage />)
    expect(screen.getByText('החשבון הושבת')).toBeInTheDocument()
  })
})
