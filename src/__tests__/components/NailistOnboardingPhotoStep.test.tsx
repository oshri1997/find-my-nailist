/**
 * Covers the new "profile picture" step inserted into the nailist onboarding
 * wizard (between address and portfolio photos). The main regression risk
 * here is the step-index renumbering that came with the insertion.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import OnboardingPage from '@/app/onboarding/page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}))

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { uid: 'nailist-user-1' }, loading: false }),
}))

jest.mock('@/components/ui/places-input', () => ({
  PlacesInput: ({ onPlaceSelect }: { onPlaceSelect: (r: { address: string; city: string; lat: number; lng: number }) => void }) => (
    <button onClick={() => onPlaceSelect({ address: 'הרצל 1', city: 'תל אביב', lat: 32.08, lng: 34.78 })}>
      mock-select-address
    </button>
  ),
}))

const uploadProfilePhotoMock = jest.fn()
jest.mock('@/lib/firebase/storage', () => ({
  uploadProfilePhoto: (...args: unknown[]) => uploadProfilePhotoMock(...args),
  uploadPortfolioPhoto: jest.fn(),
}))

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (url.includes('/api/me/nailist-profile')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: { id: 'nailist-1' } }) } as Response)
    }
    if (url.includes('/api/nailists/') && opts?.method === 'PATCH') {
      return Promise.resolve({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
})

async function advanceToPhotoStep() {
  render(<OnboardingPage />)
  await waitFor(() => expect(screen.getByText('mock-select-address')).toBeInTheDocument())
  fireEvent.click(screen.getByText('mock-select-address'))
  await waitFor(() => expect(screen.getByText('המשיכי')).toBeInTheDocument())
  fireEvent.click(screen.getByText('המשיכי'))
}

describe('Nailist onboarding — profile picture step', () => {
  it('renders the profile picture step right after the address step, before portfolio photos', async () => {
    await advanceToPhotoStep()
    await waitFor(() => {
      expect(screen.getByText('תמונת פרופיל')).toBeInTheDocument()
    })
    expect(screen.queryByText('תמונות של העבודות שלך')).not.toBeInTheDocument()
  })

  it('can be skipped without uploading a photo, landing on the portfolio photos step', async () => {
    await advanceToPhotoStep()
    await waitFor(() => expect(screen.getByText('דלגי לעת עתה')).toBeInTheDocument())
    fireEvent.click(screen.getByText('דלגי לעת עתה'))

    await waitFor(() => {
      expect(screen.getByText('תמונות של העבודות שלך')).toBeInTheDocument()
    })
  })

  it('uploads a photo and advances to portfolio photos with "המשיכי"', async () => {
    uploadProfilePhotoMock.mockResolvedValue({ url: 'https://example.com/avatar.jpg', storageKey: 'avatars/nailist-1/profile.jpg' })
    await advanceToPhotoStep()
    await waitFor(() => expect(screen.getByText('תמונת פרופיל')).toBeInTheDocument())

    const fileInput = document.querySelector('input[type="file"][accept="image/*"]:not([multiple])') as HTMLInputElement
    const file = new File(['bytes'], 'avatar.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    // avatars/{userId}/ is keyed off the Firebase Auth uid, not the nailistProfiles doc id
    await waitFor(() => expect(uploadProfilePhotoMock).toHaveBeenCalledWith('nailist-user-1', file))
    await waitFor(() => expect(screen.getByText('המשיכי')).toBeInTheDocument())
    fireEvent.click(screen.getByText('המשיכי'))

    await waitFor(() => {
      expect(screen.getByText('תמונות של העבודות שלך')).toBeInTheDocument()
    })
  })

  it('going back from the photo step returns to the address step', async () => {
    await advanceToPhotoStep()
    await waitFor(() => expect(screen.getByText('חזרה')).toBeInTheDocument())
    fireEvent.click(screen.getByText('חזרה'))

    await waitFor(() => {
      expect(screen.getByText('איפה העסק שלך?')).toBeInTheDocument()
    })
  })
})
