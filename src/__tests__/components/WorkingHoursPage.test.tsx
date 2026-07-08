/**
 * Regression test: changing a day's start time to at or past its current end
 * time used to leave the pair backwards in local state (e.g. start 20:00,
 * end 09:00) with no client-side correction — the only guard was a server
 * validation added later, so the UI would just silently accept and later
 * reject on save. The start select should never even offer a value with no
 * valid end-time afterward, and changing start past end should auto-bump end.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WorkingHoursPage from '@/app/dashboard/nailist/hours/page'

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
