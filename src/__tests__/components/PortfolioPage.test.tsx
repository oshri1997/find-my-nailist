/**
 * Covers the removal of the "set cover photo" star-picker UI — the profile
 * hero is a fixed gradient now, so there's no more "choose a background photo"
 * flow. This test guards against it silently coming back.
 */
import { render, screen, waitFor } from '@testing-library/react'
import PortfolioPage from '@/app/dashboard/nailist/portfolio/page'

const photos = [
  { id: 'p1', url: 'https://example.com/p1.jpg' },
  { id: 'p2', url: 'https://example.com/p2.jpg' },
]

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('/api/me/nailist-profile')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: { id: 'nailist-1' } }) } as Response)
    }
    if (url.includes('/api/portfolio')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: photos }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
})

describe('PortfolioPage — cover photo picker removed', () => {
  it('does not render any "set as cover" star button or cover badge', async () => {
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getAllByRole('img')).toHaveLength(photos.length)
    })

    expect(screen.queryByText('רקע')).not.toBeInTheDocument()
    expect(screen.queryByTitle('הגדירי כתמונת רקע לכרטיס')).not.toBeInTheDocument()
    expect(screen.queryByTitle('הסרי תמונת רקע')).not.toBeInTheDocument()
    expect(screen.queryByText(/לחצי על הכוכב/)).not.toBeInTheDocument()
  })

  it('does not send coverPhotoUrl PATCH requests to /api/nailists on load', async () => {
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getAllByRole('img')).toHaveLength(photos.length)
    })

    const calls = (global.fetch as jest.Mock).mock.calls.map(([url]: [string]) => url)
    expect(calls.some((u) => u.includes('/api/nailists/'))).toBe(false)
  })
})
