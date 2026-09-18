/**
 * Regression test: changing a day's start time to at or past its current end
 * time used to leave the pair backwards in local state (e.g. start 20:00,
 * end 09:00) with no client-side correction — the only guard was a server
 * validation added later, so the UI would just silently accept and later
 * reject on save. The start select should never even offer a value with no
 * valid end-time afterward, and changing start past end should auto-bump end.
 */
import { render, screen, fireEvent, waitFor, within } from '@/__tests__/utils/render'
import WorkingHoursPage from '@/app/dashboard/nailist/hours/page'

jest.mock('@/lib/booking-utils', () => ({
  ...jest.requireActual('@/lib/booking-utils'),
  todayInIsrael: () => '2026-09-13',
}))

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url.includes('/api/working-hours') && (!init || init.method === undefined)) {
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
  })
})

// The two bulk "שעה אחידה לכל הימים" selects have their own aria-label —
// excluding them leaves only the per-day start/end selects, in DOM order:
// [day1-start, day1-end, day2-start, day2-end, ...] for each active day.
function dayTimeSelects() {
  return screen.getAllByRole('combobox').filter(el => el.getAttribute('aria-label') === null)
}
function dayStartSelects() {
  return dayTimeSelects().filter((_, i) => i % 2 === 0)
}

describe('Working hours page — start/end time consistency', () => {
  it('auto-bumps end time forward when start time is moved past it', async () => {
    render(<WorkingHoursPage />)
    await waitFor(() => expect(dayStartSelects().length).toBeGreaterThan(0))

    // First day's (Sunday) start-time select is the first per-day "09:00" combobox
    const startSelects = dayStartSelects()
    fireEvent.change(startSelects[0], { target: { value: '20:00' } })

    // The corresponding end-time select must have moved to something after
    // 20:00, never staying at the original 19:00 (which would be backwards).
    await waitFor(() => {
      const endSelects = screen.getAllByDisplayValue(/^20:30$/)
      expect(endSelects.length).toBeGreaterThan(0)
    })
    expect(screen.queryAllByDisplayValue('19:00').length).toBeLessThan(7)
  })

  it('never offers a start-time option with no valid end-time after it', async () => {
    render(<WorkingHoursPage />)
    await waitFor(() => expect(dayStartSelects().length).toBeGreaterThan(0))

    const startSelects = dayStartSelects()
    const options = Array.from(startSelects[0].querySelectorAll('option')).map((o) => o.textContent)
    expect(options).not.toContain('23:30') // the last slot has no room for an end time after it
  })
})

describe('Working hours page — uniform hours applied to all days', () => {
  it('applies the chosen start/end time to every day at once via the top "החל על כל הימים" control', async () => {
    render(<WorkingHoursPage />)
    await waitFor(() => expect(dayStartSelects().length).toBeGreaterThan(0))

    fireEvent.change(screen.getByLabelText('שעת התחלה כללית'), { target: { value: '11:00' } })
    fireEvent.change(screen.getByLabelText('שעת סיום כללית'), { target: { value: '20:00' } })
    fireEvent.click(screen.getByRole('button', { name: /החל על כל הימים/ }))

    await waitFor(() => {
      // Only active days render a time select — weekend days stay closed
      // (isActive is untouched by the bulk-times control, times only).
      expect(dayStartSelects()).toHaveLength(5)
      expect(dayStartSelects().every(el => (el as HTMLSelectElement).value === '11:00')).toBe(true)
    })
    expect(screen.getAllByText('סגור').length).toBe(2) // both weekend days remain inactive
  })

  it("auto-bumps the general end time forward when the general start time is moved past it", async () => {
    render(<WorkingHoursPage />)
    await waitFor(() => expect(dayStartSelects().length).toBeGreaterThan(0))

    fireEvent.change(screen.getByLabelText('שעת התחלה כללית'), { target: { value: '20:00' } })

    await waitFor(() => {
      expect(screen.getByLabelText('שעת סיום כללית')).toHaveDisplayValue('20:30')
    })
  })
})

