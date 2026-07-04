/**
 * Covers the password-visibility toggle (eye icon) added to the login/register
 * password field.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import LoginPage from '@/app/(auth)/login/page'

const mockPush = jest.fn()
const mockReplace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(),
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

beforeEach(() => {
  jest.clearAllMocks()
})

// framer-motion's AnimatePresence remounts the form's DOM nodes across
// certain re-renders in jsdom (unlike a real browser), so a node reference
// captured before an interaction can go stale — always re-query fresh.
const passwordInput = () => document.getElementById('password') as HTMLInputElement

describe('Login page — password visibility toggle', () => {
  it('renders the password field masked by default', () => {
    render(<LoginPage />)
    expect(passwordInput().type).toBe('password')
  })

  it('reveals the password as plain text when the eye button is clicked', () => {
    render(<LoginPage />)
    fireEvent.change(passwordInput(), { target: { value: 'secret123' } })

    fireEvent.click(screen.getByRole('button', { name: 'הציגי סיסמה' }))

    expect(passwordInput().type).toBe('text')
    expect(passwordInput().value).toBe('secret123')
  })

  it('masks the password again when clicked a second time', () => {
    render(<LoginPage />)
    const toggle = () => screen.getByRole('button', { name: /סיסמה/ })
    fireEvent.click(toggle())
    fireEvent.click(toggle())

    expect(passwordInput().type).toBe('password')
  })
})
