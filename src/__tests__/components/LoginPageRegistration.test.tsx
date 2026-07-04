/**
 * Covers the simplified registration flow: no role picker at signup anymore
 * (removed in favor of first/last name fields) — nailist vs client is chosen
 * right after, at /onboarding/welcome, same as Google sign-in already did.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '@/app/(auth)/login/page'

const mockPush = jest.fn()
const mockReplace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => new URLSearchParams('tab=register'),
}))

const mockSignUpWithEmail = jest.fn()
jest.mock('@/lib/firebase/auth-helpers', () => ({
  signInWithEmail: jest.fn(),
  signInWithGoogle: jest.fn(),
  signUpWithEmail: (...args: unknown[]) => mockSignUpWithEmail(...args),
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
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: null }) } as Response)
  mockSignUpWithEmail.mockResolvedValue({
    user: { uid: 'new-uid', getIdToken: () => Promise.resolve('fake-token') },
  })
})

describe('Registration form — no role picker', () => {
  it('does not render a nailist/client role selector', () => {
    render(<LoginPage />)
    expect(screen.queryByText('נייליסטית', { exact: true })).not.toBeInTheDocument()
    expect(screen.queryByText('לקוחה', { exact: true })).not.toBeInTheDocument()
  })

  it('renders separate first name and last name fields instead of one combined name field', () => {
    render(<LoginPage />)
    expect(document.getElementById('firstName')).toBeInTheDocument()
    expect(document.getElementById('lastName')).toBeInTheDocument()
    expect(document.getElementById('name')).not.toBeInTheDocument()
  })

  it('shows a validation error when first or last name is missing', () => {
    render(<LoginPage />)
    fireEvent.change(document.getElementById('email')!, { target: { value: 'a@test.com' } })
    fireEvent.change(document.getElementById('password')!, { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'צרי חשבון' }))
    expect(screen.getByText('יש להזין שם פרטי ושם משפחה')).toBeInTheDocument()
    expect(mockSignUpWithEmail).not.toHaveBeenCalled()
  })

  it('signs up with the combined full name and sends firstName/lastName to /api/users with no role', async () => {
    render(<LoginPage />)
    fireEvent.change(document.getElementById('firstName')!, { target: { value: 'שרה' } })
    fireEvent.change(document.getElementById('lastName')!, { target: { value: 'לוי' } })
    fireEvent.change(document.getElementById('email')!, { target: { value: 'sarah@test.com' } })
    fireEvent.change(document.getElementById('password')!, { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'צרי חשבון' }))

    await waitFor(() => {
      expect(mockSignUpWithEmail).toHaveBeenCalledWith('sarah@test.com', 'password123', 'שרה לוי')
    })

    await waitFor(() => {
      const usersCall = (global.fetch as jest.Mock).mock.calls.find(
        ([url]: [string]) => url === '/api/users'
      )
      expect(usersCall).toBeDefined()
      const body = JSON.parse(usersCall[1].body)
      expect(body).toEqual(
        expect.objectContaining({
          uid: 'new-uid',
          email: 'sarah@test.com',
          displayName: 'שרה לוי',
          firstName: 'שרה',
          lastName: 'לוי',
        })
      )
      expect(body.role).toBeUndefined()
    })
  })

  it('redirects to /onboarding/welcome after successful registration, not a role-specific page', async () => {
    render(<LoginPage />)
    fireEvent.change(document.getElementById('firstName')!, { target: { value: 'שרה' } })
    fireEvent.change(document.getElementById('lastName')!, { target: { value: 'לוי' } })
    fireEvent.change(document.getElementById('email')!, { target: { value: 'sarah@test.com' } })
    fireEvent.change(document.getElementById('password')!, { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'צרי חשבון' }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/onboarding/welcome')
    })
  })
})
