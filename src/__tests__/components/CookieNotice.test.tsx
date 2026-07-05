import { render, screen, fireEvent } from '@testing-library/react'
import { CookieNotice } from '@/components/layout/cookie-notice'

beforeEach(() => {
  localStorage.clear()
})

describe('CookieNotice', () => {
  it('shows the notice on first visit', () => {
    render(<CookieNotice />)
    expect(screen.getByText(/האתר משתמש בעוגיות חיוניות בלבד/)).toBeInTheDocument()
  })

  it('dismissing it hides it and remembers the choice', () => {
    render(<CookieNotice />)
    fireEvent.click(screen.getByRole('button', { name: 'הבנתי' }))
    expect(screen.queryByText(/האתר משתמש בעוגיות חיוניות בלבד/)).not.toBeInTheDocument()
    expect(localStorage.getItem('cookieNoticeDismissed')).toBe('1')
  })

  it('does not render again once already dismissed', () => {
    localStorage.setItem('cookieNoticeDismissed', '1')
    const { container } = render(<CookieNotice />)
    expect(container).toBeEmptyDOMElement()
  })
})
