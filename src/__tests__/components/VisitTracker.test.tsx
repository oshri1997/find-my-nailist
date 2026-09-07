/**
 * @jest-environment-options {"url":"https://nailistiot.fun/"}
 */
import { render, waitFor } from '@testing-library/react'
import { shouldTrackVisit, VisitTracker } from '@/components/analytics/visit-tracker'

beforeEach(() => {
  jest.clearAllMocks()
  window.sessionStorage.clear()
  Object.defineProperty(document, 'referrer', { configurable: true, value: 'https://www.google.com/search?q=nails' })
  global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response)
})

describe('VisitTracker', () => {
  it.each([
    ['nailistiot.fun', true],
    ['dev.nailistiot.fun', false],
    ['localhost', false],
  ])('tracks only production hostname %s', (hostname, expected) => {
    expect(shouldTrackVisit(hostname)).toBe(expected)
  })

  it('logs one Google visit per browser session', async () => {
    const first = render(<VisitTracker />)

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
    expect(global.fetch).toHaveBeenCalledWith('/api/analytics/visit', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ source: 'google' }),
    }))

    first.unmount()
    render(<VisitTracker />)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })
})
