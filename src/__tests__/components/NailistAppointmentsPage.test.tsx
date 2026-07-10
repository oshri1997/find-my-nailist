/**
 * Covers a bugfix: marking an appointment CONFIRMED/COMPLETED used to update
 * the dashboard's local state regardless of whether the server actually
 * accepted the transition. A rejected 409 (e.g. a stale tab trying to
 * complete an appointment the client already cancelled elsewhere) used to
 * still flip the status shown to the nailist, even though nothing changed
 * in Firestore.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NailistAppointmentsPage from '@/app/dashboard/nailist/appointments/page'

const appointment = {
  id: 'apt-1',
  serviceName: 'מניקור',
  clientDisplayName: 'לקוחה',
  startTime: '2026-07-10T10:00:00Z',
  endTime: '2026-07-10T11:00:00Z',
  status: 'CONFIRMED' as const,
  price: 120,
  currency: 'ILS',
}

function mockFetch(patchOk: boolean) {
  global.fetch = jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (url.includes('/api/appointments?role=nailist')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: [appointment] }) } as Response)
    }
    if (opts?.method === 'PATCH') {
      return Promise.resolve({
        ok: patchOk,
        json: async () => (patchOk ? { message: 'Status updated', status: 'COMPLETED' } : { error: 'Cannot change status from CANCELLED to COMPLETED' }),
      } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
  })
}

describe('NailistAppointmentsPage — status update rejected by the server', () => {
  it('keeps the old status and shows an error when the server rejects the transition (409)', async () => {
    mockFetch(false)
    render(<NailistAppointmentsPage />)

    await waitFor(() => expect(screen.getByText('מאושר')).toBeInTheDocument())

    fireEvent.click(screen.getByText('הושלם'))

    await waitFor(() => {
      expect(screen.getByText(/לא ניתן היה לעדכן את הסטטוס/)).toBeInTheDocument()
    })
    // Status badge still shows the original CONFIRMED label, not COMPLETED
    expect(screen.getByText('מאושר')).toBeInTheDocument()
  })

  it('applies the new status when the server accepts the transition', async () => {
    mockFetch(true)
    render(<NailistAppointmentsPage />)

    await waitFor(() => expect(screen.getByText('מאושר')).toBeInTheDocument())

    fireEvent.click(screen.getByText('הושלם'))

    await waitFor(() => {
      expect(screen.getByText('הושלם')).toBeInTheDocument()
    })
  })
})

describe('NailistAppointmentsPage — Bit deposit badge/button', () => {
  type DepositStatus = 'AWAITING_PAYMENT' | 'CLIENT_MARKED_PAID' | 'NAILIST_CONFIRMED'
  const depositAppointment: typeof appointment & {
    depositRequired: boolean
    depositAmount: number
    depositCurrency: string
    depositStatus: DepositStatus
  } = {
    ...appointment,
    depositRequired: true,
    depositAmount: 30,
    depositCurrency: 'ILS',
    depositStatus: 'AWAITING_PAYMENT',
  }

  function mockFetchWithDeposit(apt: typeof depositAppointment, depositPatchOk = true) {
    global.fetch = jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (url.includes('/api/appointments?role=nailist')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [apt] }) } as Response)
      }
      if (url.includes('/deposit') && opts?.method === 'PATCH') {
        return Promise.resolve({
          ok: depositPatchOk,
          json: async () => (depositPatchOk ? { message: 'Deposit status updated', depositStatus: 'NAILIST_CONFIRMED' } : { error: 'Forbidden' }),
        } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
    })
  }

  it('does not render a deposit badge or button for an appointment that never required one', async () => {
    mockFetch(true)
    render(<NailistAppointmentsPage />)
    await waitFor(() => expect(screen.getByText('מאושר')).toBeInTheDocument())
    expect(screen.queryByText(/מקדמה/)).not.toBeInTheDocument()
  })

  it('shows the correct badge label/color per depositStatus', async () => {
    mockFetchWithDeposit(depositAppointment)
    render(<NailistAppointmentsPage />)
    expect(await screen.findByText('ממתינה למקדמה')).toBeInTheDocument()
  })

  it('shows the "כבר שילמתי" client-side label once the client has marked it paid', async () => {
    mockFetchWithDeposit({ ...depositAppointment, depositStatus: 'CLIENT_MARKED_PAID' })
    render(<NailistAppointmentsPage />)
    expect(await screen.findByText('הלקוחה סימנה ששילמה')).toBeInTheDocument()
  })

  it('shows the confirm-received button only before NAILIST_CONFIRMED', async () => {
    mockFetchWithDeposit(depositAppointment)
    render(<NailistAppointmentsPage />)
    expect(await screen.findByRole('button', { name: /אשרי קבלת מקדמה/ })).toBeInTheDocument()
  })

  it('hides the confirm-received button once the deposit is already NAILIST_CONFIRMED', async () => {
    mockFetchWithDeposit({ ...depositAppointment, depositStatus: 'NAILIST_CONFIRMED' })
    render(<NailistAppointmentsPage />)
    await waitFor(() => expect(screen.getByText('מקדמה התקבלה')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /אשרי קבלת מקדמה/ })).not.toBeInTheDocument()
  })

  it('clicking confirm-received updates only depositStatus, leaving the real status untouched', async () => {
    mockFetchWithDeposit(depositAppointment)
    render(<NailistAppointmentsPage />)
    const btn = await screen.findByRole('button', { name: /אשרי קבלת מקדמה/ })
    fireEvent.click(btn)

    await waitFor(() => expect(screen.getByText('מקדמה התקבלה')).toBeInTheDocument())
    // The real appointment status badge is unaffected by the deposit action.
    expect(screen.getByText('מאושר')).toBeInTheDocument()
    expect((global.fetch as jest.Mock).mock.calls.some(
      ([url, opts]: [string, RequestInit]) => url.includes('/deposit') && opts?.method === 'PATCH'
    )).toBe(true)
  })

  it('the real status buttons remain fully usable regardless of deposit state (never gated)', async () => {
    mockFetchWithDeposit(depositAppointment)
    render(<NailistAppointmentsPage />)
    await screen.findByText('ממתינה למקדמה')

    const completeBtn = screen.getByText('הושלם').closest('button')
    expect(completeBtn).not.toBeDisabled()
    const cancelBtn = screen.getByText('בטל').closest('button')
    expect(cancelBtn).not.toBeDisabled()
  })
})
