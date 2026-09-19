/**
 * The client guide points its "choose a nailist" step at
 * [data-tour="client-search-results"]. That anchor used to sit on the loading
 * skeleton grid alone, so it disappeared the moment real results arrived and
 * the step was left pointing at nothing.
 */
import { render, screen, waitFor } from '@testing-library/react'
import SearchPage from '@/app/search/page'

jest.mock('@/components/layout/navbar', () => ({ Navbar: () => null }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: null }),
}))

const nailist = {
  id: 'n1',
  businessName: 'סטודיו ורוד',
  city: 'תל אביב',
  avgRating: 4.8,
  reviewCount: 12,
  isVerified: true,
  services: [],
}

function mockSearch(data: unknown[]) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('/api/nailists')) {
      return Promise.resolve({ ok: true, json: async () => ({ data, hasMore: false }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
}

describe('Search page — guided tour anchors', () => {
  it('keeps the results anchor in place once the real results replace the skeletons', async () => {
    mockSearch([nailist])
    const { container } = render(<SearchPage />)

    expect(container.querySelector('[data-tour="client-search-results"]')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('סטודיו ורוד')).toBeInTheDocument())
    expect(container.querySelector('[data-tour="client-search-results"]')).toBeInTheDocument()
  })

  it('keeps the results anchor in place when the search comes back empty', async () => {
    mockSearch([])
    const { container } = render(<SearchPage />)

    await waitFor(() => expect(screen.getByText('לא נמצאו נייליסטיות')).toBeInTheDocument())
    expect(container.querySelector('[data-tour="client-search-results"]')).toBeInTheDocument()
  })

  it('anchors the filters step', async () => {
    mockSearch([])
    const { container } = render(<SearchPage />)
    await waitFor(() =>
      expect(container.querySelector('[data-tour="client-search-filters"]')).toBeInTheDocument()
    )
  })
})
