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
  // Pin time to midnight so past-slot filter never removes test time slots
  jest.useFakeTimers()
  jest.setSystemTime(new Date('2025-01-15T00:00:00'))
  mockFetch.mockReset()
  // Default catch-all so background fetches don't throw
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ data: {} }) })
  defaultProps.onClose.mockReset()
})

afterEach(() => {
  jest.useRealTimers()
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

  it('shows an error when clicking Continue without selecting a service', async () => {
    render(<BookingModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /המשך/ }))
    await waitFor(() => expect(screen.getByText(/יש לבחור שירות/)).toBeInTheDocument())
  })

  it('navigates to step 2 after selecting a service and clicking Continue', async () => {
    render(<BookingModal {...defaultProps} />)
    fireEvent.click(screen.getByText("מניקור ג'ל"))
    fireEvent.click(screen.getByRole('button', { name: /המשך/ }))
    await waitFor(() => expect(screen.getByText(/בחרי תאריך ושעה/)).toBeInTheDocument())
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

  it('hides past time slots when current time is 09:00 and today is selected', async () => {
    // Override to 09:00 — 08:00, 08:30, 09:00 should be hidden; 09:30+ shown
    jest.setSystemTime(new Date('2025-01-15T09:00:00'))

    render(<BookingModal {...defaultProps} />)
    await navigateToStep2()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockAvailability }),
    })

    // Today (Jan 15) should be the first enabled date at 09:00 AM
    const dateButtons = screen.getAllByTestId('date-btn').filter((btn) => !btn.hasAttribute('disabled'))
    fireEvent.click(dateButtons[0])

    await waitFor(() => expect(screen.getByText('09:30')).toBeInTheDocument())

    expect(screen.queryByText('08:00')).not.toBeInTheDocument()
    expect(screen.queryByText('08:30')).not.toBeInTheDocument()
    expect(screen.queryByText('09:00')).not.toBeInTheDocument()
    expect(screen.getByText('09:30')).toBeInTheDocument()
    expect(screen.getByText('10:00')).toBeInTheDocument()
  })

  it('shows all time slots when a future date is selected', async () => {
    render(<BookingModal {...defaultProps} />)
    await navigateToStep2()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockAvailability }),
    })

    // Click a future date (not the first = today, but the second enabled)
    const dateButtons = screen.getAllByTestId('date-btn').filter((btn) => !btn.hasAttribute('disabled'))
    fireEvent.click(dateButtons[1]) // Second enabled = Jan 16

    await waitFor(() => expect(screen.getByText('08:00')).toBeInTheDocument())

    // All slots from mockAvailability (08:00–18:00) should be visible
    expect(screen.getByText('08:00')).toBeInTheDocument()
    expect(screen.getByText('08:30')).toBeInTheDocument()
    expect(screen.getByText('09:00')).toBeInTheDocument()
  })

  it('calls onClose when clicking the backdrop', () => {
    render(<BookingModal {...defaultProps} />)
    const backdrop = document.querySelector('.fixed.inset-0')!
    fireEvent.click(backdrop)
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('step progress indicator shows correct step number', async () => {
    render(<BookingModal {...defaultProps} />)
    // Step 1 visible
    expect(screen.getByText('בחרי שירות')).toBeInTheDocument()

    await navigateToStep2()
    // Step 2 visible
    expect(screen.getByText(/בחרי תאריך ושעה/)).toBeInTheDocument()
  })
})

describe('BookingModal — Bit deposit', () => {
  it('does not show deposit instructions on the done step when the nailist has no deposit props (the non-opted-in majority)', async () => {
    render(<BookingModal {...defaultProps} />)
    await navigateToStep3()

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'client1' } }) })
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'apt1', depositRequired: false } }) })

    fireEvent.click(screen.getByRole('button', { name: /אישור/ }))

    await waitFor(() => expect(screen.getByText(/התור נקבע/)).toBeInTheDocument())
    expect(screen.queryByText(/נדרשת מקדמה/)).not.toBeInTheDocument()
  })

  it('shows the Bit button, phone, copy button, and "כבר שילמתי" when the appointment requires a deposit', async () => {
    render(<BookingModal {...defaultProps} bitPhone="0501234567" />)
    await navigateToStep3()

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'client1' } }) })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'apt1', depositRequired: true, depositAmount: 30, depositCurrency: 'ILS' } }),
    })

    fireEvent.click(screen.getByRole('button', { name: /אישור/ }))

    await waitFor(() => expect(screen.getByText(/התור נקבע/)).toBeInTheDocument())
    expect(screen.getByText(/נדרשת מקדמה של ₪30 דרך Bit/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'פתחי את Bit' })).toHaveAttribute('href', 'bit://pay/972501234567?amount=30')
    expect(screen.getByText('050-123-4567')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /כבר שילמתי/ })).toBeInTheDocument()
  })

  it('marks the deposit as paid and shows a confirmation instead of the button', async () => {
    render(<BookingModal {...defaultProps} bitPhone="0501234567" />)
    await navigateToStep3()

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'client1' } }) })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'apt1', depositRequired: true, depositAmount: 30, depositCurrency: 'ILS' } }),
    })
    fireEvent.click(screen.getByRole('button', { name: /אישור/ }))
    await waitFor(() => expect(screen.getByText(/התור נקבע/)).toBeInTheDocument())

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'ok' }) })
    fireEvent.click(screen.getByRole('button', { name: /כבר שילמתי/ }))

    await waitFor(() => expect(screen.getByText('סימנת ששילמת')).toBeInTheDocument())
    expect(mockFetch).toHaveBeenLastCalledWith(
      '/api/appointments/apt1/deposit',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ action: 'MARK_PAID' }) })
    )
    expect(screen.queryByRole('button', { name: /כבר שילמתי/ })).not.toBeInTheDocument()
  })
})
