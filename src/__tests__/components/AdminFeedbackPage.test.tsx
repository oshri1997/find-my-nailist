import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminFeedbackPage from '@/app/admin/feedback/page'

const firstFeedback = {
  id: 'report-1',
  reporterUid: 'user-1',
  reporterEmail: 'dana@example.com',
  reporterDisplayName: 'דנה לוי',
  reporterRole: 'CLIENT',
  type: 'BUG',
  subject: 'אי אפשר לבחור שעה',
  description: 'אני לוחצת על שעה והיא לא נשמרת.',
  status: 'NEW',
  priority: 'NORMAL',
  pageUrl: '/nailists/abc?from=search',
  appVersion: '1.6.0',
  internalNote: null,
  createdAt: '2026-08-31T08:00:00.000Z',
  updatedAt: '2026-08-31T08:00:00.000Z',
}

const secondFeedback = {
  ...firstFeedback,
  id: 'report-2',
  subject: 'רעיון לתזכורת',
  type: 'IDEA',
  status: 'IN_REVIEW',
  priority: 'HIGH',
  reporterDisplayName: 'נועה כהן',
}

type TestFeedback = Omit<typeof firstFeedback, 'internalNote'> & { internalNote: string | null }

function response(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response
}

function listResponse(data: TestFeedback[] = [firstFeedback], overrides: Partial<Record<string, unknown>> = {}) {
  return response({
    data,
    counts: { NEW: 1, IN_REVIEW: 1, PLANNED: 0, RESOLVED: 0, CLOSED: 0, total: data.length },
    pagination: { nextCursor: null },
    ...overrides,
  })
}

describe('AdminFeedbackPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(listResponse())
  })

  it('shows feedback, safe report context, and opens the manager details panel', async () => {
    render(<AdminFeedbackPage />)

    expect(await screen.findByRole('button', { name: 'פתיחת פנייה אי אפשר לבחור שעה' })).toBeInTheDocument()
    expect(screen.getByText('דנה לוי')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'פתיחת פנייה אי אפשר לבחור שעה' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByText('אני לוחצת על שעה והיא לא נשמרת.')).not.toHaveLength(0)
    expect(screen.getByText('dana@example.com')).toBeInTheDocument()
    const pageLink = screen.getByRole('link', { name: /nailists\/abc/ })
    expect(pageLink).toHaveAttribute('href', expect.stringContaining('/nailists/abc?from=search'))
    expect(screen.queryByText(/Mozilla|userAgent|searchTerms/i)).not.toBeInTheDocument()
  })

  it('opens a canonical Nailistiot production page in a new tab', async () => {
    const productionFeedback = { ...firstFeedback, pageUrl: 'https://nailistiot.fun/search?city=%D7%AA%D7%9C-%D7%90%D7%91%D7%99%D7%91' }
    ;(global.fetch as jest.Mock).mockResolvedValue(listResponse([productionFeedback]))
    render(<AdminFeedbackPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'פתיחת פנייה אי אפשר לבחור שעה' }))
    const pageLink = screen.getByRole('link', { name: /search/ })
    expect(pageLink).toHaveAttribute('href', productionFeedback.pageUrl)
    expect(pageLink).toHaveAttribute('target', '_blank')
  })

  it('does not expose a clickable link for external or legacy report URLs', async () => {
    const externalFeedback = { ...firstFeedback, pageUrl: 'https://nailistiot.up.railway.app/search?city=tel-aviv' }
    ;(global.fetch as jest.Mock).mockResolvedValue(listResponse([externalFeedback]))
    render(<AdminFeedbackPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'פתיחת פנייה אי אפשר לבחור שעה' }))
    expect(screen.getByText('העמוד אינו זמין')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /search/i })).not.toBeInTheDocument()
  })

  it('sends selected filters and a committed one-token search to the list API', async () => {
    render(<AdminFeedbackPage />)
    await screen.findByRole('button', { name: 'פתיחת פנייה אי אפשר לבחור שעה' })
    const fetchMock = global.fetch as jest.Mock
    fetchMock.mockClear()

    fireEvent.change(screen.getByLabelText('סינון לפי סוג'), { target: { value: 'BUG' } })
    fireEvent.change(screen.getByLabelText('סינון לפי עדיפות'), { target: { value: 'HIGH' } })
    fireEvent.change(screen.getByLabelText('חיפוש פניות'), { target: { value: 'שעה' } })
    fireEvent.submit(screen.getByRole('button', { name: 'חיפוש' }).closest('form')!)

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([url]) => String(url))
      expect(urls.some((url) => url.includes('type=BUG') && url.includes('priority=HIGH') && url.includes('q=%D7%A9%D7%A2%D7%94'))).toBe(true)
    })
  })

  it('loads the next cursor page without replacing current reports', async () => {
    const fetchMock = global.fetch as jest.Mock
    fetchMock
      .mockResolvedValueOnce(listResponse([firstFeedback], { pagination: { nextCursor: 'cursor-1' } }))
      .mockResolvedValueOnce(listResponse([secondFeedback]))
    render(<AdminFeedbackPage />)
    await screen.findByRole('button', { name: 'פתיחת פנייה אי אפשר לבחור שעה' })

    fireEvent.click(screen.getByRole('button', { name: 'טען עוד' }))
    expect(await screen.findAllByText('רעיון לתזכורת')).not.toHaveLength(0)
    expect(screen.getAllByText('אי אפשר לבחור שעה')).not.toHaveLength(0)
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('cursor=cursor-1'))).toBe(true)
  })

  it('saves manager changes and refreshes the visible report', async () => {
    const updated = { ...firstFeedback, status: 'IN_REVIEW', priority: 'HIGH', internalNote: 'לשחזר במובייל' }
    const fetchMock = global.fetch as jest.Mock
    fetchMock
      .mockResolvedValueOnce(listResponse())
      .mockResolvedValueOnce(response({ data: updated, changed: true }))
      .mockResolvedValueOnce(listResponse([updated]))
    render(<AdminFeedbackPage />)
    await screen.findByRole('button', { name: 'פתיחת פנייה אי אפשר לבחור שעה' })
    fireEvent.click(screen.getByRole('button', { name: 'פתיחת פנייה אי אפשר לבחור שעה' }))

    fireEvent.change(screen.getByLabelText('סטטוס הפנייה'), { target: { value: 'IN_REVIEW' } })
    fireEvent.change(screen.getByLabelText('עדיפות הפנייה'), { target: { value: 'HIGH' } })
    fireEvent.change(screen.getByLabelText('הערה פנימית'), { target: { value: 'לשחזר במובייל' } })
    fireEvent.click(screen.getByRole('button', { name: 'שמרי שינויים' }))

    expect(await screen.findByRole('status')).toHaveTextContent('השינויים נשמרו')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/feedback/report-1', expect.objectContaining({ method: 'PATCH' })))
    const [, request] = fetchMock.mock.calls[1]
    expect(JSON.parse(request.body)).toEqual({ status: 'IN_REVIEW', priority: 'HIGH', internalNote: 'לשחזר במובייל' })
  })

  it('shows an actionable error for unauthorized or failed list requests', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue(response({ error: 'אין הרשאה לצפות בפניות' }, false, 401))
    render(<AdminFeedbackPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('אין הרשאה לצפות בפניות')
    expect(screen.getByRole('button', { name: 'נסי שוב' })).toBeInTheDocument()
  })
})
