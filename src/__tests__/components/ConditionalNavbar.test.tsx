/**
 * Covers the fix where the Navbar used to be mounted individually by every
 * page, so it remounted (and replayed its slide-down entrance animation) on
 * every client-side navigation. It now lives once in the root layout via
 * ConditionalNavbar, which hides itself on routes that render their own nav
 * (admin/dashboard/auth/onboarding) and stays mounted everywhere else.
 */
import { render, screen } from '@testing-library/react'
import { ConditionalNavbar } from '@/components/layout/conditional-navbar'

const mockUsePathname = jest.fn()
jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

jest.mock('@/components/layout/navbar', () => ({
  Navbar: () => <div data-testid="navbar" />,
}))

describe('ConditionalNavbar', () => {
  it.each(['/', '/search', '/how-it-works', '/nailists/abc123', '/cities/tel-aviv', '/my-appointments'])(
    'renders the Navbar on %s',
    (path) => {
      mockUsePathname.mockReturnValue(path)
      render(<ConditionalNavbar />)
      expect(screen.getByTestId('navbar')).toBeInTheDocument()
    }
  )

  it.each([
    '/admin',
    '/admin/analytics',
    '/dashboard/nailist',
    '/onboarding',
    '/onboarding/client',
    '/login',
    '/register',
    '/forgot-password',
    '/appointments/confirmed',
  ])('hides the Navbar on %s', (path) => {
    mockUsePathname.mockReturnValue(path)
    render(<ConditionalNavbar />)
    expect(screen.queryByTestId('navbar')).not.toBeInTheDocument()
  })
})
