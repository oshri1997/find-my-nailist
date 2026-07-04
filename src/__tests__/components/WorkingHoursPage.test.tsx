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

describe('Working hours page — start/end time consistency', () => {
  it('auto-bumps end time forward when start time is moved past it', async () => {
    render(<WorkingHoursPage />)
    await waitFor(() => expect(screen.getAllByDisplayValue('09:00').length).toBeGreaterThan(0))

    // First day's (Sunday) start-time select is the first "09:00" combobox
    const startSelects = screen.getAllByDisplayValue('09:00')
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
    await waitFor(() => expect(screen.getAllByDisplayValue('09:00').length).toBeGreaterThan(0))

    const startSelects = screen.getAllByDisplayValue('09:00')
    const options = Array.from(startSelects[0].querySelectorAll('option')).map((o) => o.textContent)
    expect(options).not.toContain('23:30') // the last slot has no room for an end time after it
  })
})
