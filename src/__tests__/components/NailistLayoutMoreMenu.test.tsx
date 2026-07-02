/**
 * Covers the "פרופיל ציבורי" (public profile) shortcut that replaced the old
 * "quick actions" card on the dashboard home page — it now lives in the
 * dashboard layout's "עוד" (more) menu (mobile) and sidebar (desktop), with
 * its href resolved dynamically from the caller's own nailist profile id.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import DashboardLayout from '@/app/dashboard/layout'

// jsdom has no matchMedia — the layout renders <ThemeToggle> which reads it on mount.
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
})

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => '/dashboard/nailist',
}))

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { uid: 'nailist-user-1', displayName: 'Oshri Test' }, signOut: jest.fn() }),
}))

function mockFetch(profileId: string | null | Promise<unknown>) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('/api/me/role')) {
      return Promise.resolve({ ok: true, json: async () => ({ role: 'NAILIST' }) } as Response)
    }
    if (url.includes('/api/me/nailist-profile')) {
      if (profileId instanceof Promise) return profileId
      return Promise.resolve({ ok: true, json: async () => ({ data: profileId ? { id: profileId } : null }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

async function openMoreMenu() {
  render(<DashboardLayout>content</DashboardLayout>)
  await waitFor(() => expect(screen.getAllByText('עוד')[0]).toBeInTheDocument())
  fireEvent.click(screen.getAllByText('עוד')[0])
}

describe('Dashboard layout — public profile shortcut', () => {
  it('disables the public-profile link until the profile id has loaded', async () => {
    let resolveProfile: (value: unknown) => void = () => {}
    const pending = new Promise((resolve) => { resolveProfile = resolve })
    mockFetch(pending)

    await openMoreMenu()

    // Rendered twice (desktop sidebar + mobile "more" sheet) — both driven by the
    // same resolveHref/profileId state, so checking either instance proves the logic.
    await waitFor(() => expect(screen.getAllByText('פרופיל ציבורי').length).toBeGreaterThan(0))
    const link = screen.getAllByText('פרופיל ציבורי')[0].closest('a')!
    expect(link).toHaveAttribute('aria-disabled', 'true')
    expect(link).toHaveAttribute('href', '#')

    resolveProfile({ ok: true, json: async () => ({ data: { id: 'nailist-42' } }) })

    await waitFor(() => {
      const resolvedLink = screen.getAllByText('פרופיל ציבורי')[0].closest('a')!
      expect(resolvedLink).toHaveAttribute('href', '/nailists/nailist-42')
      expect(resolvedLink).not.toHaveAttribute('aria-disabled', 'true')
    })
  })

  it('links directly to /nailists/[id] once the profile has loaded', async () => {
    mockFetch('nailist-42')
    await openMoreMenu()

    await waitFor(() => {
      const link = screen.getAllByText('פרופיל ציבורי')[0].closest('a')!
      expect(link).toHaveAttribute('href', '/nailists/nailist-42')
    })
  })

  it('static shortcuts (hours, portfolio, reviews) remain functional while the profile is still loading', async () => {
    let resolveProfile: (value: unknown) => void = () => {}
    mockFetch(new Promise((resolve) => { resolveProfile = resolve }))
    await openMoreMenu()

    await waitFor(() => expect(screen.getAllByText('שעות פעילות').length).toBeGreaterThan(0))
    const hoursLink = screen.getAllByText('שעות פעילות')[0].closest('a')!
    expect(hoursLink).toHaveAttribute('href', '/dashboard/nailist/hours')
    expect(hoursLink).not.toHaveAttribute('aria-disabled', 'true')

    resolveProfile({ ok: true, json: async () => ({ data: null }) })
  })
})
