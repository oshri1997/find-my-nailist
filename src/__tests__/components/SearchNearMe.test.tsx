/**
 * Regression test for a bug where clicking "קרוב אלי" (near me) emptied the
 * results grid: locationLabel doubled as both the read-only display text
 * ("המיקום שלי") and the client-side substring filter, so real nailists
 * (whose businessName/city never contains "המיקום שלי") were filtered out.
 */
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import SearchPage from '@/app/search/page'

jest.mock('@/components/layout/navbar', () => ({ Navbar: () => null }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: null }),
}))

const nailists = [
  { id: 'n1', businessName: 'סטודיו שרה', city: 'תל אביב', avgRating: 4.5, reviewCount: 3, serviceNames: [], distanceKm: 2.3 },
]

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('/api/nailists')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: nailists, hasMore: false }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })

  Object.defineProperty(global.navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (success: PositionCallback) => {
        success({ coords: { latitude: 32.08, longitude: 34.78 } } as GeolocationPosition)
      },
    },
  })
})

describe('Search page — near-me location search', () => {
  it('still shows fetched nailists after locating, instead of filtering them all out', async () => {
    render(<SearchPage />)
    await waitFor(() => expect(screen.getByText('סטודיו שרה')).toBeInTheDocument())

    const locateBtn = screen.getByTitle('השתמשי במיקום שלי')
    act(() => { locateBtn.click() })

    await waitFor(() => expect(screen.getByDisplayValue('המיקום שלי')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText('סטודיו שרה')).toBeInTheDocument())
  })

  it('shows a retry state when search fails instead of claiming there are no nailists', async () => {
    let attempts = 0
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/nailists')) {
        attempts++
        if (attempts === 1) return Promise.resolve({ ok: false, status: 503 } as Response)
        return Promise.resolve({ ok: true, json: async () => ({ data: nailists, hasMore: false }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
    })

    render(<SearchPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('לא הצלחנו לטעון את התוצאות')
    expect(screen.queryByText('לא נמצאו נייליסטיות')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'נסי שוב' }))
    expect(await screen.findByText('סטודיו שרה')).toBeInTheDocument()
  })
})
