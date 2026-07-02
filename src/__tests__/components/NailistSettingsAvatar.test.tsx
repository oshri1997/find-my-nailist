/**
 * Covers the new "change profile picture" option on the nailist settings page.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import NailistSettingsPage from '@/app/dashboard/nailist/settings/page'

const uploadProfilePhotoMock = jest.fn()
jest.mock('@/lib/firebase/storage', () => ({
  uploadProfilePhoto: (...args: unknown[]) => uploadProfilePhotoMock(...args),
}))

const baseProfile = {
  id: 'nailist-1',
  businessName: 'סטודיו יופי',
  bio: '',
  city: 'תל אביב',
  address: '',
  phoneNumber: '',
  whatsappPhone: '',
  instagramUrl: '',
  tiktokUrl: '',
  isActive: true,
  photoUrl: null as string | null,
}

function mockFetch(profile: typeof baseProfile) {
  global.fetch = jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (url.includes('/api/me/nailist-profile')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: profile }) } as Response)
    }
    if (url.includes('/api/nailists/') && opts?.method === 'PATCH') {
      return Promise.resolve({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('NailistSettingsPage — profile picture upload', () => {
  it('shows initials placeholder when no photoUrl is set', async () => {
    mockFetch(baseProfile)
    render(<NailistSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('הגדרות פרופיל')).toBeInTheDocument()
    })
    expect(screen.getByText('סי')).toBeInTheDocument() // initials of סטודיו יופי (first letter of each word)
  })

  it('uploads a new photo and PATCHes photoUrl immediately (not gated on the main save button)', async () => {
    mockFetch(baseProfile)
    uploadProfilePhotoMock.mockResolvedValue({ url: 'https://example.com/new-avatar.jpg', storageKey: 'avatars/nailist-1/profile.jpg' })
    const { container } = render(<NailistSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('הגדרות פרופיל')).toBeInTheDocument()
    })

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['fake-image-bytes'], 'avatar.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(uploadProfilePhotoMock).toHaveBeenCalledWith('nailist-1', file)
    })

    await waitFor(() => {
      const patchCall = (global.fetch as jest.Mock).mock.calls.find(
        ([url, opts]: [string, RequestInit]) => url === '/api/nailists/nailist-1' && opts?.method === 'PATCH'
      )
      expect(patchCall).toBeDefined()
      expect(JSON.parse(patchCall[1].body as string)).toEqual({ photoUrl: 'https://example.com/new-avatar.jpg' })
    })
  })

  it('shows an error and does not crash when the file is too large', async () => {
    mockFetch(baseProfile)
    const { container } = render(<NailistSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('הגדרות פרופיל')).toBeInTheDocument()
    })

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [bigFile] } })

    await waitFor(() => {
      expect(screen.getByText('הקובץ גדול מדי — מקסימום 5MB')).toBeInTheDocument()
    })
    expect(uploadProfilePhotoMock).not.toHaveBeenCalled()
  })
})
