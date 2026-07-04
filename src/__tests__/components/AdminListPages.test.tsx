/**
 * Covers the admin nailists/users/reviews pages' header counts: the list
 * endpoints cap at 200 rows, so the header must show the real uncapped
 * total from /api/admin/stats rather than the loaded array's length.
 */
import { render, screen, waitFor } from '@testing-library/react'
import AdminNailistsPage from '@/app/admin/nailists/page'
import AdminUsersPage from '@/app/admin/users/page'
import AdminReviewsPage from '@/app/admin/reviews/page'

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { uid: 'admin-1' }, refreshRole: jest.fn() }),
}))

const stats = {
  totalUsers: 350,
  totalNailistProfiles: 240,
  activeNailists: 200,
  totalReviews: 410,
}

function mockFetchFor(listPath: string, listData: unknown[]) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.startsWith(listPath)) {
      return Promise.resolve({ ok: true, json: async () => ({ data: listData }) } as Response)
    }
    if (url.startsWith('/api/admin/stats')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: stats }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
  })
}

describe('Admin list pages — header shows real total, not just loaded rows', () => {
  it('nailists page shows the uncapped profile/active counts from stats, not the 200-row list length', async () => {
    mockFetchFor('/api/admin/nailists', Array.from({ length: 200 }, (_, i) => ({
      id: `n${i}`, userId: '', businessName: `N${i}`, city: '', isActive: true,
      isVerified: false, avgRating: 0, reviewCount: 0, createdAt: null,
    })))
    render(<AdminNailistsPage />)
    await waitFor(() => {
      expect(screen.getByText(/240 נייליסטיות סה״כ/)).toBeInTheDocument()
    })
    expect(screen.getByText(/200 פעילות/)).toBeInTheDocument()
  })

  it('users page shows the uncapped total from stats when not searching', async () => {
    mockFetchFor('/api/admin/users', Array.from({ length: 200 }, (_, i) => ({
      id: `u${i}`, email: `u${i}@test.com`, displayName: `U${i}`, photoUrl: null,
      role: 'CLIENT', isAdmin: false, createdAt: null,
    })))
    render(<AdminUsersPage />)
    await waitFor(() => {
      expect(screen.getByText(/350 משתמשים סה״כ/)).toBeInTheDocument()
    })
  })

  it('reviews page shows the uncapped total from stats, not the 200-row list length', async () => {
    mockFetchFor('/api/admin/reviews', Array.from({ length: 200 }, (_, i) => ({
      id: `r${i}`, nailistProfileId: '', nailistBusinessName: '', clientDisplayName: '',
      rating: 5, comment: '', createdAt: null,
    })))
    render(<AdminReviewsPage />)
    await waitFor(() => {
      expect(screen.getByText(/410 ביקורות סה״כ/)).toBeInTheDocument()
    })
  })
})
