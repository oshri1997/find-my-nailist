/**
 * The app must never show two loading animations for a single wait.
 *
 * AuthProvider owns one global full-screen layer while Firebase restores the
 * account; every page-level loading state goes through <PageLoader>, which
 * stands down while that layer is up. These tests lock that invariant in: a
 * regression here is exactly the "two spinners after logging in" bug.
 */
import { act, render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/components/auth/auth-provider'
import { PageLoader } from '@/components/ui/page-loader'

const initFirebase = jest.fn()
let mockPathname = '/login'

jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }))

jest.mock('@/lib/firebase/client', () => ({
  initFirebase: (...args: unknown[]) => initFirebase(...args),
}))

// Each NailLoader renders exactly one polish brush, so counting brushes counts
// the loading animations actually on screen.
function loaderCount(container: HTMLElement) {
  return container.querySelectorAll('[data-testid="nail-polish-brush"]').length
}

function SignInProbe() {
  const { setSignInPending } = useAuth()
  return <button onClick={() => setSignInPending(true)}>התחברי</button>
}

describe('single global loader', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPathname = '/login'
  })

  it('shows only the global loader while the account is still resolving', () => {
    // Never resolves — the window where AuthProvider's own layer is visible.
    initFirebase.mockReturnValue(new Promise(() => {}))

    const { container } = render(
      <AuthProvider>
        <PageLoader text="מתחברת..." />
      </AuthProvider>
    )

    expect(screen.getByRole('status', { name: 'טוענת את החשבון' })).toBeInTheDocument()
    expect(loaderCount(container)).toBe(1)
    expect(screen.queryByText('מתחברת...')).not.toBeInTheDocument()
  })

  it('hands over to the page loader once the account has resolved', async () => {
    // No Firebase clients configured — AuthProvider releases its layer at once.
    initFirebase.mockResolvedValue(null)

    const { container } = render(
      <AuthProvider>
        <PageLoader text="מתחברת..." />
      </AuthProvider>
    )

    await waitFor(() => expect(screen.getByText('מתחברת...')).toBeInTheDocument())
    expect(screen.queryByRole('status', { name: 'טוענת את החשבון' })).not.toBeInTheDocument()
    expect(loaderCount(container)).toBe(1)
  })

  it('keeps the global layer opaque so nothing can read through it as a second spinner', () => {
    initFirebase.mockReturnValue(new Promise(() => {}))

    const { container } = render(
      <AuthProvider>
        <div>תוכן</div>
      </AuthProvider>
    )

    const overlay = container.querySelector('.fixed.inset-0')
    expect(overlay).toHaveClass('bg-background')
    expect(overlay?.className).not.toMatch(/bg-background\//)
  })

  it('uses one uninterrupted global loader from sign-in until the destination mounts', async () => {
    initFirebase.mockResolvedValue(null)

    const content = <><SignInProbe /><PageLoader text="מתחברת..." /></>
    const { container, rerender } = render(<AuthProvider>{content}</AuthProvider>)

    await waitFor(() => expect(screen.getByText('מתחברת...')).toBeInTheDocument())
    act(() => screen.getByRole('button', { name: 'התחברי' }).click())

    expect(screen.getByText('מכינות לך את החוויה')).toBeInTheDocument()
    expect(screen.queryByText('מתחברת...')).not.toBeInTheDocument()
    expect(loaderCount(container)).toBe(1)

    rerender(<AuthProvider>{content}</AuthProvider>)
    expect(screen.getByText('מכינות לך את החוויה')).toBeInTheDocument()
    expect(loaderCount(container)).toBe(1)

    mockPathname = '/'
    rerender(<AuthProvider>{content}</AuthProvider>)
    await waitFor(() => expect(screen.queryByText('מכינות לך את החוויה')).not.toBeInTheDocument())
  })
})
