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

const cropImageToSquareMock = jest.fn()
jest.mock('@/lib/image-crop', () => ({
  cropImageToSquare: (...args: unknown[]) => cropImageToSquareMock(...args),
}))

beforeEach(() => {
  jest.clearAllMocks()
  URL.createObjectURL = jest.fn().mockReturnValue('blob:preview')
  URL.revokeObjectURL = jest.fn()
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
    const croppedFile = new File(['cropped'], 'avatar.jpg', { type: 'image/jpeg' })
    cropImageToSquareMock.mockResolvedValue(croppedFile)
    uploadProfilePhotoMock.mockResolvedValue({ url: 'https://example.com/avatar.jpg', storageKey: 'avatars/nailist-1/profile.jpg' })
    await advanceToPhotoStep()
    await waitFor(() => expect(screen.getByText('תמונת פרופיל')).toBeInTheDocument())

    const fileInput = document.querySelector('input[type="file"][accept="image/*"]:not([multiple])') as HTMLInputElement
    const file = new File(['bytes'], 'avatar.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    // selecting a file only stages it for repositioning — nothing uploads yet
    await waitFor(() => expect(screen.getByText('אישור מיקום')).toBeInTheDocument())
    expect(uploadProfilePhotoMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('אישור מיקום'))

    // the staged file is cropped to the chosen position before upload
    await waitFor(() => expect(cropImageToSquareMock).toHaveBeenCalledWith(file, { x: 50, y: 50 }))
    // avatars/{userId}/ is keyed off the Firebase Auth uid, not the nailistProfiles doc id
    await waitFor(() => expect(uploadProfilePhotoMock).toHaveBeenCalledWith('nailist-user-1', croppedFile))
    await waitFor(() => expect(screen.getByText('המשיכי')).toBeInTheDocument())
    fireEvent.click(screen.getByText('המשיכי'))

    await waitFor(() => {
      expect(screen.getByText('תמונות של העבודות שלך')).toBeInTheDocument()
    })
  })

  it('shows a drag-to-reposition hint and confirm/cancel controls right after selecting a photo', async () => {
    await advanceToPhotoStep()
    await waitFor(() => expect(screen.getByText('תמונת פרופיל')).toBeInTheDocument())
    const fileInput = document.querySelector('input[type="file"][accept="image/*"]:not([multiple])') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [new File(['bytes'], 'avatar.jpg', { type: 'image/jpeg' })] } })

    await waitFor(() => expect(screen.getByText('גררי את התמונה כדי למרכז את הפנים')).toBeInTheDocument())
    expect(screen.getByText('ביטול')).toBeInTheDocument()
    expect(screen.getByText('אישור מיקום')).toBeInTheDocument()
  })

  it('"ביטול" discards the staged photo without uploading', async () => {
    await advanceToPhotoStep()
    await waitFor(() => expect(screen.getByText('תמונת פרופיל')).toBeInTheDocument())
    const fileInput = document.querySelector('input[type="file"][accept="image/*"]:not([multiple])') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [new File(['bytes'], 'avatar.jpg', { type: 'image/jpeg' })] } })
    await waitFor(() => expect(screen.getByText('ביטול')).toBeInTheDocument())

    fireEvent.click(screen.getByText('ביטול'))

    expect(screen.queryByText('גררי את התמונה כדי למרכז את הפנים')).not.toBeInTheDocument()
    expect(uploadProfilePhotoMock).not.toHaveBeenCalled()
    expect(cropImageToSquareMock).not.toHaveBeenCalled()
    // back to the picker placeholder — "דלגי" still works normally
    expect(screen.getByText('דלגי לעת עתה')).toBeInTheDocument()
  })

  it('the continue button is disabled while a photo is staged but not yet confirmed', async () => {
    await advanceToPhotoStep()
    await waitFor(() => expect(screen.getByText('תמונת פרופיל')).toBeInTheDocument())
    const fileInput = document.querySelector('input[type="file"][accept="image/*"]:not([multiple])') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [new File(['bytes'], 'avatar.jpg', { type: 'image/jpeg' })] } })

    await waitFor(() => expect(screen.getByText('אישור מיקום')).toBeInTheDocument())
    expect(screen.getByText('דלגי לעת עתה').closest('button')).toBeDisabled()
  })

  it('dragging the staged preview shifts its object-position away from center', async () => {
    await advanceToPhotoStep()
    await waitFor(() => expect(screen.getByText('תמונת פרופיל')).toBeInTheDocument())
    const fileInput = document.querySelector('input[type="file"][accept="image/*"]:not([multiple])') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [new File(['bytes'], 'avatar.jpg', { type: 'image/jpeg' })] } })
    await waitFor(() => expect(screen.getByText('גררי את התמונה כדי למרכז את הפנים')).toBeInTheDocument())

    const frame = screen.getByTestId('photo-drag-frame')
    const preview = frame.querySelector('img') as HTMLImageElement
    expect(preview.style.objectPosition).toBe('50% 50%')

    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100, toJSON() {},
    })
    // jsdom has no real PointerEvent constructor, so clientX/Y are dropped by
    // fireEvent.pointerDown/Move — dispatch MouseEvents typed as pointer
    // events instead, which jsdom fully supports including those fields.
    fireEvent(frame, new MouseEvent('pointerdown', { clientX: 50, clientY: 50, bubbles: true }))
    fireEvent(window, new MouseEvent('pointermove', { clientX: 50, clientY: 80, bubbles: true })) // dragged down 30px
    fireEvent(window, new MouseEvent('pointerup', { bubbles: true }))

    // dragging down reveals more of the top of the image — y offset decreases
    const freshPreview = screen.getByTestId('photo-drag-frame').querySelector('img') as HTMLImageElement
    expect(freshPreview.style.objectPosition).toBe('50% 20%')
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
