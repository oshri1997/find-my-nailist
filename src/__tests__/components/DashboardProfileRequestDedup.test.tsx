/**
 * End-to-end counterpart to nailist-profile-cache.test.tsx: renders the real
 * dashboard layout with a real dashboard page inside it, the way a nailist
 * actually sees them, and asserts the pair costs one GET /api/me/nailist-profile
 * rather than the two it used to (layout fetched its own, page fetched its own).
 */
import { render, screen, waitFor } from '@/__tests__/utils/render'
import DashboardLayout from '@/app/dashboard/layout'
import NailistServicesPage from '@/app/dashboard/nailist/services/page'

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
  usePathname: () => '/dashboard/nailist/services',
}))

const mockUseAuth = jest.fn()
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}))

function profileRequestCount() {
  return (global.fetch as jest.Mock).mock.calls.filter(([url]: [string]) =>
    String(url).includes('/api/me/nailist-profile')
  ).length
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseAuth.mockReturnValue({
    user: { uid: 'nailist-user-1', displayName: 'Oshri Test', email: 'oshri@example.com' },
    role: 'NAILIST',
    isAdmin: false,
    signOut: jest.fn(),
  })

  global.fetch = jest.fn().mockImplementation((url: string) => {
    const href = String(url)
    if (href.includes('/api/me/role')) {
      return Promise.resolve({ ok: true, json: async () => ({ role: 'NAILIST' }) } as Response)
    }
    if (href.includes('/api/me/nailist-profile')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: { id: 'profile-1' } }) } as Response)
    }
    if (href.includes('/api/services')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
})

describe('dashboard layout + page profile requests', () => {
  it('asks for the nailist profile once for the layout and the page together', async () => {
    render(
      <DashboardLayout>
        <NailistServicesPage />
      </DashboardLayout>
    )

    // The page has finished its own load once the empty-services copy shows.
    await waitFor(() => expect(screen.getByText('אין שירותים עדיין')).toBeInTheDocument())
    // The layout resolved the same profile for its public-profile link.
    await waitFor(() => expect(profileRequestCount()).toBeGreaterThan(0))

    expect(profileRequestCount()).toBe(1)
  })
})
