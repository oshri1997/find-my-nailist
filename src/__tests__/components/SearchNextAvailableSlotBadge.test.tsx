/**
 * Search results should surface each nailist's next open appointment slot
 * (day + time) as a badge, so a visitor can compare availability across
 * cards without opening every profile.
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

function mockNailistsResponse(nailists: unknown[]) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('/api/nailists')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: nailists, hasMore: false }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
  // 2026-06-10 is a Wednesday (Israel calendar date).
  jest.setSystemTime(new Date('2026-06-10T08:00:00.000Z'))
})

afterEach(() => {
  jest.useRealTimers()
})

describe('Search page — next-available-slot badge', () => {
  it('shows the badge with a "today" label when the slot is today', async () => {
    mockNailistsResponse([
      { id: 'n1', businessName: 'סטודיו שרה', avgRating: 4.5, reviewCount: 3, serviceNames: [], nextAvailableSlot: { date: '2026-06-10', time: '14:00' } },
    ])
    render(<SearchPage />)
    await waitFor(() => expect(screen.getByText('סטודיו שרה')).toBeInTheDocument())
    expect(screen.getByText(/היום, 14:00/)).toBeInTheDocument()
  })

  it('shows a weekday + date label when the slot is further out', async () => {
    mockNailistsResponse([
      { id: 'n1', businessName: 'סטודיו שרה', avgRating: 4.5, reviewCount: 3, serviceNames: [], nextAvailableSlot: { date: '2026-06-17', time: '11:00' } },
    ])
    render(<SearchPage />)
    await waitFor(() => expect(screen.getByText('סטודיו שרה')).toBeInTheDocument())
    expect(screen.getByText(/יום רביעי, 17\.06 · 11:00/)).toBeInTheDocument()
  })

  it('renders no badge when nextAvailableSlot is null', async () => {
    mockNailistsResponse([
      { id: 'n1', businessName: 'סטודיו שרה', avgRating: 4.5, reviewCount: 3, serviceNames: [], nextAvailableSlot: null },
    ])
    render(<SearchPage />)
    await waitFor(() => expect(screen.getByText('סטודיו שרה')).toBeInTheDocument())
    expect(screen.queryByText(/התור הקרוב/)).not.toBeInTheDocument()
  })

  it('renders no badge when nextAvailableSlot is absent from the response', async () => {
    mockNailistsResponse([
      { id: 'n1', businessName: 'סטודיו שרה', avgRating: 4.5, reviewCount: 3, serviceNames: [] },
    ])
    render(<SearchPage />)
    await waitFor(() => expect(screen.getByText('סטודיו שרה')).toBeInTheDocument())
    expect(screen.queryByText(/התור הקרוב/)).not.toBeInTheDocument()
  })
})
