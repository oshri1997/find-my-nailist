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

  // Regression: this banner and BookingModal's overlay were both z-50 and,
  // being mounted later in the DOM (layout.tsx renders it after Providers),
  // this won the stacking tie and blocked clicks on the modal's confirm
  // button near the bottom of the screen — a real click-blocking bug on
  // small viewports, not just a test artifact. Must stay below every modal.
  it('stays below modal z-index tiers (z-50 and up) so it never blocks clicks on active dialogs', () => {
    const { container } = render(<CookieNotice />)
    const banner = container.firstElementChild as HTMLElement
    expect(banner.className).toMatch(/\bz-(0|10|20|30|40)\b/)
    expect(banner.className).not.toMatch(/\bz-50\b/)
  })
})
