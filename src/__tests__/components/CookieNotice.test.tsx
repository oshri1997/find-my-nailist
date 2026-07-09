import { render, screen, fireEvent } from '@testing-library/react'
import { CookieNotice } from '@/components/layout/cookie-notice'

beforeEach(() => {
  localStorage.clear()
})

describe('CookieNotice', () => {
  it('shows the notice on first visit', () => {
    render(<CookieNotice />)
    expect(screen.getByText(/אנו מכבדים את פרטיותכם/)).toBeInTheDocument()
  })

  it('dismissing it hides it and remembers the choice', () => {
    render(<CookieNotice />)
    fireEvent.click(screen.getByRole('button', { name: 'הבנתי' }))
    expect(screen.queryByText(/אנו מכבדים את פרטיותכם/)).not.toBeInTheDocument()
    expect(localStorage.getItem('cookieNoticeDismissed')).toBe('1')
  })

  it('does not render again once already dismissed', () => {
    localStorage.setItem('cookieNoticeDismissed', '1')
    const { container } = render(<CookieNotice />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders strictly between the z-40 mobile dashboard/admin chrome and the z-50+ modal tier', () => {
    // Regression, two-sided:
    // 1) This banner and BookingModal's overlay were both z-50 and, being
    //    mounted later in the DOM (layout.tsx renders it after Providers),
    //    this won the stacking tie and blocked clicks on the modal's confirm
    //    button near the bottom of the screen on small viewports.
    // 2) The z-30 "fix" for #1 overshot — it's also below the z-40 fixed
    //    bottom nav on /dashboard and /admin, so the banner silently
    //    rendered *underneath* that chrome and was neither visible nor
    //    dismissible on those routes on mobile.
    const { container } = render(<CookieNotice />)
    const banner = container.firstElementChild as HTMLElement
    const match = banner.className.match(/\bz-\[(\d+)\]|\bz-(\d+)\b/)
    expect(match).not.toBeNull()
    const zIndex = Number(match![1] ?? match![2])
    expect(zIndex).toBeGreaterThan(40)
    expect(zIndex).toBeLessThan(50)
  })
})