describe('Working hours page — active days indicator', () => {
  it('shows 5 active days by default', async () => {
    render(<WorkingHoursPage />)
    await waitFor(() => expect(screen.getByText('5 ימים פעילים מתוך 7')).toBeInTheDocument())
  })
})

describe('Working hours page — holiday controls', () => {
  it('collapses the upcoming-holidays list by default, expanding it on click', async () => {
    render(<WorkingHoursPage />)
    await waitFor(() => expect(dayStartSelects().length).toBeGreaterThan(0))

    const toggle = screen.getByRole('button', { name: /חגים וימים לאומיים קרובים/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(/חג ישראלי · 21\/09\/2026/)).not.toBeInTheDocument()

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findByText(/חג ישראלי · 21\/09\/2026/)).toBeInTheDocument()
  })

  it('treats a missing automatic Israeli holiday closure preference as enabled and saves opt-out', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url === '/api/working-hours') return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
      if (url === '/api/availability-overrides') return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
      if (url === '/api/me/nailist-profile') return Promise.resolve({ ok: true, json: async () => ({ data: { id: 'profile-1' } }) } as Response)
      return Promise.resolve({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
    })
    render(<WorkingHoursPage />)
    const checkbox = await screen.findByRole('checkbox', { name: /סגירה אוטומטית בחגים/ })
    expect(checkbox).toBeChecked()
    fireEvent.click(checkbox)
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/nailists/profile-1', expect.objectContaining({ method: 'PATCH' })))
  })

  it('bumps an override end time when its start time reaches it', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url === '/api/working-hours') return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
      if (url === '/api/availability-overrides') return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
      if (url === '/api/me/nailist-profile') return Promise.resolve({ ok: true, json: async () => ({ data: { id: 'profile-1', autoCloseHolidays: true } }) } as Response)
      return Promise.resolve({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
    })
    render(<WorkingHoursPage />)
    fireEvent.click(await screen.findByRole('button', { name: /חגים וימים לאומיים קרובים/ }))
    fireEvent.click((await screen.findAllByRole('button', { name: 'פתיחה ביום הזה' }))[0])
    const start = await screen.findByLabelText(/שעת פתיחה חריגה/)
    const end = screen.getByLabelText(/שעת סיום חריגה/)
    fireEvent.change(start, { target: { value: '20:00' } })
    await waitFor(() => expect(end).toHaveDisplayValue('20:30'))
  })

  it('displays holiday dates as DD/MM/YYYY while preserving the ISO date in an override request', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url === '/api/working-hours') return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
      if (url === '/api/availability-overrides') return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
      if (url === '/api/me/nailist-profile') return Promise.resolve({ ok: true, json: async () => ({ data: { id: 'profile-1', autoCloseHolidays: true } }) } as Response)
      return Promise.resolve({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
    })
    render(<WorkingHoursPage />)
    fireEvent.click(await screen.findByRole('button', { name: /חגים וימים לאומיים קרובים/ }))

    const title = await screen.findByText('חג ישראלי · 21/09/2026')
    expect(title).toBeInTheDocument()
    const holidayCard = title.closest('.rounded-xl.bg-card') as HTMLElement
    fireEvent.click(within(holidayCard).getByRole('button', { name: 'פתיחה ביום הזה' }))
    expect(await screen.findByLabelText('שעת פתיחה חריגה 21/09/2026')).toBeInTheDocument()
    expect(screen.getByLabelText('שעת סיום חריגה 21/09/2026')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'שמרי שעות' }))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      '/api/availability-overrides',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ date: '2026-09-21', mode: 'OPEN', startTime: '09:00', endTime: '19:00' }),
      }),
    ))
  })
})

