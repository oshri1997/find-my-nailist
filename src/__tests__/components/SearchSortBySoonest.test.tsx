/**
 * The "תור קרוב" sort option should reorder search results by soonest
 * next-available slot, with nailists that have no known slot pushed to the
 * end instead of disappearing.
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
  { id: 'n-later', businessName: 'סטודיו מאוחר', avgRating: 5.0, reviewCount: 10, serviceNames: [], nextAvailableSlot: { date: '2026-06-12', time: '09:00' } },
  { id: 'n-none', businessName: 'סטודיו בלי תור', avgRating: 4.9, reviewCount: 9, serviceNames: [], nextAvailableSlot: null },
  { id: 'n-soonest', businessName: 'סטודיו מיידי', avgRating: 3.0, reviewCount: 1, serviceNames: [], nextAvailableSlot: { date: '2026-06-10', time: '14:00' } },
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

function cardOrder(): string[] {
  return screen.getAllByText(/^סטודיו /).map((el) => el.textContent ?? '')
}

describe('Search page — sort by soonest available', () => {
  it('defaults to rating order (not soonest)', async () => {
    render(<SearchPage />)
    await waitFor(() => expect(screen.getByText('סטודיו מיידי')).toBeInTheDocument())
    // Default sort is by rating (desc): 5.0, 4.9, 3.0
    expect(cardOrder()).toEqual(['סטודיו מאוחר', 'סטודיו בלי תור', 'סטודיו מיידי'])
  })

  it('reorders soonest-first, with no-slot nailists last, once "תור קרוב" is selected', async () => {
    const user = userEvent.setup()
    render(<SearchPage />)
    await waitFor(() => expect(screen.getByText('סטודיו מיידי')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'תור קרוב' }))

    await waitFor(() => expect(cardOrder()).toEqual(['סטודיו מיידי', 'סטודיו מאוחר', 'סטודיו בלי תור']))
  })
})
