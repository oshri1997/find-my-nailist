/**
 * Covers the "set as card image" star-picker in the portfolio grid — it lets
 * a nailist pick one of her portfolio photos as the coverPhotoUrl shown on
 * her /search results card. This is distinct from the profile hero, which
 * stays a fixed gradient regardless of coverPhotoUrl; it's also a second
 * path to the same field alongside the direct upload in Settings.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import PortfolioPage from '@/app/dashboard/nailist/portfolio/page'

const photos = [
  { id: 'p1', url: 'https://example.com/p1.jpg' },
  { id: 'p2', url: 'https://example.com/p2.jpg' },
]

function mockFetch(overrides: { coverPhotoUrl?: string | null } = {}) {
  global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url.includes('/api/me/nailist-profile')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: { id: 'nailist-1', ...overrides } }) } as Response)
    }
    if (url.includes('/api/portfolio')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: photos }) } as Response)
    }
    if (url === '/api/nailists/nailist-1' && init?.method === 'PATCH') {
      return Promise.resolve({ ok: true, json: async () => ({ message: 'Profile updated' }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('PortfolioPage — card image picker', () => {
  it('PATCHes coverPhotoUrl when the star on a photo is clicked', async () => {
    mockFetch()
    render(<PortfolioPage />)

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(photos.length))

    fireEvent.click(screen.getAllByTitle('הגדרי כתמונת הכרטיס')[0])

    await waitFor(() => {
      const patchCall = (global.fetch as jest.Mock).mock.calls.find(
        ([url, init]: [string, RequestInit]) => url === '/api/nailists/nailist-1' && init?.method === 'PATCH'
      )
      expect(patchCall).toBeDefined()
      expect(JSON.parse(patchCall[1].body)).toEqual({ coverPhotoUrl: photos[0].url })
    })

    await waitFor(() => expect(screen.getByText('כרטיס')).toBeInTheDocument())
  })

  it('toggles the cover off when clicking the star on the already-selected photo', async () => {
    mockFetch({ coverPhotoUrl: photos[0].url })
    render(<PortfolioPage />)

    await waitFor(() => expect(screen.getByText('כרטיס')).toBeInTheDocument())

    fireEvent.click(screen.getByTitle('הסירי תמונת כרטיס'))

    await waitFor(() => {
      const patchCall = (global.fetch as jest.Mock).mock.calls.find(
        ([url, init]: [string, RequestInit]) => url === '/api/nailists/nailist-1' && init?.method === 'PATCH'
      )
      expect(patchCall).toBeDefined()
      expect(JSON.parse(patchCall[1].body)).toEqual({ coverPhotoUrl: null })
    })

    await waitFor(() => expect(screen.queryByText('כרטיס')).not.toBeInTheDocument())
  })

  it('clears the cover locally when the cover photo is deleted', async () => {
    mockFetch({ coverPhotoUrl: photos[0].url })
    render(<PortfolioPage />)

    await waitFor(() => expect(screen.getByText('כרטיס')).toBeInTheDocument())

    // First delete button belongs to the first photo card
    fireEvent.click(screen.getAllByLabelText('מחקי תמונה')[0])

    await waitFor(() => expect(screen.queryByText('כרטיס')).not.toBeInTheDocument())
  })

  it('keeps the photo visible and shows an error when the DELETE request fails', async () => {
    mockFetch({ coverPhotoUrl: photos[0].url })
    ;(global.fetch as jest.Mock).mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/api/me/nailist-profile')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: { id: 'nailist-1', coverPhotoUrl: photos[0].url } }) } as Response)
      }
      if (url.includes('/api/portfolio') && init?.method !== 'DELETE') {
        return Promise.resolve({ ok: true, json: async () => ({ data: photos }) } as Response)
      }
      if (init?.method === 'DELETE') {
        return Promise.resolve({ ok: false, json: async () => ({ error: 'Forbidden' }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
    })
    render(<PortfolioPage />)

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(photos.length))

    fireEvent.click(screen.getAllByLabelText('מחקי תמונה')[0])

    await waitFor(() => {
      expect(screen.getByText('מחיקת התמונה נכשלה — נסי שוב')).toBeInTheDocument()
    })
    // The photo and its cover-card status are untouched since the delete never took effect
    expect(screen.getAllByRole('img')).toHaveLength(photos.length)
    expect(screen.getByText('כרטיס')).toBeInTheDocument()
  })

  it('does not flip the cover locally when the set-cover PATCH request fails', async () => {
    mockFetch()
    ;(global.fetch as jest.Mock).mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/api/me/nailist-profile')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: { id: 'nailist-1' } }) } as Response)
      }
      if (url.includes('/api/portfolio')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: photos }) } as Response)
      }
      if (url === '/api/nailists/nailist-1' && init?.method === 'PATCH') {
        return Promise.resolve({ ok: false, json: async () => ({ error: 'Forbidden' }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
    })
    render(<PortfolioPage />)

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(photos.length))

    fireEvent.click(screen.getAllByTitle('הגדרי כתמונת הכרטיס')[0])

    await waitFor(() => {
      expect(screen.getByText('הגדרת תמונת הכרטיס נכשלה — נסי שוב')).toBeInTheDocument()
    })
    expect(screen.queryByText('כרטיס')).not.toBeInTheDocument()
  })
})

describe('PortfolioPage — lightbox', () => {
  it('opens the lightbox with the full-size image when a thumbnail is clicked', async () => {
    mockFetch()
    render(<PortfolioPage />)

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(photos.length))
    fireEvent.click(screen.getAllByRole('img')[0])

    await waitFor(() => {
      const images = screen.getAllByAltText('תמונת פורטפוליו') as HTMLImageElement[]
      expect(images.some(img => img.src === photos[0].url)).toBe(true)
    })
  })

  it('closes the lightbox when the close button is clicked', async () => {
    mockFetch()
    render(<PortfolioPage />)

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(photos.length))
    fireEvent.click(screen.getAllByRole('img')[0])
    await waitFor(() => expect(screen.getByLabelText('סגירה')).toBeInTheDocument())

    fireEvent.click(screen.getByLabelText('סגירה'))
    expect(screen.queryByLabelText('סגירה')).not.toBeInTheDocument()
  })

  it('exposes the lightbox trigger as a real, keyboard-focusable <button> rather than a bare clickable <img>', async () => {
    // Regression: an <img onClick> has no keyboard affordance at all — a
    // keyboard/screen-reader user could never open the lightbox. A real
    // <button> wrapping the image gets Tab-focus and Enter/Space activation
    // for free, natively, with no hand-rolled tabIndex/onKeyDown needed.
    mockFetch()
    render(<PortfolioPage />)

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(photos.length))
    const trigger = screen.getAllByRole('button', { name: 'הגדל תמונה' })[0]
    expect(trigger.tagName).toBe('BUTTON')
    expect(trigger).toContainElement(screen.getAllByRole('img')[0])
  })
})

describe('PortfolioPage — 20-photo limit', () => {
  const twentyPhotos = Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, url: `https://example.com/p${i}.jpg` }))

  function mockFetchWithPhotos(list: typeof photos) {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/me/nailist-profile')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: { id: 'nailist-1' } }) } as Response)
      }
      if (url.includes('/api/portfolio')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: list }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
    })
  }

  it('disables the upload button and hides the add-tile once at the limit', async () => {
    mockFetchWithPhotos(twentyPhotos)
    render(<PortfolioPage />)

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(20))
    expect(screen.getByRole('button', { name: 'הגעת למגבלה' })).toBeDisabled()
    expect(screen.queryByText('הוסיפי')).not.toBeInTheDocument()
    expect(screen.getByText('20/20 תמונות')).toBeInTheDocument()
  })

  it('keeps the upload button enabled and shows the add-tile below the limit', async () => {
    mockFetchWithPhotos(twentyPhotos.slice(0, 19))
    render(<PortfolioPage />)

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(19))
    expect(screen.getByRole('button', { name: 'העלי תמונה' })).not.toBeDisabled()
    expect(screen.getByText('הוסיפי')).toBeInTheDocument()
  })

  it('shows a clear error and never attempts the upload when a file is selected past the limit', async () => {
    // Regression: the hidden <input type="file"> has no disabled state of
    // its own tied to the photo count, so handleFileChange must guard too —
    // not just the button/tile that normally gate access to it.
    mockFetchWithPhotos(twentyPhotos)
    const { container } = render(<PortfolioPage />)
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(20))

    const fetchCallsBefore = (global.fetch as jest.Mock).mock.calls.length
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['bytes'], 'one-too-many.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText('הגעת למגבלת 20 התמונות בפורטפוליו — מחקי תמונה כדי להוסיף חדשה')).toBeInTheDocument()
    })
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(fetchCallsBefore)
  })
})
