/**
 * Covers a mobile UX bug: after tapping "כניסה עם Google", the login form
 * stayed on screen — looking stuck/unresponsive — for the entire window
 * between the Google popup resolving and the post-sign-in redirect (Firebase
 * auth-state sync + the /api/users upsert + router.replace), with only the
 * Google button's disabled state as feedback. A full-screen loader should
 * replace the form for as long as `loading` is true.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import LoginPage from '@/app/(auth)/login/page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

// Never resolves — simulates the real window where `loading` stays true
// through the popup + the subsequent auth-state/redirect handling.
const mockSignInWithGoogle = jest.fn(() => new Promise(() => {}))
jest.mock('@/lib/firebase/auth-helpers', () => ({
  signInWithEmail: jest.fn(),
  signInWithGoogle: () => mockSignInWithGoogle(),
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

describe('Login page — Google sign-in loading state', () => {
  it('replaces the form with a full-screen loader while signing in with Google', () => {
    render(<LoginPage />)
    expect(document.getElementById('email')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /כניסה עם Google/ }))

    expect(document.getElementById('email')).not.toBeInTheDocument()
    expect(screen.getByText('מתחברת...')).toBeInTheDocument()
  })
})
