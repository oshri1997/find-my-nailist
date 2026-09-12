/**
 * Search skeleton markup must not depend on browser storage during its first
 * render. Otherwise a remembered count makes client HTML differ from server
 * HTML and causes a React hydration mismatch.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import SearchPage from '@/app/search/page'

jest.mock('@/components/layout/navbar', () => ({ Navbar: () => null }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: null }),
}))

describe('Search page hydration', () => {
  it('uses the same initial skeleton count when browser storage has a saved value', () => {
    localStorage.setItem('nailists-count', '7')

    const markup = renderToStaticMarkup(<SearchPage />)

    expect((markup.match(/animate-pulse/g) ?? [])).toHaveLength(3)
  })
})
