/**
 * Covers editing/deleting a service already added during the nailist
 * onboarding wizard's services step. Before this, the step could only add
 * services (POST /api/services) — there was no way to fix a typo or price,
 * or remove one, without finishing onboarding and going to dashboard
 * settings first.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import OnboardingPage from '@/app/onboarding/page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}))

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { uid: 'nailist-user-1' }, loading: false, refreshRole: jest.fn() }),
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

const mockPatch = jest.fn()
const mockDelete = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  photoCounter = 0
  let photosAdded = 0
  mockPatch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
  mockDelete.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })

  global.fetch = jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (url.includes('/api/me/nailist-profile')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: { id: 'nailist-1' } }) } as Response)
    }
    if (url === '/api/portfolio') {
      photosAdded += 1
      return Promise.resolve({ ok: true, json: async () => ({ data: { id: `photo-${photosAdded}`, url: 'https://example.com/x.jpg' } }) } as Response)
    }
    if (url === '/api/services' && opts?.method === 'POST') {
      return Promise.resolve({ ok: true, json: async () => ({ data: { id: 'service-1', name: 'פדיקור קוסמטי', durationMinutes: 60, price: 100 } }) } as Response)
    }
    if (url === '/api/services/service-1' && opts?.method === 'PATCH') {
      return mockPatch(url, opts)
    }
    if (url === '/api/services/service-1' && opts?.method === 'DELETE') {
      return mockDelete(url, opts)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
})

async function advanceToServicesStep() {
  render(<OnboardingPage />)
  await waitFor(() => expect(screen.getByText('mock-select-address')).toBeInTheDocument())
  fireEvent.click(screen.getByText('mock-select-address'))
  await waitFor(() => expect(screen.getByText('המשיכי')).toBeInTheDocument())
  fireEvent.click(screen.getByText('המשיכי'))

  await waitFor(() => expect(screen.getByText('דלגי לעת עתה')).toBeInTheDocument())
  fireEvent.click(screen.getByText('דלגי לעת עתה'))

  await waitFor(() => expect(screen.getByText('תמונות של העבודות שלך')).toBeInTheDocument())
  const fileInput = document.querySelector('input[type="file"][multiple]') as HTMLInputElement
  const files = [1, 2, 3].map(n => new File(['bytes'], `p${n}.jpg`, { type: 'image/jpeg' }))
  fireEvent.change(fileInput, { target: { files } })
  await waitFor(() => expect(screen.getByText('המשיכי')).not.toBeDisabled())
  fireEvent.click(screen.getByText('המשיכי'))

  await waitFor(() => expect(screen.getByText('מה השירותים שלך?')).toBeInTheDocument())
}

// The fixed service-name dropdown re-renders the same names as <option>
// text — scope name lookups to the added-service row so they don't also
// match the dropdown's own option list.
const serviceNameText = (name: string) => screen.getByText(name, { ignore: 'option' })
const queryServiceNameText = (name: string) => screen.queryByText(name, { ignore: 'option' })

async function addService() {
  fireEvent.change(screen.getByLabelText('שם השירות'), { target: { value: 'פדיקור קוסמטי' } })
  fireEvent.change(screen.getByPlaceholderText('150'), { target: { value: '100' } })
  fireEvent.click(screen.getByText('הוסיפי שירות'))
  await waitFor(() => expect(serviceNameText('פדיקור קוסמטי')).toBeInTheDocument())
}

describe('Nailist onboarding — editing/deleting an already-added service', () => {
  it('shows the full details (name, duration, price) right after adding — not a blank row', async () => {
    await advanceToServicesStep()
    await addService()
    expect(serviceNameText('פדיקור קוסמטי')).toBeInTheDocument()
    expect(screen.getByText('60 דק׳ · ₪100')).toBeInTheDocument()
  })

  it('offers only the fixed, curated list of service names — no free text', async () => {
    await advanceToServicesStep()
    const select = screen.getByLabelText('שם השירות') as HTMLSelectElement
    expect(select.tagName).toBe('SELECT')
    const optionLabels = Array.from(select.options).map((o) => o.value).filter(Boolean)
    expect(optionLabels).toEqual([
      "לק ג'ל מבנה אנטומי לציפורניים טבעיות",
      "מילוי בג'ל / בטיפסים הפוכים",
      "מיני פדיקור ג'ל",
      "פדיקור מלא ג'ל",
      'פדיקור קוסמטי',
      'בנייה חדשה',
    ])
  })

  it('clicking edit pre-fills the form and switches the button to "עדכני שירות"', async () => {
    await advanceToServicesStep()
    await addService()

    fireEvent.click(screen.getByTitle('עריכה'))

    expect(screen.getByText('עריכת שירות')).toBeInTheDocument()
    expect(screen.getByLabelText('שם השירות')).toHaveValue('פדיקור קוסמטי')
    expect(screen.getByPlaceholderText('150')).toHaveValue(100)
    expect(screen.getByText('עדכני שירות')).toBeInTheDocument()
  })

  it('saving an edit PATCHes the specific service and updates the row in place', async () => {
    await advanceToServicesStep()
    await addService()

    fireEvent.click(screen.getByTitle('עריכה'))
    fireEvent.change(screen.getByLabelText('שם השירות'), { target: { value: 'בנייה חדשה' } })
    fireEvent.change(screen.getByPlaceholderText('150'), { target: { value: '120' } })
    fireEvent.click(screen.getByText('עדכני שירות'))

    await waitFor(() => expect(mockPatch).toHaveBeenCalled())
    const [, opts] = mockPatch.mock.calls[0]
    expect(JSON.parse(opts.body)).toEqual(
      expect.objectContaining({ name: 'בנייה חדשה', price: 120 })
    )

    await waitFor(() => expect(serviceNameText('בנייה חדשה')).toBeInTheDocument())
    expect(screen.getByText('60 דק׳ · ₪120')).toBeInTheDocument()
    // form resets back to "add" mode
    expect(screen.getByText('הוספת שירות חדש')).toBeInTheDocument()
  })

  it('"ביטול עריכה" exits edit mode without saving', async () => {
    await advanceToServicesStep()
    await addService()

    fireEvent.click(screen.getByTitle('עריכה'))
    expect(screen.getByText('עריכת שירות')).toBeInTheDocument()
    fireEvent.click(screen.getByText('ביטול עריכה'))

    expect(screen.getByText('הוספת שירות חדש')).toBeInTheDocument()
    expect(mockPatch).not.toHaveBeenCalled()
  })

  it('deleting a service calls DELETE and removes it from the list', async () => {
    await advanceToServicesStep()
    await addService()

    fireEvent.click(screen.getByTitle('מחיקה'))

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('/api/services/service-1', expect.objectContaining({ method: 'DELETE' })))
    await waitFor(() => expect(queryServiceNameText('פדיקור קוסמטי')).not.toBeInTheDocument())
  })
})
