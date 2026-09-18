/**
 * Covers the Bit deposit panel on /my-appointments — previously invisible
 * outside the one-time post-booking modal (BookingModal), a client who
 * closed that modal without paying had no way to see what she owed, to whom,
 * or to mark it paid ever again. This is the persistent, revisitable version.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import MyAppointmentsPage from '@/app/my-appointments/page'

const mockReplace = jest.fn()
// Stable references, like the real hooks return when nothing has actually
// changed — a fresh object every call (for either) would make the page's
// fetch-effect (dependent on both) re-run forever, repeatedly overwriting
// any optimistic local update (e.g. after "כבר שילמתי") with the original
// server snapshot.
const mockSearchParams = new URLSearchParams('')
const mockRouter = { replace: mockReplace }
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}))

const baseAppointment = {
  id: 'apt-1',
  nailistProfileId: 'n1',
  clientProfileId: 'c1',
  nailistBusinessName: 'סטודיו נייל',
  serviceName: 'מניקור',
  startTime: '2026-06-01T10:00:00Z',
  endTime: '2026-06-01T11:00:00Z',
  status: 'PENDING' as const,
  price: 100,
  currency: 'ILS',
}

beforeEach(() => {
  jest.clearAllMocks()
})

type TestAppointment = typeof baseAppointment & {
  depositRequired?: boolean
  depositAmount?: number
  depositBitPhone?: string
  depositStatus?: 'AWAITING_PAYMENT' | 'CLIENT_MARKED_PAID' | 'NAILIST_CONFIRMED'
}

function mockList(appointment: TestAppointment) {
  global.fetch = jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (url.startsWith('/api/appointments?role=client')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: [appointment] }) } as Response)
    }
    if (url === '/api/appointments/apt-1/deposit' && opts?.method === 'PATCH') {
      return Promise.resolve({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
    }
    throw new Error(`unexpected fetch: ${url}`)
  })
}

describe('MyAppointmentsPage — Bit deposit panel', () => {
  it('shows nothing deposit-related when the appointment has no deposit', async () => {
    mockList(baseAppointment)
    render(<MyAppointmentsPage />)

    await waitFor(() => expect(screen.getByText('סטודיו נייל')).toBeInTheDocument())
    expect(screen.queryByText(/נדרשת מקדמה/)).not.toBeInTheDocument()
  })

  it('shows the deposit instructions and a working "כבר שילמתי" while AWAITING_PAYMENT', async () => {
    mockList({
      ...baseAppointment,
      depositRequired: true,
      depositAmount: 50,
      depositBitPhone: '0501234567',
      depositStatus: 'AWAITING_PAYMENT',
    })
    render(<MyAppointmentsPage />)

    expect(await screen.findByText('נדרשת מקדמה של ₪50 דרך Bit')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /כבר שילמתי/ }))

    await waitFor(() => expect(screen.getByText(/סימנת ששילמת/)).toBeInTheDocument())
    expect(global.fetch).toHaveBeenLastCalledWith(
      '/api/appointments/apt-1/deposit',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ action: 'MARK_PAID' }) })
    )
  })

  it('shows a pending-confirmation message, with no button, when CLIENT_MARKED_PAID', async () => {
    mockList({
      ...baseAppointment,
      depositRequired: true,
      depositAmount: 50,
      depositBitPhone: '0501234567',
      depositStatus: 'CLIENT_MARKED_PAID',
    })
    render(<MyAppointmentsPage />)

    expect(await screen.findByText(/ממתינה לאישור הנייליסטית/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /כבר שילמתי/ })).not.toBeInTheDocument()
  })

  it('shows a confirmed state once NAILIST_CONFIRMED', async () => {
    mockList({
      ...baseAppointment,
      depositRequired: true,
      depositAmount: 50,
      depositBitPhone: '0501234567',
      depositStatus: 'NAILIST_CONFIRMED',
    })
    render(<MyAppointmentsPage />)

    expect(await screen.findByText('המקדמה של ₪50 התקבלה ואושרה')).toBeInTheDocument()
  })

  it('never renders the deposit panel without a Bit phone snapshot — an old appointment predating it', async () => {
    mockList({
      ...baseAppointment,
      depositRequired: true,
      depositAmount: 50,
      depositStatus: 'AWAITING_PAYMENT',
    })
    render(<MyAppointmentsPage />)

    await waitFor(() => expect(screen.getByText('סטודיו נייל')).toBeInTheDocument())
    expect(screen.queryByText(/נדרשת מקדמה/)).not.toBeInTheDocument()
  })
})
