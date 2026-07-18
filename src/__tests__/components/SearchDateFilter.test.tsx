/**
 * The date-picker filter on /search should let a visitor narrow results down
 * to nailists available on a specific day, refetching with a `date` query
 * param and filtering client-side on the server-computed `availableOnDate`
 * flag — matching the codebase's established client-side post-filter pattern.
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

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
  // 2026-06-10 is a Wednesday (Israel calendar date).
  jest.setSystemTime(new Date('2026-06-10T08:00:00.000Z'))
})

afterEach(() => {
  jest.useRealTimers()
})

function mockFetchByDate() {
  return jest.fn().mockImplementation((url: string) => {
    if (url.includes('/api/nailists')) {
      const hasDate = url.includes('date=')
      const data = hasDate
        ? [{ id: 'n-available', businessName: 'סטודיו פנוי', avgRating: 4.5, reviewCount: 3, serviceNames: [], availableOnDate: true }]
        : [
            { id: 'n-available', businessName: 'סטודיו פנוי', avgRating: 4.5, reviewCount: 3, serviceNames: [], availableOnDate: true },
            { id: 'n-busy', businessName: 'סטודיו עמוס', avgRating: 4.9, reviewCount: 9, serviceNames: [], availableOnDate: false },
          ]
      return Promise.resolve({ ok: true, json: async () => ({ data, hasMore: false }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
}

describe('Search page — date-picker availability filter', () => {
  it('shows both nailists before a date is selected', async () => {
    global.fetch = mockFetchByDate()
    render(<SearchPage />)
    await waitFor(() => expect(screen.getByText('סטודיו פנוי')).toBeInTheDocument())
    expect(screen.getByText('סטודיו עמוס')).toBeInTheDocument()
  })

  it('refetches with a date param and filters out nailists unavailable that day', async () => {
    global.fetch = mockFetchByDate()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<SearchPage />)
    await waitFor(() => expect(screen.getByText('סטודיו פנוי')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /תאריך/ }))
    const dateButtons = await screen.findAllByTestId('search-date-btn')
    // Pick a not-yet-past day in the visible month grid.
    const target = dateButtons.find((b) => !(b as HTMLButtonElement).disabled)
    expect(target).toBeTruthy()
    await user.click(target!)

    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls.map((c) => c[0] as string)
      expect(calls.some((u) => u.includes('/api/nailists') && u.includes('date='))).toBe(true)
    })

    await waitFor(() => expect(screen.getByText('סטודיו פנוי')).toBeInTheDocument())
    expect(screen.queryByText('סטודיו עמוס')).not.toBeInTheDocument()
  })

  it('clears the date filter and shows all nailists again', async () => {
    global.fetch = mockFetchByDate()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<SearchPage />)
    await waitFor(() => expect(screen.getByText('סטודיו פנוי')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /תאריך/ }))
    const dateButtons = await screen.findAllByTestId('search-date-btn')
    const target = dateButtons.find((b) => !(b as HTMLButtonElement).disabled)
    await user.click(target!)
    await waitFor(() => expect(screen.getByText('סטודיו פנוי')).toBeInTheDocument())
    expect(screen.queryByText('סטודיו עמוס')).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('נקי תאריך'))

    await waitFor(() => expect(screen.getByText('סטודיו עמוס')).toBeInTheDocument())
  })
})
