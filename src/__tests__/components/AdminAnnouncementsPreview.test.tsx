/**
 * Covers the admin composer's live preview: a button that opens the real
 * AnnouncementModalView (the same component real users see), pre-filled
 * with the form's current values, rather than a hand-built mockup that
 * could drift from the real modal's design.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import AdminAnnouncementsPage from '@/app/admin/announcements/page'

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url === '/api/admin/announcements') {
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
})

describe('AdminAnnouncementsPage — live preview', () => {
  it('is disabled until both title and body are filled in', async () => {
    render(<AdminAnnouncementsPage />)
    await waitFor(() => expect(screen.getByText('עדיין לא פורסמו הכרזות')).toBeInTheDocument())

    expect(screen.getByRole('button', { name: /תצוגה מקדימה/ })).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText('לדוגמה: שעות עבודה מפוצלות'), { target: { value: 'כותרת' } })
    fireEvent.change(screen.getByPlaceholderText('ספרי בקצרה מה השתנה ולמה זה עוזר...'), { target: { value: 'תוכן' } })

    expect(screen.getByRole('button', { name: /תצוגה מקדימה/ })).not.toBeDisabled()
  })

  it('opens the real modal component with the current title and body, and closes it', async () => {
    render(<AdminAnnouncementsPage />)
    await waitFor(() => expect(screen.getByText('עדיין לא פורסמו הכרזות')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('לדוגמה: שעות עבודה מפוצלות'), { target: { value: 'שעות עבודה מפוצלות' } })
    fireEvent.change(screen.getByPlaceholderText('ספרי בקצרה מה השתנה ולמה זה עוזר...'), { target: { value: 'אפשר להגדיר כמה חלונות זמינות ביום' } })
    fireEvent.click(screen.getByRole('button', { name: /תצוגה מקדימה/ }))

    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText('שעות עבודה מפוצלות')).toBeInTheDocument()
    expect(dialog.getByText('אפשר להגדיר כמה חלונות זמינות ביום')).toBeInTheDocument()

    fireEvent.click(dialog.getByRole('button', { name: 'הבנתי, תודה!' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('has no preview button for a MINOR update — it never opens as a modal for real users either', async () => {
    render(<AdminAnnouncementsPage />)
    await waitFor(() => expect(screen.getByText('עדיין לא פורסמו הכרזות')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'עדכון קטן' }))

    expect(screen.queryByRole('button', { name: /תצוגה מקדימה/ })).not.toBeInTheDocument()
    expect(screen.getByText('אין תצוגה מקדימה של חלון עבור עדכון קטן — הוא לא נפתח כחלון בכלל.')).toBeInTheDocument()
  })
})