describe('Working hours page — multiple intervals per day (split shifts)', () => {
  it('adds a second interval to a day and saves both in the intervals[] payload', async () => {
    render(<WorkingHoursPage />)
    await waitFor(() => expect(dayStartSelects().length).toBeGreaterThan(0))

    // First day's (Sunday) "הוספת שעות" button — day rows render before the
    // holiday section's own "הוספת שעות" buttons, but this page starts with
    // no open holiday override, so the day-row buttons are the only ones.
    const addButtons = screen.getAllByRole('button', { name: /הוספת שעות/ })
    fireEvent.click(addButtons[0])

    await waitFor(() => expect(dayStartSelects().length).toBe(6)) // 5 active days + 1 new interval

    fireEvent.click(screen.getByRole('button', { name: 'שמרי שעות עבודה' }))

    await waitFor(() => {
      const call = (global.fetch as jest.Mock).mock.calls.find(([url, init]) => url === '/api/working-hours' && init?.method === 'PUT')
      expect(call).toBeTruthy()
      const body = JSON.parse(call![1].body)
      const sunday = body.hours.find((h: { dayOfWeek: number }) => h.dayOfWeek === 0)
      expect(sunday.intervals).toHaveLength(2)
      expect(sunday.intervals[0]).toEqual({ start: '09:00', end: '19:00' })
      // The new interval starts right where the first one ends (touching,
      // not overlapping) — a valid default the nailist can then adjust.
      expect(sunday.intervals[1].start).toBe('19:00')
    })
  })

  it('removes an interval and falls back to a single-window payload', async () => {
    render(<WorkingHoursPage />)
    await waitFor(() => expect(dayStartSelects().length).toBeGreaterThan(0))

    const addButtons = screen.getAllByRole('button', { name: /הוספת שעות/ })
    fireEvent.click(addButtons[0])
    await waitFor(() => expect(dayStartSelects().length).toBe(6))

    const removeButtons = screen.getAllByRole('button', { name: /מחיקת חלון שעות/ })
    fireEvent.click(removeButtons[0])
    await waitFor(() => expect(dayStartSelects().length).toBe(5))
  })

  it('blocks saving and shows a Hebrew error when two intervals overlap', async () => {
    render(<WorkingHoursPage />)
    await waitFor(() => expect(dayStartSelects().length).toBeGreaterThan(0))

    const addButtons = screen.getAllByRole('button', { name: /הוספת שעות/ })
    fireEvent.click(addButtons[0])
    await waitFor(() => expect(dayStartSelects().length).toBe(6))

    // Force the new (second) interval's start back before the first
    // interval's end, creating an overlap: 09:00-19:00 and 15:00-...
    const startSelects = dayStartSelects()
    fireEvent.change(startSelects[1], { target: { value: '15:00' } })

    const putCallsBefore = (global.fetch as jest.Mock).mock.calls.filter(([url]) => url === '/api/working-hours' ).length
    fireEvent.click(screen.getByRole('button', { name: 'שמרי שעות עבודה' }))

    await waitFor(() => expect(screen.getByText(/חפיפה/)).toBeInTheDocument())
    // No new PUT request was sent — client-side validation blocked it.
    const putCallsAfter = (global.fetch as jest.Mock).mock.calls.filter(([url]) => url === '/api/working-hours').length
    expect(putCallsAfter).toBe(putCallsBefore)
  })

  it('loads a previously-saved split-shift day back into two interval rows', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url === '/api/working-hours') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [{
              id: 'wh-0', nailistProfileId: 'p1', dayOfWeek: 0, isActive: true,
              startTime: '09:00', endTime: '19:00',
              intervals: [{ start: '09:00', end: '13:00' }, { start: '15:00', end: '19:00' }],
            }],
          }),
        } as Response)
      }
      if (url === '/api/availability-overrides') return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
      return Promise.resolve({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
    })
    render(<WorkingHoursPage />)

    await waitFor(() => {
      const startSelects = dayStartSelects()
      expect((startSelects[0] as HTMLSelectElement).value).toBe('09:00')
      expect((startSelects[1] as HTMLSelectElement).value).toBe('15:00')
    })
  })
})
