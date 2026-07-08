import { render, screen, waitFor } from '@testing-library/react'
import AdminAuditLogPage from '@/app/admin/audit-log/page'

function mockFetchWith(entries: unknown[]) {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: entries }) } as Response)
}

describe('AdminAuditLogPage', () => {
  it('renders a Hebrew label and readable details for each action type', async () => {
    mockFetchWith([
      {
        id: '1', actorEmail: 'admin@test.com', action: 'USER_ROLE_CHANGE',
        targetType: 'user', targetId: 'u1',
        metadata: { targetEmail: 'user@test.com', oldRole: 'CLIENT', newRole: 'NAILIST' },
        createdAt: '2026-01-01T10:00:00.000Z',
      },
      {
        id: '2', actorEmail: 'admin@test.com', action: 'USER_DELETE',
        targetType: 'user', targetId: 'u2',
        metadata: { email: 'deleted@test.com', role: 'CLIENT' },
        createdAt: '2026-01-01T11:00:00.000Z',
      },
      {
        id: '3', actorEmail: 'admin@test.com', action: 'REVIEW_DELETE',
        targetType: 'review', targetId: 'r1',
        metadata: { rating: 2, clientDisplayName: 'דנה כ.' },
        createdAt: '2026-01-01T12:00:00.000Z',
      },
      {
        id: '4', actorEmail: 'admin@test.com', action: 'NAILIST_TOGGLE_ACTIVE',
        targetType: 'nailistProfile', targetId: 'n1',
        metadata: { isActive: false },
        createdAt: '2026-01-01T13:00:00.000Z',
      },
      {
        id: '5', actorEmail: 'admin@test.com', action: 'USER_SUSPEND',
        targetType: 'user', targetId: 'u3',
        metadata: { email: 'suspended@test.com' },
        createdAt: '2026-01-01T14:00:00.000Z',
      },
      {
        id: '6', actorEmail: 'admin@test.com', action: 'NAILIST_TOGGLE_VERIFIED',
        targetType: 'nailistProfile', targetId: 'n2',
        metadata: { isVerified: true },
        createdAt: '2026-01-01T15:00:00.000Z',
      },
    ])

    render(<AdminAuditLogPage />)

    await waitFor(() => {
      expect(screen.getByText('שינוי תפקיד')).toBeInTheDocument()
    })
    expect(screen.getByText(/user@test.com: CLIENT ← NAILIST/)).toBeInTheDocument()
    expect(screen.getByText('מחיקת משתמש')).toBeInTheDocument()
    expect(screen.getByText(/deleted@test.com \(CLIENT\)/)).toBeInTheDocument()
    expect(screen.getByText('מחיקת ביקורת')).toBeInTheDocument()
    expect(screen.getByText(/דירוג 2 מאת דנה כ\./)).toBeInTheDocument()
    expect(screen.getByText('שינוי סטטוס נייליסטית')).toBeInTheDocument()
    expect(screen.getByText('הושבתה')).toBeInTheDocument()
    expect(screen.getByText('השעיית משתמש')).toBeInTheDocument()
    expect(screen.getByText('suspended@test.com')).toBeInTheDocument()
    expect(screen.getByText('שינוי אימות נייליסטית')).toBeInTheDocument()
    expect(screen.getByText('אומתה')).toBeInTheDocument()
  })

  it('shows an empty state when there are no entries', async () => {
    mockFetchWith([])
    render(<AdminAuditLogPage />)
    await waitFor(() => {
      expect(screen.getByText('אין פעולות עדיין')).toBeInTheDocument()
    })
  })
})
