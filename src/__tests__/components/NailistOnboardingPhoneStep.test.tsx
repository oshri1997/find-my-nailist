import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import OnboardingPage from '@/app/onboarding/page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}))

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { uid: 'nailist-user-1' }, loading: false, refreshRole: jest.fn() }),
}))

jest.mock('@/components/ui/places-input', () => ({
  PlacesInput: ({ onPlaceSelect }: { onPlaceSelect: (result: { address: string; city: string; lat: number; lng: number }) => void }) => (
    <button onClick={() => onPlaceSelect({ address: 'הרצל 1', city: 'תל אביב', lat: 32.08, lng: 34.78 })}>
      mock-select-address
    </button>
  ),
}))

const phonePatch = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  phonePatch.mockResolvedValue({ ok: true, json: async () => ({ message: 'ok' }) })
  global.fetch = jest.fn().mockImplementation((url: string, options?: RequestInit) => {
    if (url.includes('/api/me/nailist-profile')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: { id: 'nailist-1' } }) } as Response)
    }
    if (url === '/api/nailists/nailist-1' && options?.method === 'PATCH') return phonePatch(url, options)
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
})

async function advanceToPhoneStep() {
  render(<OnboardingPage />)
  await waitFor(() => expect(screen.getByText('mock-select-address')).toBeInTheDocument())
  fireEvent.click(screen.getByText('mock-select-address'))
  fireEvent.click(screen.getByText('המשיכי'))
  await waitFor(() => expect(screen.getByRole('heading', { name: 'מספר טלפון' })).toBeInTheDocument())
}

describe('Nailist onboarding — optional phone step', () => {
  it('saves a trimmed valid Israeli phone number before advancing', async () => {
    await advanceToPhoneStep()
    fireEvent.change(screen.getByRole('textbox', { name: 'מספר טלפון' }), { target: { value: ' 050-1234567 ' } })
    fireEvent.click(screen.getByRole('button', { name: 'המשיכי' }))

    await waitFor(() => expect(phonePatch).toHaveBeenCalledWith(
      '/api/nailists/nailist-1',
      expect.objectContaining({ body: JSON.stringify({ phoneNumber: '050-1234567' }) })
    ))
    await waitFor(() => expect(screen.getByText('תמונת פרופיל')).toBeInTheDocument())
  })

  it('keeps invalid phone number on this step, but allows skipping without a phone PATCH', async () => {
    await advanceToPhoneStep()
    phonePatch.mockClear()
    fireEvent.change(screen.getByRole('textbox', { name: 'מספר טלפון' }), { target: { value: '123' } })

    expect(screen.getByText('מספר טלפון אינו תקין')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'המשיכי' })).toBeDisabled()

    fireEvent.click(screen.getByText('דלגי לעת עתה'))
    await waitFor(() => expect(screen.getByText('תמונת פרופיל')).toBeInTheDocument())
    expect(phonePatch).not.toHaveBeenCalled()
  })

  it('shows a persistence error and does not advance when phone saving fails', async () => {
    await advanceToPhoneStep()
    phonePatch.mockResolvedValueOnce({ ok: false })
    fireEvent.change(screen.getByRole('textbox', { name: 'מספר טלפון' }), { target: { value: '0501234567' } })
    fireEvent.click(screen.getByRole('button', { name: 'המשיכי' }))

    await waitFor(() => expect(screen.getByText('שגיאה בשמירת מספר הטלפון — נסי שוב')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'מספר טלפון' })).toBeInTheDocument()
    expect(screen.queryByText('תמונת פרופיל')).not.toBeInTheDocument()
  })
})
