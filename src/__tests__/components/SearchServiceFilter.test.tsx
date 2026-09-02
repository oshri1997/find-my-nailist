import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SearchPage from '@/app/search/page'

jest.mock('@/components/layout/navbar', () => ({ Navbar: () => null }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: null }),
}))

beforeEach(() => {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('/api/nailists')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: [], hasMore: false }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
})

describe('Search page — compact service filter', () => {
  it('keeps service choices out of the toolbar until the service picker is opened', async () => {
    const user = userEvent.setup()
    render(<SearchPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'בחירת שירות' })).toBeInTheDocument())

    expect(screen.queryByText("ג'ל")).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'בחירת שירות' }))
    expect(screen.getByText("ג'ל")).toBeInTheDocument()
  })

  it('shows the selected service in the compact picker after closing the menu', async () => {
    const user = userEvent.setup()
    render(<SearchPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'בחירת שירות' })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'בחירת שירות' }))
    await user.click(screen.getByText("ג'ל"))

    expect(screen.queryByText('בחירת שירות')).not.toBeInTheDocument()
    expect(screen.getByText('מציגות ג\'ל')).toBeInTheDocument()
  })
})
