/**
 * Covers the custom /reset-password confirmation page — it replaces
 * Firebase's default hosted reset UI (which only enforces a 6-character
 * minimum) so the reset flow enforces the same 8-character minimum as
 * signup.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ResetPasswordPage from '@/app/(auth)/reset-password/page'

let mockSearchParams = new URLSearchParams('oobCode=valid-code')
jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}))

const mockVerifyResetCode = jest.fn()
const mockConfirmReset = jest.fn()
jest.mock('@/lib/firebase/auth-helpers', () => ({
  verifyResetCode: (...args: unknown[]) => mockVerifyResetCode(...args),
  confirmReset: (...args: unknown[]) => mockConfirmReset(...args),
}))

beforeEach(() => {
  jest.clearAllMocks()
  mockSearchParams = new URLSearchParams('oobCode=valid-code')
  mockVerifyResetCode.mockResolvedValue('user@example.com')
  mockConfirmReset.mockResolvedValue(undefined)
})

const passwordInput = () => document.getElementById('password') as HTMLInputElement
const confirmInput = () => document.getElementById('confirmPassword') as HTMLInputElement

describe('Reset password page — link validation', () => {
  it('shows an invalid-link message when there is no oobCode in the URL', async () => {
    mockSearchParams = new URLSearchParams()
    render(<ResetPasswordPage />)
    expect(await screen.findByText('הקישור לא תקין')).toBeInTheDocument()
    expect(mockVerifyResetCode).not.toHaveBeenCalled()
  })

  it('shows a friendly error when the code is expired or already used', async () => {
    mockVerifyResetCode.mockRejectedValue({ code: 'auth/expired-action-code' })
    render(<ResetPasswordPage />)
    expect(await screen.findByText('הקישור לא תקין')).toBeInTheDocument()
    expect(screen.getByText('הקישור פג תוקף — בקשי קישור חדש')).toBeInTheDocument()
  })

  it('renders the new-password form once the code verifies', async () => {
    render(<ResetPasswordPage />)
    await waitFor(() => expect(mockVerifyResetCode).toHaveBeenCalledWith('valid-code'))
    expect(await screen.findByText('איפוס סיסמה')).toBeInTheDocument()
  })
})

describe('Reset password page — 8-character minimum, matching signup', () => {
  it('rejects a password shorter than 8 characters without calling confirmReset', async () => {
    render(<ResetPasswordPage />)
    await screen.findByText('איפוס סיסמה')

    fireEvent.change(passwordInput(), { target: { value: 'short1' } })
    fireEvent.change(confirmInput(), { target: { value: 'short1' } })
    fireEvent.click(screen.getByRole('button', { name: 'עדכני סיסמה' }))

    expect(screen.getByText('הסיסמה חייבת להכיל לפחות 8 תווים')).toBeInTheDocument()
    expect(mockConfirmReset).not.toHaveBeenCalled()
  })

  it('rejects mismatched confirmation without calling confirmReset', async () => {
    render(<ResetPasswordPage />)
    await screen.findByText('איפוס סיסמה')

    fireEvent.change(passwordInput(), { target: { value: 'password123' } })
    fireEvent.change(confirmInput(), { target: { value: 'password124' } })
    fireEvent.click(screen.getByRole('button', { name: 'עדכני סיסמה' }))

    expect(screen.getByText('הסיסמאות אינן תואמות')).toBeInTheDocument()
    expect(mockConfirmReset).not.toHaveBeenCalled()
  })

  it('accepts an 8-character password and confirms the reset', async () => {
    render(<ResetPasswordPage />)
    await screen.findByText('איפוס סיסמה')

    fireEvent.change(passwordInput(), { target: { value: 'password123' } })
    fireEvent.change(confirmInput(), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'עדכני סיסמה' }))

    await waitFor(() => expect(mockConfirmReset).toHaveBeenCalledWith('valid-code', 'password123'))
    expect(await screen.findByText('הסיסמה עודכנה!')).toBeInTheDocument()
  })

  it('shows a friendly error and stays on the form when confirmReset fails', async () => {
    mockConfirmReset.mockRejectedValue({ code: 'auth/weak-password' })
    render(<ResetPasswordPage />)
    await screen.findByText('איפוס סיסמה')

    fireEvent.change(passwordInput(), { target: { value: 'password123' } })
    fireEvent.change(confirmInput(), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'עדכני סיסמה' }))

    expect(await screen.findByText('הסיסמה חלשה מדי — לפחות 8 תווים')).toBeInTheDocument()
    expect(screen.queryByText('הסיסמה עודכנה!')).not.toBeInTheDocument()
  })
})
