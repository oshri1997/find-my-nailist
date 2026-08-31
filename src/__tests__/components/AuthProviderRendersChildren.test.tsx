/**
 * During auth restoration, the user sees a full-screen NailLoader. The page
 * itself must still render synchronously underneath it, so server-rendered
 * content remains available to crawlers and the overlay can disappear without
 * mounting the page a second time.
 */
import { render, screen } from '@testing-library/react'
import { AuthProvider } from '@/components/auth/auth-provider'

jest.mock('@/lib/firebase/client', () => ({
  // Never resolves within the test's lifetime — simulates the SSR/initial-
  // paint window where Firebase auth state is still unresolved.
  initFirebase: jest.fn(() => new Promise(() => {})),
}))

describe('AuthProvider — renders children immediately', () => {
  it('renders children synchronously on first render, before auth state resolves', () => {
    render(
      <AuthProvider>
        <h1>מצאי את הנייליסטית המושלמת עבורך</h1>
        <p data-testid="marketing-copy">גלי מאות מומחיות ציפורניים בקרבתך</p>
      </AuthProvider>
    )

    expect(screen.getByRole('heading', { name: 'מצאי את הנייליסטית המושלמת עבורך' })).toBeInTheDocument()
    expect(screen.getByTestId('marketing-copy')).toBeInTheDocument()
  })

  it('shows a full-screen NailLoader over already-rendered content while auth resolves', () => {
    const { container } = render(
      <AuthProvider>
        <main data-testid="page-content">content</main>
      </AuthProvider>
    )

    expect(screen.getByTestId('page-content')).toBeInTheDocument()
    expect(container.querySelector('.fixed.inset-0')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'טוען את החשבון' })).toBeInTheDocument()
  })
})
