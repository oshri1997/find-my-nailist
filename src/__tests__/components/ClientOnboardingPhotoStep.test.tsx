/**
 * Covers the new "profile picture" step inserted into the client onboarding
 * wizard (between phone and location). The main regression risk here is the
 * step-index renumbering that came with the insertion.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ClientOnboardingPage from '@/app/onboarding/client/page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}))

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { uid: 'client-user-1' }, loading: false }),
}))

jest.mock('@/components/ui/places-input', () => ({
  PlacesInput: () => <div>mock-places-input</div>,
}))

const uploadProfilePhotoMock = jest.fn()
jest.mock('@/lib/firebase/storage', () => ({
  uploadProfilePhoto: (...args: unknown[]) => uploadProfilePhotoMock(...args),
}))

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
})

async function advanceToPhotoStep() {
  render(<ClientOnboardingPage />)
  fireEvent.change(screen.getByPlaceholderText('שרה'), { target: { value: 'שרה' } })
  fireEvent.change(screen.getByPlaceholderText('כהן'), { target: { value: 'כהן' } })
  fireEvent.click(screen.getByText('המשיכי'))

  await waitFor(() => expect(screen.getByPlaceholderText('050-1234567')).toBeInTheDocument())
  fireEvent.change(screen.getByPlaceholderText('050-1234567'), { target: { value: '0501234567' } })
  fireEvent.click(screen.getByText('המשיכי'))
}

describe('Client onboarding — profile picture step', () => {
  it('renders the profile picture step right after the phone step, before location', async () => {
    await advanceToPhotoStep()
    await waitFor(() => {
      expect(screen.getByText('תמונת פרופיל')).toBeInTheDocument()
    })
    expect(screen.queryByText('איפה את גרה?')).not.toBeInTheDocument()
  })

  it('can be skipped without uploading a photo, landing on the location step', async () => {
    await advanceToPhotoStep()
    await waitFor(() => expect(screen.getByText('דלגי לעת עתה')).toBeInTheDocument())
    fireEvent.click(screen.getByText('דלגי לעת עתה'))

    await waitFor(() => {
      expect(screen.getByText('איפה את גרה?')).toBeInTheDocument()
    })
  })

  it('uploads a photo and advances to the location step with "המשיכי"', async () => {
    uploadProfilePhotoMock.mockResolvedValue({ url: 'https://example.com/avatar.jpg', storageKey: 'avatars/client-user-1/profile.jpg' })
    await advanceToPhotoStep()
    await waitFor(() => expect(screen.getByText('תמונת פרופיל')).toBeInTheDocument())

    const fileInput = document.getElementById('clientPhotoInput') as HTMLInputElement
    const file = new File(['bytes'], 'avatar.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => expect(uploadProfilePhotoMock).toHaveBeenCalledWith('client-user-1', file))
    await waitFor(() => expect(screen.getByText('המשיכי')).toBeInTheDocument())
    fireEvent.click(screen.getByText('המשיכי'))

    await waitFor(() => {
      expect(screen.getByText('איפה את גרה?')).toBeInTheDocument()
    })
  })

  it('going back from the photo step returns to the phone step', async () => {
    await advanceToPhotoStep()
    await waitFor(() => expect(screen.getByText('חזרה')).toBeInTheDocument())
    fireEvent.click(screen.getByText('חזרה'))

    await waitFor(() => {
      expect(screen.getByText('מה מספר הטלפון שלך?')).toBeInTheDocument()
    })
  })
})
