/**
 * Covers the bugfix where contact buttons (WhatsApp/Instagram/TikTok/Waze/Maps)
 * are gated behind login — anonymous visitors should see a login CTA instead.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import NailistProfileClient from '@/app/nailists/[id]/NailistProfileClient'

const uploadProfilePhotoMock = jest.fn()
jest.mock('@/lib/firebase/storage', () => ({
  uploadProfilePhoto: (...args: unknown[]) => uploadProfilePhotoMock(...args),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))

jest.mock('@/components/layout/navbar', () => ({ Navbar: () => null }))

const mockUseAuth = jest.fn()
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}))

const baseProfile = {
  id: 'nailist-1',
  businessName: 'סטודיו יופי',
  bio: 'נייליסטית מקצועית',
  city: 'תל אביב',
  whatsappPhone: '+972501234567',
  instagramUrl: 'https://instagram.com/studio',
  tiktokUrl: 'https://tiktok.com/studio',
  hasContactInfo: true,
  avgRating: 4.8,
  reviewCount: 12,
  latitude: 32.08,
  longitude: 34.78,
  services: [],
  portfolio: [],
  reviews: [],
}

function mockProfileFetch(profile: typeof baseProfile, opts?: { asOwner?: boolean }) {
  global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url.includes('/api/me/nailist-profile')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: opts?.asOwner ? { id: profile.id } : { id: 'someone-else' } }),
      } as Response)
    }
    if (url.includes('/api/nailists/') && init?.method === 'PATCH') {
      return Promise.resolve({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
    }
    if (url.includes('/api/nailists/')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: profile }) } as Response)
    }
    if (url.includes('/api/favorites/')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: { isFavorited: false } }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('NailistProfileClient — contact info gating', () => {
  it('shows a login CTA instead of contact buttons for anonymous visitors', async () => {
    mockUseAuth.mockReturnValue({ user: null, role: null })
    mockProfileFetch(baseProfile)
    render(<NailistProfileClient id="nailist-1" />)

    await waitFor(() => {
      expect(screen.getByText('כניסה לצפייה בפרטי קשר')).toBeInTheDocument()
    })
    expect(screen.queryByText('וואטסאפ')).not.toBeInTheDocument()
    expect(screen.queryByText('אינסטגרם')).not.toBeInTheDocument()
    expect(screen.queryByText('טיקטוק')).not.toBeInTheDocument()
  })

  it('shows real contact buttons for logged-in visitors and no login CTA', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1', displayName: 'Test' }, role: 'CLIENT' })
    mockProfileFetch(baseProfile)
    render(<NailistProfileClient id="nailist-1" />)

    await waitFor(() => {
      expect(screen.getByText('וואטסאפ')).toBeInTheDocument()
    })
    expect(screen.getByText('אינסטגרם')).toBeInTheDocument()
    expect(screen.getByText('טיקטוק')).toBeInTheDocument()
    expect(screen.queryByText('כניסה לצפייה בפרטי קשר')).not.toBeInTheDocument()
  })

  it('does not show the login CTA when the nailist has no contact info at all', async () => {
    mockUseAuth.mockReturnValue({ user: null, role: null })
    mockProfileFetch({
      ...baseProfile,
      whatsappPhone: undefined as unknown as string,
      instagramUrl: undefined as unknown as string,
      tiktokUrl: undefined as unknown as string,
      hasContactInfo: false,
      latitude: undefined as unknown as number,
      longitude: undefined as unknown as number,
    })
    render(<NailistProfileClient id="nailist-1" />)

    await waitFor(() => {
      expect(screen.getByText('סטודיו יופי')).toBeInTheDocument()
    })
    expect(screen.queryByText('כניסה לצפייה בפרטי קשר')).not.toBeInTheDocument()
  })

  it('shows the login CTA from hasContactInfo alone, even when the raw fields are already stripped and there are no coordinates', async () => {
    // Regression: the API strips whatsappPhone/instagramUrl/tiktokUrl for anonymous
    // callers, so the CTA must not depend on those fields being present client-side.
    mockUseAuth.mockReturnValue({ user: null, role: null })
    mockProfileFetch({
      ...baseProfile,
      whatsappPhone: undefined as unknown as string,
      instagramUrl: undefined as unknown as string,
      tiktokUrl: undefined as unknown as string,
      hasContactInfo: true,
      latitude: undefined as unknown as number,
      longitude: undefined as unknown as number,
    })
    render(<NailistProfileClient id="nailist-1" />)

    await waitFor(() => {
      expect(screen.getByText('כניסה לצפייה בפרטי קשר')).toBeInTheDocument()
    })
  })
})

describe('NailistProfileClient — owner avatar edit', () => {
  it('does not show a photo-edit button for non-owner visitors', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, role: 'NAILIST' })
    mockProfileFetch(baseProfile, { asOwner: false })
    const { container } = render(<NailistProfileClient id="nailist-1" />)

    await waitFor(() => {
      expect(screen.getByText('סטודיו יופי')).toBeInTheDocument()
    })
    expect(container.querySelector('input[type="file"]')).not.toBeInTheDocument()
  })

  it('shows a photo-edit button for the owner, uploads, and PATCHes photoUrl', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, role: 'NAILIST' })
    mockProfileFetch(baseProfile, { asOwner: true })
    uploadProfilePhotoMock.mockResolvedValue({ url: 'https://example.com/new-avatar.jpg', storageKey: 'avatars/nailist-1/profile.jpg' })
    const { container } = render(<NailistProfileClient id="nailist-1" />)

    await waitFor(() => {
      expect(container.querySelector('input[type="file"]')).toBeInTheDocument()
    })

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['bytes'], 'avatar.jpg', { type: 'image/jpeg' })
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

    await waitFor(() => {
      const img = container.querySelector('img[alt="סטודיו יופי"]') as HTMLImageElement
      expect(img.src).toBe('https://example.com/new-avatar.jpg')
    })
  })

  it('shows a photo-edit button for an admin account that owns the profile (role is ADMIN, not NAILIST)', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, role: 'ADMIN' })
    mockProfileFetch(baseProfile, { asOwner: true })
    const { container } = render(<NailistProfileClient id="nailist-1" />)

    await waitFor(() => {
      expect(container.querySelector('input[type="file"]')).toBeInTheDocument()
    })
  })
})
