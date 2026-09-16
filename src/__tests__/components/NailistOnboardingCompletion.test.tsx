/**
 * Regression test for a bug where finishing the nailist onboarding wizard
 * bounced the user straight back into onboarding: saveWorkingHours() PATCHes
 * onboardingCompleted:true to Firestore but never refreshed AuthProvider's
 * own (stale, pre-onboarding) context — so OnboardingGuard, still seeing
 * onboardingCompleted:false, redirected the very next page load back to
 * /onboarding. Fixed by calling refreshRole() before navigating away.
 */
import { render, screen, waitFor, fireEvent } from '@/__tests__/utils/render'
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
let profilePatchOk = true
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
  profilePatchOk = true
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
      return Promise.resolve({ ok: profilePatchOk, json: async () => ({ message: 'ok' }) } as Response)
    }
    if (url === '/api/working-hours' && opts?.method === 'PUT') {
      return Promise.resolve({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
})

async function advanceToSocialLinksStep() {
  render(<OnboardingPage />)

  // Step 0 — address
  await waitFor(() => expect(screen.getByText('mock-select-address')).toBeInTheDocument())
  fireEvent.click(screen.getByText('mock-select-address'))
  await waitFor(() => expect(screen.getByText('המשיכי')).toBeInTheDocument())
  fireEvent.click(screen.getByText('המשיכי'))

  // Step 1 — phone, skip
  await waitFor(() => expect(screen.getByRole('heading', { name: 'מספר טלפון' })).toBeInTheDocument())
  fireEvent.click(screen.getByText('דלגי לעת עתה'))

  // Step 2 — profile photo, skip
  await waitFor(() => expect(screen.getByText('דלגי לעת עתה')).toBeInTheDocument())
  fireEvent.click(screen.getByText('דלגי לעת עתה'))

  // Step 3 — portfolio photos, upload 3
  await waitFor(() => expect(screen.getByText('תמונות של העבודות שלך')).toBeInTheDocument())
  const fileInput = document.querySelector('input[type="file"][multiple]') as HTMLInputElement
  const files = [1, 2, 3].map(n => new File(['bytes'], `p${n}.jpg`, { type: 'image/jpeg' }))
  fireEvent.change(fileInput, { target: { files } })
  await waitFor(() => expect(screen.getByText('המשיכי')).not.toBeDisabled())
  fireEvent.click(screen.getByText('המשיכי'))

  // Step 4 — services, add one
  await waitFor(() => expect(screen.getByText('מה השירותים שלך?')).toBeInTheDocument())
  fireEvent.change(screen.getByLabelText('שם השירות'), { target: { value: 'פדיקור קוסמטי' } })
  fireEvent.change(screen.getByPlaceholderText('150'), { target: { value: '100' } })
  fireEvent.click(screen.getByText('הוסיפי שירות'))
  await waitFor(() => expect(screen.getByText('המשיכי')).not.toBeDisabled())
  fireEvent.click(screen.getByText('המשיכי'))

  // Step 5 — social links
  await waitFor(() => expect(screen.getByText('רשתות חברתיות')).toBeInTheDocument())
}

function profilePatchRequests() {
  return (global.fetch as jest.Mock).mock.calls.filter(([url, options]) =>
    url === '/api/nailists/nailist-1' && (options as RequestInit | undefined)?.method === 'PATCH'
  )
}

function socialPatchRequests() {
  return profilePatchRequests().filter(([, options]) => {
    const body = JSON.parse((options as RequestInit).body as string) as Record<string, unknown>
    return 'instagramUrl' in body || 'tiktokUrl' in body
  })
}

it('skips blank social links without a PATCH and saves the default holiday setting on completion', async () => {
  await advanceToSocialLinksStep()
  expect(screen.getByText('אופציונלי — הוסיפי קישורים כדי שלקוחות יוכלו למצוא אותך גם ברשתות החברתיות.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'דלגי לעת עתה' })).toBeInTheDocument()
  expect(socialPatchRequests()).toHaveLength(0)
  fireEvent.click(screen.getByRole('button', { name: 'דלגי לעת עתה' }))

  // Step 6 — working hours, finish
  await waitFor(() => expect(screen.getByText('סיימתי!')).toBeInTheDocument())
  expect(socialPatchRequests()).toHaveLength(0)
  fireEvent.click(screen.getByText('סיימתי!'))

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/dashboard/nailist'))
  expect(mockRefreshRole).toHaveBeenCalled()
  expect(profilePatchRequests()).toContainEqual([
    '/api/nailists/nailist-1',
    expect.objectContaining({
      body: JSON.stringify({ isActive: true, onboardingCompleted: true, autoCloseHolidays: true }),
    }),
  ])

  const refreshOrder = mockRefreshRole.mock.invocationCallOrder[0]
  const replaceOrder = mockReplace.mock.invocationCallOrder[
    mockReplace.mock.calls.findIndex(c => c[0] === '/dashboard/nailist')
  ]
  expect(refreshOrder).toBeLessThan(replaceOrder)
})

it('changes the social CTA to continue and persists a filled social link', async () => {
  await advanceToSocialLinksStep()

  fireEvent.change(screen.getByPlaceholderText('https://instagram.com/youraccount'), {
    target: { value: ' https://instagram.com/nailist ' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'המשיכי' }))

  await waitFor(() => expect(screen.getByText('סיימתי!')).toBeInTheDocument())
  expect(socialPatchRequests()).toContainEqual([
    '/api/nailists/nailist-1',
    expect.objectContaining({ body: JSON.stringify({ instagramUrl: 'https://instagram.com/nailist' }) }),
  ])
})

it('keeps onboarding open when the profile completion PATCH fails', async () => {
  await advanceToSocialLinksStep()
  fireEvent.click(screen.getByRole('button', { name: 'דלגי לעת עתה' }))
  await waitFor(() => expect(screen.getByText('סיימתי!')).toBeInTheDocument())

  profilePatchOk = false
  fireEvent.click(screen.getByText('סיימתי!'))

  await waitFor(() => expect(screen.getByText('שגיאה בשמירת שעות עבודה — נסי שוב')).toBeInTheDocument())
  expect(screen.getByText('סיימתי!')).toBeInTheDocument()
  expect(mockRefreshRole).not.toHaveBeenCalled()
  expect(mockReplace).not.toHaveBeenCalled()
})
