/**
 * The search page's price-range filter narrows results to nailists whose
 * cheapest active service falls within a selected price band, filtered
 * client-side on the server-computed `minPrice` field.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SearchPage from '@/app/search/page'

jest.mock('@/components/layout/navbar', () => ({ Navbar: () => null }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: null }),
}))

const nailists = [
  { id: 'n-cheap', businessName: 'סטודיו זול', avgRating: 4.5, reviewCount: 3, serviceNames: [], minPrice: 80 },
  { id: 'n-mid', businessName: 'סטודיו בינוני', avgRating: 4.7, reviewCount: 5, serviceNames: [], minPrice: 150 },
  { id: 'n-pricey', businessName: 'סטודיו יקר', avgRating: 4.9, reviewCount: 9, serviceNames: [], minPrice: 400 },
]

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('/api/nailists')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: nailists, hasMore: false }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
})

describe('Search page — price range filter', () => {
  it('shows all nailists before a price band is selected', async () => {
    render(<SearchPage />)
    await waitFor(() => expect(screen.getByText('סטודיו זול')).toBeInTheDocument())
    expect(screen.getByText('סטודיו בינוני')).toBeInTheDocument()
    expect(screen.getByText('סטודיו יקר')).toBeInTheDocument()
  })

  it('narrows to nailists within the selected price band', async () => {
    const user = userEvent.setup()
    render(<SearchPage />)
    await waitFor(() => expect(screen.getByText('סטודיו זול')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'מחיר' }))
    await user.click(screen.getByRole('button', { name: 'עד ₪100' }))

    expect(screen.getByText('סטודיו זול')).toBeInTheDocument()
    expect(screen.queryByText('סטודיו בינוני')).not.toBeInTheDocument()
    expect(screen.queryByText('סטודיו יקר')).not.toBeInTheDocument()
  })

  it('shows the selected band as the button label', async () => {
    const user = userEvent.setup()
    render(<SearchPage />)
    await waitFor(() => expect(screen.getByText('סטודיו זול')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'מחיר' }))
    await user.click(screen.getByRole('button', { name: '₪350+' }))

    expect(screen.getByRole('button', { name: '₪350+' })).toBeInTheDocument()
    expect(screen.getByText('סטודיו יקר')).toBeInTheDocument()
    expect(screen.queryByText('סטודיו זול')).not.toBeInTheDocument()
  })

  it('restores all nailists when switching back to "הכל"', async () => {
    const user = userEvent.setup()
    render(<SearchPage />)
    await waitFor(() => expect(screen.getByText('סטודיו זול')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'מחיר' }))
    await user.click(screen.getByRole('button', { name: 'עד ₪100' }))
    expect(screen.queryByText('סטודיו יקר')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'עד ₪100' }))
    // The price popover's "הכל" band renders before the tier-1 category
    // "הכל" pill in DOM order — pick the first match.
    await user.click(screen.getAllByRole('button', { name: 'הכל' })[0])

    expect(screen.getByText('סטודיו יקר')).toBeInTheDocument()
  })
})
