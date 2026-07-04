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
