import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BookingModal from '@/components/booking/BookingModal'

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
    })
  })

  it('renders non-working day badge (✕) for days marked as non-working', async () => {
    // Return a summary where today is non-working
    const today = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

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
})
