import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VerifyEmailModal } from '@/components/auth/VerifyEmailModal'

const mockUser = { email: 'user@example.com' } as import('firebase/auth').User

beforeEach(() => {
  jest.clearAllMocks()
})

describe('VerifyEmailModal — resend button', () => {
  it('calls the custom /api/auth/verify-email endpoint, not the Firebase client SDK', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as Response)
    render(<VerifyEmailModal user={mockUser} onClose={jest.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'שליחה מחדש' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/verify-email', { method: 'POST' })
    })
    expect(await screen.findByText('נשלח!')).toBeInTheDocument()
  })

  it('shows an error message when the request fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) } as Response)
    render(<VerifyEmailModal user={mockUser} onClose={jest.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'שליחה מחדש' }))

    expect(await screen.findByText('שגיאה בשליחת המייל — נסי שוב בעוד כמה דקות')).toBeInTheDocument()
  })

  it('shows the server-provided rate-limit message and disables the button until the cooldown ends', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'ניתן לשלוח שוב רק בעוד 10 דקות', retryAfterSeconds: 600 }),
    } as Response)
    render(<VerifyEmailModal user={mockUser} onClose={jest.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'שליחה מחדש' }))

    // Shown once, in red, as the error message — the button itself stays
    // disabled with its normal label rather than repeating the same text.
    expect(await screen.findByText('ניתן לשלוח שוב רק בעוד 10 דקות')).toBeInTheDocument()
    const button = await screen.findByRole('button', { name: 'שליחה מחדש' })
    expect(button).toBeDisabled()
  })
})
