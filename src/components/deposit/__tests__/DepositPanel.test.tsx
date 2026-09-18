import { fireEvent, render, screen } from '@testing-library/react'
import { DepositPanel } from '../DepositPanel'

function mockUserAgent(ua: string) {
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true })
}

const baseProps = {
  amount: 50,
  bitPhone: '0501234567',
  onMarkPaid: jest.fn(),
  marking: false,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
  Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } })
})

describe('DepositPanel', () => {
  it('shows plain transfer instructions (no deep link) on desktop', () => {
    render(<DepositPanel {...baseProps} status="AWAITING_PAYMENT" />)

    expect(screen.getByText('נדרשת מקדמה של ₪50 דרך Bit')).toBeInTheDocument()
    expect(screen.getByText(/פתחי את אפליקציית Bit בטלפון שלך/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'פתחי את Bit' })).not.toBeInTheDocument()
  })

  it('shows a deep-link button on mobile, in addition to the copy fallback', () => {
    mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')
    render(<DepositPanel {...baseProps} status="AWAITING_PAYMENT" />)

    const link = screen.getByRole('link', { name: 'פתחי את Bit' })
    expect(link).toHaveAttribute('href', 'bit://pay/972501234567?amount=50')
  })

  it('copies the phone and amount independently on click', async () => {
    render(<DepositPanel {...baseProps} status="AWAITING_PAYMENT" />)

    fireEvent.click(screen.getByRole('button', { name: 'העתקת מספר טלפון לביט' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('0501234567')

    fireEvent.click(screen.getByRole('button', { name: 'העתקת סכום המקדמה' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('50')
  })

  it('calls onMarkPaid when "כבר שילמתי" is clicked', () => {
    const onMarkPaid = jest.fn()
    render(<DepositPanel {...baseProps} status="AWAITING_PAYMENT" onMarkPaid={onMarkPaid} />)

    fireEvent.click(screen.getByRole('button', { name: 'כבר שילמתי' }))
    expect(onMarkPaid).toHaveBeenCalledTimes(1)
  })

  it('disables the button while marking', () => {
    render(<DepositPanel {...baseProps} status="AWAITING_PAYMENT" marking />)

    expect(screen.getByRole('button', { name: 'כבר שילמתי' })).toBeDisabled()
  })

  it('shows a pending-confirmation message and no instructions once CLIENT_MARKED_PAID', () => {
    render(<DepositPanel {...baseProps} status="CLIENT_MARKED_PAID" />)

    expect(screen.getByText('סימנת ששילמת — ממתינה לאישור הנייליסטית')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /כבר שילמתי/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/פתחי את אפליקציית Bit/)).not.toBeInTheDocument()
  })

  it('shows a confirmed state with no actions once NAILIST_CONFIRMED', () => {
    render(<DepositPanel {...baseProps} status="NAILIST_CONFIRMED" />)

    expect(screen.getByText('המקדמה של ₪50 התקבלה ואושרה')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
