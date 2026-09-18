import { fireEvent, render, screen, waitFor } from '@/__tests__/utils/render'
import { AnnouncementModal } from '@/components/announcements/AnnouncementModal'

const mockUseAuth = jest.fn()
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}))

const baseAuth = {
  user: { uid: 'nailist-1' },
  loading: false,
  role: 'NAILIST',
  onboardingCompleted: true,
  verificationReminderActive: false,
}

const item = {
  id: 'ann-1',
  title: 'שעות עבודה מפוצלות',
  body: 'אפשר להגדיר כמה חלונות זמינות ביום',
  audience: 'ALL',
  priority: 'MAJOR',
  status: 'PUBLISHED',
  publishedAt: '2026-09-18T00:00:00.000Z',
  createdBy: 'admin-1',
  createdAt: '2026-09-18T00:00:00.000Z',
  updatedAt: '2026-09-18T00:00:00.000Z',
}

function mockFetch(items: typeof item[], hasMore = false) {
  global.fetch = jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (url === '/api/announcements') {
      return Promise.resolve({ ok: true, json: async () => ({ data: items.length ? { items, hasMore } : null }) } as Response)
    }
    if (url === '/api/announcements/seen' && opts?.method === 'POST') {
      return Promise.resolve({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('AnnouncementModal', () => {
  it('fetches and shows the modal when there is an unseen MAJOR announcement', async () => {
    mockUseAuth.mockReturnValue(baseAuth)
    mockFetch([item])
    render(<AnnouncementModal />)

    expect(await screen.findByText('שעות עבודה מפוצלות')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('never fetches while the verification reminder is active, then fetches once it clears', async () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, verificationReminderActive: true })
    mockFetch([item])
    const { rerender } = render(<AnnouncementModal />)

    await new Promise((r) => setTimeout(r, 0))
    expect(global.fetch).not.toHaveBeenCalled()

    mockUseAuth.mockReturnValue({ ...baseAuth, verificationReminderActive: false })
    rerender(<AnnouncementModal />)

    expect(await screen.findByText('שעות עבודה מפוצלות')).toBeInTheDocument()
  })

  it('does not fetch until onboarding is completed', async () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, onboardingCompleted: false })
    mockFetch([item])
    render(<AnnouncementModal />)

    await new Promise((r) => setTimeout(r, 0))
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('never shows anything for an ADMIN account', async () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, role: 'ADMIN' })
    mockFetch([item])
    render(<AnnouncementModal />)

    await new Promise((r) => setTimeout(r, 0))
    expect(global.fetch).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders nothing when there is nothing unseen', async () => {
    mockUseAuth.mockReturnValue(baseAuth)
    mockFetch([])
    render(<AnnouncementModal />)

    await new Promise((r) => setTimeout(r, 0))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closing marks it seen and hides the modal, on every dismissal path', async () => {
    mockUseAuth.mockReturnValue(baseAuth)
    mockFetch([item])
    render(<AnnouncementModal />)

    await screen.findByText('שעות עבודה מפוצלות')
    fireEvent.click(screen.getByRole('button', { name: 'הבנתי, תודה!' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(global.fetch).toHaveBeenCalledWith('/api/announcements/seen', { method: 'POST' })
  })

  it('closing on Escape also marks it seen', async () => {
    mockUseAuth.mockReturnValue(baseAuth)
    mockFetch([item])
    render(<AnnouncementModal />)

    await screen.findByText('שעות עבודה מפוצלות')
    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(global.fetch).toHaveBeenCalledWith('/api/announcements/seen', { method: 'POST' })
  })

  it('points to the archive, and says more remain when the digest was capped', async () => {
    mockUseAuth.mockReturnValue(baseAuth)
    mockFetch([item], true)
    render(<AnnouncementModal />)

    const link = await screen.findByRole('link', { name: /לצפייה בכל העדכונים/ })
    expect(link).toHaveAttribute('href', '/whats-new')
    expect(link).toHaveTextContent('יש עוד')
  })
})
