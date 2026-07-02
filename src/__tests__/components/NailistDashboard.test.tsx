/**
 * Covers the "profile completion" card hiding once the checklist reaches 100%.
 * The old "quick actions" card (including the public-profile shortcut) was
 * removed from this page — see NailistLayoutMoreMenu.test.tsx for its
 * replacement in the dashboard layout's "עוד" menu.
 */
import { render, screen, waitFor } from '@testing-library/react'
import NailistDashboard from '@/app/dashboard/nailist/page'

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { displayName: 'Oshri Test', email: 'oshri@test.com' } }),
}))

const fullProfile = {
  id: 'nailist-1',
  businessName: 'סטודיו יופי',
  city: 'תל אביב',
  instagramUrl: 'https://instagram.com/studio',
}

function mockFetchResponses({
  profile = fullProfile as typeof fullProfile | null,
  hasServices = true,
  hasPhotos = true,
  hasHours = true,
}: {
  profile?: typeof fullProfile | null
  hasServices?: boolean
  hasPhotos?: boolean
  hasHours?: boolean
} = {}) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('/api/me/nailist-profile')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: profile }) } as Response)
    }
    if (url.includes('/api/portfolio')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: hasPhotos ? [{ id: 'p1' }] : [] }) } as Response)
    }
    if (url.includes('/api/services')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: hasServices ? [{ id: 's1' }] : [] }) } as Response)
    }
    if (url.includes('/api/working-hours')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: hasHours ? [{ isActive: true }] : [] }) } as Response)
    }
    if (url.includes('/api/appointments')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
    }
    if (url.includes('/api/nailists/')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: { reviews: [], avgRating: 0, reviewCount: 0 } }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('NailistDashboard — profile completion card', () => {
  it('hides the profile completion card once all checklist items are done', async () => {
    mockFetchResponses() // businessName+city+instagram+services+photos+hours -> 100%
    render(<NailistDashboard />)

    await waitFor(() => {
      expect(screen.queryByText('השלמת פרופיל')).not.toBeInTheDocument()
    })
  })

  it('shows the profile completion card when the checklist is incomplete', async () => {
    mockFetchResponses({ hasPhotos: false })
    render(<NailistDashboard />)

    // The card renders immediately at 0% before the async profile/services/photos/hours
    // fetches resolve — wait for the settled percentage, not just the heading's first paint.
    // JSX splits `{completionPct}% הושלם` into sibling text nodes — match on the <p>'s own text.
    await waitFor(() => {
      expect(
        screen.getByText((_, node) => node?.tagName === 'P' && node?.textContent === '80% הושלם')
      ).toBeInTheDocument()
    })
    expect(screen.getByText('השלמת פרופיל')).toBeInTheDocument()
  })

  it('no longer renders the old "quick actions" card', async () => {
    mockFetchResponses()
    render(<NailistDashboard />)

    await waitFor(() => {
      expect(screen.getByText('הנה סקירה של העסק שלך')).toBeInTheDocument()
    })
    expect(screen.queryByText('פעולות מהירות')).not.toBeInTheDocument()
    expect(screen.queryByText('צפייה בפרופיל ציבורי')).not.toBeInTheDocument()
  })
})
