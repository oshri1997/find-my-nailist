/**
 * Regression test for a bug where finishing the nailist onboarding wizard
 * bounced the user straight back into onboarding: saveWorkingHours() PATCHes
 * onboardingCompleted:true to Firestore but never refreshed AuthProvider's
 * own (stale, pre-onboarding) context — so OnboardingGuard, still seeing
 * onboardingCompleted:false, redirected the very next page load back to
 * /onboarding. Fixed by calling refreshRole() before navigating away.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import OnboardingPage from '@/app/onboarding/page'

const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}))

const mockRefreshRole = jest.fn()
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { uid: 'nailist-user-1' }, loading: false, refreshRole: mockRefreshRole }),
}))

jest.mock('@/components/ui/places-input', () => ({
  PlacesInput: ({ onPlaceSelect }: { onPlaceSelect: (r: { address: string; city: string; lat: number; lng: number }) => void }) => (
    <button onClick={() => onPlaceSelect({ address: 'הרצל 1', city: 'תל אביב', lat: 32.08, lng: 34.78 })}>
      mock-select-address
    </button>
  ),
}))

let photoCounter = 0
jest.mock('@/lib/firebase/storage', () => ({
  uploadProfilePhoto: jest.fn(),
  uploadPortfolioPhoto: jest.fn().mockImplementation(() => {
    photoCounter += 1
    return Promise.resolve({ url: `https://example.com/photo${photoCounter}.jpg`, storageKey: `portfolio/photo${photoCounter}.jpg` })
  }),
}))

beforeEach(() => {
  jest.clearAllMocks()
  photoCounter = 0
  let servicesAdded = 0
  global.fetch = jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (url.includes('/api/me/nailist-profile')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: { id: 'nailist-1' } }) } as Response)
    }
    if (url === '/api/portfolio') {
      servicesAdded += 1
      return Promise.resolve({ ok: true, json: async () => ({ data: { id: `photo-${servicesAdded}`, url: 'https://example.com/x.jpg' } }) } as Response)
    }
    if (url === '/api/services' && opts?.method === 'POST') {
      return Promise.resolve({ ok: true, json: async () => ({ data: { id: 'service-1', name: 'פדיקור קוסמטי', durationMinutes: 60, price: 100 } }) } as Response)
    }
    if (url.includes('/api/nailists/') && opts?.method === 'PATCH') {
      return Promise.resolve({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
    }
    if (url === '/api/working-hours' && opts?.method === 'PUT') {
      return Promise.resolve({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
})

it('calls refreshRole before navigating to the dashboard when the wizard finishes', async () => {
  render(<OnboardingPage />)

  // Step 0 — address
  await waitFor(() => expect(screen.getByText('mock-select-address')).toBeInTheDocument())
  fireEvent.click(screen.getByText('mock-select-address'))
  await waitFor(() => expect(screen.getByText('המשיכי')).toBeInTheDocument())
  fireEvent.click(screen.getByText('המשיכי'))

  // Step 1 — profile photo, skip
  await waitFor(() => expect(screen.getByText('דלגי לעת עתה')).toBeInTheDocument())
  fireEvent.click(screen.getByText('דלגי לעת עתה'))

  // Step 2 — portfolio photos, upload 3
  await waitFor(() => expect(screen.getByText('תמונות של העבודות שלך')).toBeInTheDocument())
  const fileInput = document.querySelector('input[type="file"][multiple]') as HTMLInputElement
  const files = [1, 2, 3].map(n => new File(['bytes'], `p${n}.jpg`, { type: 'image/jpeg' }))
  fireEvent.change(fileInput, { target: { files } })
  await waitFor(() => expect(screen.getByText('המשיכי')).not.toBeDisabled())
  fireEvent.click(screen.getByText('המשיכי'))

  // Step 3 — services, add one
  await waitFor(() => expect(screen.getByText('מה השירותים שלך?')).toBeInTheDocument())
  fireEvent.change(screen.getByLabelText('שם השירות'), { target: { value: 'פדיקור קוסמטי' } })
  fireEvent.change(screen.getByPlaceholderText('150'), { target: { value: '100' } })
  fireEvent.click(screen.getByText('הוסיפי שירות'))
  await waitFor(() => expect(screen.getByText('המשיכי')).not.toBeDisabled())
  fireEvent.click(screen.getByText('המשיכי'))

  // Step 4 — social links, skip
  await waitFor(() => expect(screen.getByText('רשתות חברתיות')).toBeInTheDocument())
  fireEvent.click(screen.getByText('המשיכי'))

  // Step 5 — working hours, finish
  await waitFor(() => expect(screen.getByText('סיימתי!')).toBeInTheDocument())
  fireEvent.click(screen.getByText('סיימתי!'))

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/dashboard/nailist'))
  expect(mockRefreshRole).toHaveBeenCalled()

  const refreshOrder = mockRefreshRole.mock.invocationCallOrder[0]
  const replaceOrder = mockReplace.mock.invocationCallOrder[
    mockReplace.mock.calls.findIndex(c => c[0] === '/dashboard/nailist')
  ]
  expect(refreshOrder).toBeLessThan(replaceOrder)
})
