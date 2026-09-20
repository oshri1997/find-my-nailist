import { shouldDropSentryEvent } from '@/lib/sentry-event-filter'

describe('Sentry event filter', () => {
  it('drops only the known Sentry tunnel listener warning', () => {
    expect(shouldDropSentryEvent({
      exception: { values: [{ value: 'MaxListenersExceededWarning: Possible EventEmitter memory leak detected. [ServerResponse]' }] },
    })).toBe(true)
  })

  it('drops an aborted upload only when it belongs to the monitoring tunnel', () => {
    expect(shouldDropSentryEvent({ message: 'aborted', transaction: 'POST /monitoring' })).toBe(true)
    expect(shouldDropSentryEvent({ message: 'aborted', transaction: 'POST /api/appointments' })).toBe(false)
  })

  it('keeps application failures visible', () => {
    expect(shouldDropSentryEvent({ message: 'Failed to parse private key.' })).toBe(false)
    expect(shouldDropSentryEvent({ message: 'Failed to fetch announcements' })).toBe(false)
  })

  it('drops M_ID only when it is confirmed as a UserWay error', () => {
    const message = "Cannot read properties of undefined (reading 'M_ID')"
    expect(shouldDropSentryEvent({
      exception: { values: [{ value: message, stacktrace: { frames: [{ filename: 'https://cdn.userway.org/widget.js' }] } }] },
    })).toBe(true)
    expect(shouldDropSentryEvent({ exception: { values: [{ value: message }] } })).toBe(false)
  })
})
