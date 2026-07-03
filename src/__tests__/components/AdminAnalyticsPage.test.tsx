import { render, screen, waitFor } from '@testing-library/react'
import AdminAnalyticsPage from '@/app/admin/analytics/page'

const data = {
  sampledEvents: 42,
  topQueries: [{ value: 'רחובות', count: 5 }],
  topFilters: [{ value: "ג'ל", count: 8 }],
  zeroResultQueries: [{ value: 'אקסטנשן ברמלה', count: 2 }],
}

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data }) } as Response)
})

describe('AdminAnalyticsPage', () => {
  it('renders the sampled event count and each section', async () => {
    render(<AdminAnalyticsPage />)

    await waitFor(() => expect(screen.getByText('אנלטיקה')).toBeInTheDocument())

    expect(screen.getByText(/42/)).toBeInTheDocument()
    expect(screen.getByText('רחובות')).toBeInTheDocument()
    expect(screen.getByText("ג'ל")).toBeInTheDocument()
    expect(screen.getByText('אקסטנשן ברמלה')).toBeInTheDocument()
  })

  it('shows an empty-state message when a section has no data', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { ...data, zeroResultQueries: [] } }),
    } as Response)
    render(<AdminAnalyticsPage />)

    await waitFor(() => expect(screen.getByText('כל החיפושים החזירו תוצאות')).toBeInTheDocument())
  })
})
