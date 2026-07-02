/**
 * Covers the "תמונת כרטיס" (card image) upload added to the nailist settings
 * page — it lets a nailist set the cover photo shown on her /search results
 * card directly (uploads to storage, then PATCHes /api/nailists/[id]),
 * as a second path alongside the existing portfolio star-picker.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import NailistSettingsPage from '@/app/dashboard/nailist/settings/page'

jest.mock('@/lib/firebase/storage', () => ({
  uploadCoverPhoto: jest.fn(),
}))

const profile = {
  id: 'nailist-1',
  businessName: 'סטודיו שרה',
  bio: '',
  city: '',
  address: '',
  phoneNumber: '',
  whatsappPhone: '',
  instagramUrl: '',
  tiktokUrl: '',
  isActive: true,
  coverPhotoUrl: null as string | null,
}

function mockFetch(overrides: Partial<typeof profile> = {}) {
  global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url === '/api/me/nailist-profile') {
      return Promise.resolve({ ok: true, json: async () => ({ data: { ...profile, ...overrides } }) } as Response)
    }
    if (url === `/api/nailists/${profile.id}` && init?.method === 'PATCH') {
      return Promise.resolve({ ok: true, json: async () => ({ message: 'Profile updated' }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('Nailist settings — card image upload', () => {
  it('uploads a file and PATCHes coverPhotoUrl', async () => {
    mockFetch()
    const { uploadCoverPhoto } = jest.requireMock('@/lib/firebase/storage')
    uploadCoverPhoto.mockResolvedValue({ url: 'https://storage.example.com/cover.jpg', storageKey: 'covers/nailist-1/cover.jpg' })

    render(<NailistSettingsPage />)
    await waitFor(() => expect(screen.getByText('תמונת כרטיס')).toBeInTheDocument())

    const file = new File(['x'], 'cover.jpg', { type: 'image/jpeg' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(uploadCoverPhoto).toHaveBeenCalledWith('nailist-1', file, expect.any(Function))
    })

    await waitFor(() => {
      const patchCall = (global.fetch as jest.Mock).mock.calls.find(
        ([url, init]: [string, RequestInit]) => url === '/api/nailists/nailist-1' && init?.method === 'PATCH'
      )
      expect(patchCall).toBeDefined()
      expect(JSON.parse(patchCall[1].body)).toEqual({ coverPhotoUrl: 'https://storage.example.com/cover.jpg' })
    })

    await waitFor(() => {
      const img = document.querySelector('img[alt=""]') as HTMLImageElement
      expect(img.src).toBe('https://storage.example.com/cover.jpg')
    })
  })

  it('rejects files over 5MB without uploading', async () => {
    mockFetch()
    const { uploadCoverPhoto } = jest.requireMock('@/lib/firebase/storage')

    render(<NailistSettingsPage />)
    await waitFor(() => expect(screen.getByText('תמונת כרטיס')).toBeInTheDocument())

    const bigFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [bigFile] } })

    await waitFor(() => expect(screen.getByText(/גדול מדי/)).toBeInTheDocument())
    expect(uploadCoverPhoto).not.toHaveBeenCalled()
  })

  it('shows a remove button when a cover photo is set, and clears it on click', async () => {
    mockFetch({ coverPhotoUrl: 'https://storage.example.com/existing.jpg' })

    render(<NailistSettingsPage />)
    await waitFor(() => expect(screen.getByText('הסירי תמונה')).toBeInTheDocument())

    fireEvent.click(screen.getByText('הסירי תמונה'))

    await waitFor(() => {
      const patchCall = (global.fetch as jest.Mock).mock.calls.find(
        ([url, init]: [string, RequestInit]) => url === '/api/nailists/nailist-1' && init?.method === 'PATCH'
      )
      expect(patchCall).toBeDefined()
      expect(JSON.parse(patchCall[1].body)).toEqual({ coverPhotoUrl: null })
    })

    await waitFor(() => expect(screen.queryByText('הסירי תמונה')).not.toBeInTheDocument())
  })

  it('does not show a remove button when there is no cover photo', async () => {
    mockFetch()
    render(<NailistSettingsPage />)
    await waitFor(() => expect(screen.getByText('תמונת כרטיס')).toBeInTheDocument())
    expect(screen.queryByText('הסירי תמונה')).not.toBeInTheDocument()
  })
})
