/**
 * Covers a mobile UX bug: after tapping "כניסה עם Google", the login form
 * stayed on screen — looking stuck/unresponsive — for the entire window
 * between the Google popup resolving and the post-sign-in redirect (Firebase
 * auth-state sync + the /api/users upsert + router.replace), with only the
 * Google button's disabled state as feedback. A full-screen loader should
 * replace the form for as long as `loading` is true.
 */
import { act, render, screen, fireEvent } from '@testing-library/react'
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

let mockAuthLoading = false
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: null, loading: mockAuthLoading }),
}))

jest.mock('@/components/auth/LegalModal', () => {
  return function MockLegalModal() {
    return null
  }
})

describe('Login page — Google sign-in loading state', () => {
  beforeEach(() => {
    mockAuthLoading = false
  })

  it('replaces the form with a full-screen loader while signing in with Google', () => {
    render(<LoginPage />)
    expect(document.getElementById('email')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /כניסה עם Google/ }))

    expect(document.getElementById('email')).not.toBeInTheDocument()
    expect(screen.getByText('מתחברת...')).toBeInTheDocument()
  })

  it('removes its loader when AuthProvider takes ownership of the loading screen', () => {
    const { rerender } = render(<LoginPage />)

    fireEvent.click(screen.getByRole('button', { name: /כניסה עם Google/ }))
    expect(screen.getByText('מתחברת...')).toBeInTheDocument()

    mockAuthLoading = true
    rerender(<LoginPage />)

    expect(document.getElementById('email')).not.toBeInTheDocument()
    expect(screen.queryByText('מתחברת...')).not.toBeInTheDocument()
  })
})

describe('Login page — closing the Google popup', () => {
  beforeEach(() => {
    mockAuthLoading = false
  })
  // signInWithPopup detects a manually-closed popup via its own slow
  // window.closed polling, so the mock here (like the one above) never
  // settles — this suite covers the faster path: this window regaining
  // focus (which happens the instant the popup closes) stands in for that,
  // rather than waiting out Firebase's real detection delay.
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns to the form shortly after this window regains focus, without waiting for the popup promise', () => {
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: /כניסה עם Google/ }))
    expect(screen.getByText('מתחברת...')).toBeInTheDocument()

    fireEvent.focus(window)
    // Not yet — this is a debounce against the window also regaining focus
    // on a *successful* sign-in (Firebase closes the popup itself there too).
    expect(screen.getByText('מתחברת...')).toBeInTheDocument()

    act(() => { jest.advanceTimersByTime(1000) })
    expect(document.getElementById('email')).toBeInTheDocument()
    expect(screen.queryByText('מתחברת...')).not.toBeInTheDocument()
  })

  it('does not show an error message from a cancelled popup — only a silent return to the form', () => {
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: /כניסה עם Google/ }))

    fireEvent.focus(window)
    act(() => { jest.advanceTimersByTime(1000) })

    expect(screen.queryByText('החלון נסגר לפני סיום ההתחברות')).not.toBeInTheDocument()
  })
})
