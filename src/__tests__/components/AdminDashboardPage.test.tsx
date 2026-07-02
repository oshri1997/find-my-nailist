/**
 * Covers the removal of the admin dashboard's "Quick nav" card grid — it
 * duplicated links already in the persistent admin sidebar/drawer nav
 * (src/app/admin/layout.tsx), the same redundancy pattern removed from the
 * nailist dashboard's old "quick actions" card.
 */
import { render, screen, waitFor } from '@testing-library/react'
import AdminDashboard from '@/app/admin/page'

const stats = {
  totalUsers: 10,
  totalNailists: 4,
  totalClients: 6,
  activeNailists: 3,
  totalAppointments: 20,
  appointmentsByStatus: { PENDING: 2, CONFIRMED: 5, COMPLETED: 12, CANCELLED: 1 },
  totalReviews: 8,
  avgRating: 4.5,
  newUsersThisWeek: 2,
  totalRevenue: 3000,
}

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: stats }) } as Response)
})

describe('AdminDashboard — quick nav grid removed', () => {
  it('does not render duplicate links to /admin/users, /admin/nailists, /admin/appointments, /admin/reviews', async () => {
    const { container } = render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByText('דשבורד')).toBeInTheDocument()
    })

    expect(screen.queryByText('ניהול משתמשים')).not.toBeInTheDocument()
    expect(screen.queryByText('ניהול נייליסטיות')).not.toBeInTheDocument()
    const quickNavLinks = Array.from(container.querySelectorAll('a')).filter((a) =>
      ['/admin/users', '/admin/nailists', '/admin/appointments', '/admin/reviews'].includes(a.getAttribute('href') ?? '')
    )
    expect(quickNavLinks).toHaveLength(0)
  })

  it('still renders the stats and status breakdown', async () => {
    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByText('סה״כ משתמשים')).toBeInTheDocument()
    })
    expect(screen.getByText('הזמנות לפי סטטוס')).toBeInTheDocument()
  })
})
