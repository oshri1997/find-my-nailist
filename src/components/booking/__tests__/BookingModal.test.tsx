import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BookingModal from '../BookingModal'

const mockServices = [
  { id: 'svc1', name: "מניקור ג'ל", durationMinutes: 60, price: 150, currency: 'ILS' },
  { id: 'svc2', name: 'פדיקור', durationMinutes: 45, price: 120, currency: 'ILS', description: 'טיפול מלא' },
]

const defaultProps = {
  nailistProfileId: 'nailist123',
  businessName: 'סטודיו שרה',
  services: mockServices,
  onClose: jest.fn(),
}

const mockFetch = jest.fn()
global.fetch = mockFetch

const mockAvailability = {
  workingDay: true,
  startTime: '08:00',
  endTime: '18:00',
  bookedSlots: [],
}

beforeEach(() => {
  mockFetch.mockReset()
  // Default catch-all so background fetches don't throw
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ data: {} }) })
  defaultProps.onClose.mockReset()
})

async function navigateToStep2(serviceName = "מניקור ג'ל") {
  fireEvent.click(screen.getByText(serviceName))
  fireEvent.click(screen.getByRole('button', { name: /המשך/ }))
}

async function navigateToStep3() {
  await navigateToStep2()
  // Override default with actual availability data for the per-date fetch
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data: mockAvailability }),
  })
  // Click the first enabled date button in the month calendar
  const dateButtons = screen.getAllByTestId('date-btn').filter(btn => !btn.hasAttribute('disabled'))
  fireEvent.click(dateButtons[0])
  await waitFor(() => screen.getByText('08:00'))
  fireEvent.click(screen.getByText('08:00'))
  fireEvent.click(screen.getByRole('button', { name: /המשך/ }))
}

describe('BookingModal', () => {
  it('renders step title and business name', () => {
    render(<BookingModal {...defaultProps} />)
    expect(screen.getByText('בחרי שירות')).toBeInTheDocument()
    expect(screen.getByText('סטודיו שרה')).toBeInTheDocument()
  })

  it('shows all services in step 1', () => {
    render(<BookingModal {...defaultProps} />)
    expect(screen.getByText("מניקור ג'ל")).toBeInTheDocument()
    expect(screen.getByText('פדיקור')).toBeInTheDocument()
    expect(screen.getByText('טיפול מלא')).toBeInTheDocument()
  })

  it('shows price with ₪ for ILS currency', () => {
    render(<BookingModal {...defaultProps} />)
    expect(screen.getByText('₪150')).toBeInTheDocument()
    expect(screen.getByText('₪120')).toBeInTheDocument()
  })

  it('disables the Continue button when no service is selected', () => {
    render(<BookingModal {...defaultProps} />)
    expect(screen.getByRole('button', { name: /המשך/ })).toBeDisabled()
  })

  it('enables Continue button after selecting a service', () => {
    render(<BookingModal {...defaultProps} />)
    fireEvent.click(screen.getByText("מניקור ג'ל"))
    expect(screen.getByRole('button', { name: /המשך/ })).not.toBeDisabled()
  })

  it('moves to step 2 (date/time) after selecting a service and continuing', async () => {
    render(<BookingModal {...defaultProps} />)
    await navigateToStep2()
    expect(screen.getByText(/בחרי תאריך ושעה/)).toBeInTheDocument()
  })

  it('shows time slots after a date is selected', async () => {
    render(<BookingModal {...defaultProps} />)
    await navigateToStep2()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockAvailability }),
    })
    const dateButtons = screen.getAllByTestId('date-btn').filter(btn => !btn.hasAttribute('disabled'))
    fireEvent.click(dateButtons[0])
    await waitFor(() => expect(screen.getByText('08:00')).toBeInTheDocument())
    expect(screen.getByText('09:00')).toBeInTheDocument()
  })

  it('shows service name and price in confirmation step', async () => {
    render(<BookingModal {...defaultProps} />)
    await navigateToStep3()
    expect(screen.getByText("מניקור ג'ל")).toBeInTheDocument()
    expect(screen.getByText('₪150')).toBeInTheDocument()
  })

  it('shows 409 conflict error on booking collision', async () => {
    render(<BookingModal {...defaultProps} />)
    await navigateToStep3()

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'client1' } }) })
    mockFetch.mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: 'conflict' }) })

    fireEvent.click(screen.getByRole('button', { name: /אישור/ }))

    await waitFor(() =>
      expect(screen.getByText(/השעה הזו כבר תפוסה/)).toBeInTheDocument()
    )
  })

  it('shows success screen after successful booking', async () => {
    render(<BookingModal {...defaultProps} />)
    await navigateToStep3()

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'client1' } }) })
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'apt1' } }) })

    fireEvent.click(screen.getByRole('button', { name: /אישור/ }))

    await waitFor(() =>
      expect(screen.getByText(/התור נקבע/)).toBeInTheDocument()
    )
  })

  it('shows auth error when client profile returns 401', async () => {
    render(<BookingModal {...defaultProps} />)
    await navigateToStep3()

    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })

    fireEvent.click(screen.getByRole('button', { name: /אישור/ }))

    await waitFor(() =>
      expect(screen.getByText(/יש להתחבר לחשבון/)).toBeInTheDocument()
    )
  })
})
