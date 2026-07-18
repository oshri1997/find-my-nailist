/**
 * Covers the debounced anonymous search-analytics logging on /search — it
 * powers the admin "מה לקוחות מחפשות" dashboard, so typing/filtering must
 * actually reach POST /api/analytics/search, debounced (not per keystroke),
 * and only once the visitor has expressed real intent.
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import SearchPage from '@/app/search/page'

jest.mock('@/components/layout/navbar', () => ({ Navbar: () => null }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: null }),
}))

const nailists = [
  { id: 'n1', businessName: 'סטודיו שרה', city: 'תל אביב', avgRating: 4.5, reviewCount: 3, serviceNames: [] },
]

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('/api/nailists')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: nailists }) } as Response)
    }
    if (url.includes('/api/analytics/search')) {
      return Promise.resolve({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
})

afterEach(() => {
  jest.useRealTimers()
})

function analyticsCalls() {
  return (global.fetch as jest.Mock).mock.calls.filter(([url]: [string]) => url === '/api/analytics/search')
}

describe('Search page — analytics logging', () => {
  it('does not log anything when no search intent has been expressed', async () => {
    render(<SearchPage />)
    await act(async () => { await Promise.resolve() })
    act(() => { jest.advanceTimersByTime(2000) })
    expect(analyticsCalls()).toHaveLength(0)
  })

  it('logs a debounced event once the visitor types a query, not per keystroke', async () => {
    render(<SearchPage />)
    await act(async () => { await Promise.resolve() })

    const input = screen.getByPlaceholderText('עיר או שם עסק...')
    fireEvent.change(input, { target: { value: 'ר' } })
    act(() => { jest.advanceTimersByTime(300) })
    fireEvent.change(input, { target: { value: 'רח' } })
    act(() => { jest.advanceTimersByTime(300) })
    fireEvent.change(input, { target: { value: 'רחובות' } })

    expect(analyticsCalls()).toHaveLength(0) // still within the debounce window

    act(() => { jest.advanceTimersByTime(900) })
    await waitFor(() => expect(analyticsCalls()).toHaveLength(1))

    const [, init] = analyticsCalls()[0]
    const body = JSON.parse(init.body)
    expect(body.query).toBe('רחובות')
  })

  it('logs when a filter tag is picked, even with no typed text', async () => {
    render(<SearchPage />)
    await act(async () => { await Promise.resolve() })

    fireEvent.click(screen.getByText("ג'ל"))
    act(() => { jest.advanceTimersByTime(900) })

    await waitFor(() => expect(analyticsCalls()).toHaveLength(1))
    const [, init] = analyticsCalls()[0]
    const body = JSON.parse(init.body)
    expect(body.filter).toBe("ג'ל")
    expect(body.query).toBeUndefined()
  })
})
