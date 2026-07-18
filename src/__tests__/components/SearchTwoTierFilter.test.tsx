/**
 * The search-page category filter is two-tier: tier 1 narrows by treatment
 * type (מניקור/פדיקור), tier 2 (only shown once a type is picked) narrows
 * further by technique — mirroring the competitor site's category structure.
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
  { id: 'n-mani-gel', businessName: 'סטודיו מניקור גל', avgRating: 4.8, reviewCount: 10, serviceNames: ["מניקור ג'ל"] },
  { id: 'n-mani-acrylic', businessName: 'סטודיו מניקור אקריל', avgRating: 4.6, reviewCount: 8, serviceNames: ['מניקור אקריל'] },
  { id: 'n-pedi', businessName: 'סטודיו פדיקור', avgRating: 4.9, reviewCount: 20, serviceNames: ['פדיקור רגיל'] },
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

describe('Search page — two-tier category filter', () => {
  it('does not show the sub-filter row until a treatment type is picked', async () => {
    render(<SearchPage />)
    await waitFor(() => expect(screen.getByText('סטודיו פדיקור')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: "ג'ל" })).not.toBeInTheDocument()
  })

  it('narrows by treatment type and reveals the sub-filter row', async () => {
    const user = userEvent.setup()
    render(<SearchPage />)
    await waitFor(() => expect(screen.getByText('סטודיו פדיקור')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'מניקור' }))

    expect(screen.queryByText('סטודיו פדיקור')).not.toBeInTheDocument()
    expect(screen.getByText('סטודיו מניקור גל')).toBeInTheDocument()
    expect(screen.getByText('סטודיו מניקור אקריל')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "ג'ל" })).toBeInTheDocument()
  })

  it('narrows further by technique sub-filter within the selected type', async () => {
    const user = userEvent.setup()
    render(<SearchPage />)
    await waitFor(() => expect(screen.getByText('סטודיו פדיקור')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'מניקור' }))
    await user.click(screen.getByRole('button', { name: "ג'ל" }))

    expect(screen.getByText('סטודיו מניקור גל')).toBeInTheDocument()
    expect(screen.queryByText('סטודיו מניקור אקריל')).not.toBeInTheDocument()
  })

  it('resets the sub-filter and hides the row when switching back to "הכל"', async () => {
    const user = userEvent.setup()
    render(<SearchPage />)
    await waitFor(() => expect(screen.getByText('סטודיו פדיקור')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'מניקור' }))
    await user.click(screen.getByRole('button', { name: "ג'ל" }))
    // Tier 1's "הכל" renders first in the DOM (tier 1 row comes before tier 2).
    await user.click(screen.getAllByRole('button', { name: 'הכל' })[0])

    expect(screen.getByText('סטודיו פדיקור')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: "ג'ל" })).not.toBeInTheDocument()
  })
})
