/**
 * Covers a bugfix: /api/appointments?role=client caps at the 50 most recent
 * appointments, so a ?review=<id> link from an old review-request email
 * could point at an appointment outside that window and silently fail to
 * open the review modal. The page now falls back to fetching that specific
 * appointment by id when it isn't in the list.
 */
import { render, screen, waitFor } from '@testing-library/react'
import MyAppointmentsPage from '@/app/my-appointments/page'

const mockReplace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(mockSearch),
}))

let mockSearch = ''

jest.mock('@/components/reviews/ReviewModal', () => {
  return function MockReviewModal(props: { appointmentId: string; serviceName: string }) {
    return <div data-testid="review-modal">Review for {props.appointmentId} — {props.serviceName}</div>
  }
})

const recentAppointment = {
  id: 'recent-apt',
  nailistProfileId: 'n1',
  clientProfileId: 'c1',
  nailistBusinessName: 'סטודיו נייל',
  serviceName: 'מניקור',
  startTime: '2026-06-01T10:00:00Z',
  endTime: '2026-06-01T11:00:00Z',
  status: 'COMPLETED',
  price: 100,
  currency: 'ILS',
  hasReview: false,
}

const oldAppointment = {
  ...recentAppointment,
  id: 'old-apt',
  serviceName: 'פדיקור',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSearch = ''
})

describe('MyAppointmentsPage — ?review=<id> outside the 50-row window', () => {
  it('opens the review modal directly from the list when the appointment is present', async () => {
    mockSearch = 'review=recent-apt'
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.startsWith('/api/appointments?role=client')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [recentAppointment] }) } as Response)
      }
      throw new Error(`unexpected fetch: ${url}`)
    })

    render(<MyAppointmentsPage />)
    await waitFor(() => {
      expect(screen.getByTestId('review-modal')).toHaveTextContent('recent-apt')
    })
  })

  it('falls back to fetching the appointment by id when it is missing from the capped list', async () => {
    mockSearch = 'review=old-apt'
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.startsWith('/api/appointments?role=client')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [recentAppointment] }) } as Response)
      }
      if (url === '/api/appointments/old-apt') {
        return Promise.resolve({ ok: true, json: async () => ({ data: oldAppointment }) } as Response)
      }
      throw new Error(`unexpected fetch: ${url}`)
    })

    render(<MyAppointmentsPage />)
    await waitFor(() => {
      expect(screen.getByTestId('review-modal')).toHaveTextContent('old-apt')
    })
  })

  it('does not open the modal when the fallback fetch also fails to resolve the appointment', async () => {
    mockSearch = 'review=missing-apt'
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.startsWith('/api/appointments?role=client')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [recentAppointment] }) } as Response)
      }
      if (url === '/api/appointments/missing-apt') {
        return Promise.resolve({ ok: false, json: async () => ({ error: 'Not found' }) } as Response)
      }
      throw new Error(`unexpected fetch: ${url}`)
    })

    render(<MyAppointmentsPage />)
    await waitFor(() => {
      expect(screen.getByText('סטודיו נייל')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('review-modal')).not.toBeInTheDocument()
  })
})
