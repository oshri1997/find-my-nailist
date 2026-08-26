/**
 * AuthProvider used to hide `children` behind a full-screen spinner while
 * `loading` was true — and `loading` starts `true` and only ever flips to
 * `false` inside a client-only effect (Firebase auth resolution), so it is
 * *always* true during server-side rendering. That meant the server-
 * rendered HTML for every route in the app was just the spinner shell, with
 * none of the real page content — invisible to any crawler that doesn't
 * execute JavaScript. This locks in the fix: children must always render,
 * synchronously, regardless of the loading state.
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

  it('does not render a blocking full-screen loader over the content', () => {
    const { container } = render(
      <AuthProvider>
        <main data-testid="page-content">content</main>
      </AuthProvider>
    )

    expect(screen.getByTestId('page-content')).toBeInTheDocument()
    expect(container.querySelector('.fixed.inset-0')).not.toBeInTheDocument()
  })
})
