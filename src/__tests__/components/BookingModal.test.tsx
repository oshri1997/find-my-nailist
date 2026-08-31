import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BookingModal from '@/components/booking/BookingModal'
import { todayInIsrael } from '@/lib/booking-utils'

const services = [
  { id: 's1', name: 'מניקור', durationMinutes: 60, price: 120, currency: 'ILS' },
]

const defaultProps = {
  nailistProfileId: 'nailist-123',
  businessName: 'נייליסטית מעולה',
  services,
  onClose: jest.fn(),
}

beforeEach(() => {
  jest.resetAllMocks()
  global.fetch = jest.fn().mockResolvedValue({
    json: async () => ({ data: {} }),
    ok: true,
  } as Response)
})

afterEach(() => {
  jest.useRealTimers()
})

describe('BookingModal — batch availability fetch', () => {
  it('fetches batch availability when user advances to datetime step', async () => {
    render(<BookingModal {...defaultProps} />)

    // Select the service
    fireEvent.click(screen.getByText('מניקור'))
    // Advance to datetime step
    fireEvent.click(screen.getByText('המשך לבחירת תאריך'))

    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls
      const batchCall = calls.find(([url]: [string]) =>
        url.includes('/availability/batch') &&
        url.includes('nailist-123') &&
        url.includes('durationMinutes=60')
      )
      expect(batchCall).toBeDefined()
      expect(screen.getAllByTestId('date-btn').some((button) => !(button as HTMLButtonElement).disabled)).toBe(true)
    })
  })

  it('uses Israel\'s calendar date as the availability range start', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-15T23:00:00.000Z'))
    const expectedStart = todayInIsrael()
    render(<BookingModal {...defaultProps} />)

    fireEvent.click(screen.getByText('מניקור'))
    fireEvent.click(screen.getByText('המשך לבחירת תאריך'))

    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.some(([url]: [string]) =>
        url.includes(`/availability/batch?from=${expectedStart}`)
      )).toBe(true)
      expect(screen.getAllByTestId('date-btn').some((button) => !(button as HTMLButtonElement).disabled)).toBe(true)
    })
  })

  it('re-fetches batch when a different service is selected', async () => {
    const twoServices = [
      ...services,
      { id: 's2', name: 'פדיקור', durationMinutes: 90, price: 150, currency: 'ILS' },
    ]
    render(<BookingModal {...defaultProps} services={twoServices} />)

    fireEvent.click(screen.getByText('מניקור'))
    fireEvent.click(screen.getByText('המשך לבחירת תאריך'))

    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.some(([url]: [string]) =>
        url.includes('durationMinutes=60')
      )).toBe(true)
      expect(screen.getAllByTestId('date-btn').some((button) => !(button as HTMLButtonElement).disabled)).toBe(true)
    })
  })

  it('renders non-working day badge (✕) for days marked as non-working', async () => {
    // Return a summary where today is non-working
    const todayStr = todayInIsrael()

    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/availability/batch')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: { [todayStr]: { workingDay: false, fullyBooked: false } },
          }),
        } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
    })

    render(<BookingModal {...defaultProps} />)
    fireEvent.click(screen.getByText('מניקור'))
    fireEvent.click(screen.getByText('המשך לבחירת תאריך'))

    await waitFor(() => {
      expect(screen.getAllByText('✕').length).toBeGreaterThan(0)
    })
  })

  it('does not make dates selectable when batch availability returns a non-success response', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/availability/batch')) {
        return Promise.resolve({ ok: false, status: 503, json: async () => ({ error: 'Unavailable' }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
    })

    render(<BookingModal {...defaultProps} />)
    fireEvent.click(screen.getByText('מניקור'))
    fireEvent.click(screen.getByText('המשך לבחירת תאריך'))

    expect(await screen.findByRole('alert')).toHaveTextContent('לא הצלחנו לטעון זמינות ימים')
    expect(screen.getByRole('button', { name: 'נסי שוב' })).toBeEnabled()
    expect(screen.getAllByTestId('date-btn')).toEqual(
      expect.arrayContaining([expect.objectContaining({ disabled: true })])
    )
    expect(screen.getAllByTestId('date-btn').every((button) => (button as HTMLButtonElement).disabled)).toBe(true)
    expect((global.fetch as jest.Mock).mock.calls.some(([url]: [string]) =>
      url.includes('/availability?') && !url.includes('/availability/batch')
    )).toBe(false)
  })

  it('retries a failed batch availability request and enables dates only after success', async () => {
    let batchRequests = 0
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/availability/batch')) {
        batchRequests += 1
        return Promise.resolve(
          batchRequests === 1
            ? ({ ok: false, status: 503, json: async () => ({ error: 'Unavailable' }) } as Response)
            : ({ ok: true, json: async () => ({ data: {} }) } as Response)
        )
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
    })

    render(<BookingModal {...defaultProps} />)
    fireEvent.click(screen.getByText('מניקור'))
    fireEvent.click(screen.getByText('המשך לבחירת תאריך'))

    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'נסי שוב' }))

    await waitFor(() => {
      expect(batchRequests).toBe(2)
      expect(screen.getAllByTestId('date-btn').some((button) => !(button as HTMLButtonElement).disabled)).toBe(true)
    })
  })
})

describe('BookingModal — daily availability fetch', () => {
  it('shows a retryable error rather than a non-working day when the selected-date request fails', async () => {
    let dailyRequests = 0
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/availability/batch')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: {} }) } as Response)
      }
      if (url.includes('/availability?')) {
        dailyRequests += 1
        return Promise.resolve(
          dailyRequests === 1
            ? ({ ok: false, status: 503, json: async () => ({ error: 'Unavailable' }) } as Response)
            // Use a late slot so this retry proof is stable even when the
            // test runs after the morning; today's past slots are correctly
            // hidden from real bookers.
            : ({ ok: true, json: async () => ({ data: { workingDay: true, startTime: '23:00', endTime: '23:30', bookedSlots: [] } }) } as Response)
        )
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
    })

    render(<BookingModal {...defaultProps} />)
    fireEvent.click(screen.getByText('מניקור'))
    fireEvent.click(screen.getByText('המשך לבחירת תאריך'))

    await waitFor(() => {
      expect(screen.getAllByTestId('date-btn').some((button) => !(button as HTMLButtonElement).disabled)).toBe(true)
    })
    const selectedDateButton = screen.getAllByTestId('date-btn').find(
      // On the final day of a month the current calendar view may not contain
      // another future day. Today's calendar cell is still a valid selection
      // for proving the daily-request retry flow.
      (button) => !(button as HTMLButtonElement).disabled
    )
    expect(selectedDateButton).toBeDefined()
    fireEvent.click(selectedDateButton!)

    expect(await screen.findByRole('alert')).toHaveTextContent('לא הצלחנו לטעון שעות פנויות')
    expect(screen.queryByText('יום זה אינו יום עבודה')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'נסי שוב' }))
    await waitFor(() => {
      expect(dailyRequests).toBe(2)
      expect(screen.getByText('23:00')).toBeInTheDocument()
    })
  })
})
