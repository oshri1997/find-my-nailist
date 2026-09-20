/**
 * Keep operational telemetry useful by dropping only errors proven to come
 * from observability plumbing or a third-party widget — never application
 * request failures.
 */
type SentryEventLike = {
  exception?: { values?: Array<{ value?: string; type?: string; stacktrace?: { frames?: Array<{ filename?: string }> } }> }
  logentry?: { message?: string; formatted?: string }
  message?: string
  request?: { url?: string }
  transaction?: string
}

function eventText(event: SentryEventLike) {
  return [
    event.message,
    event.logentry?.message,
    event.logentry?.formatted,
    ...((event.exception?.values ?? []).flatMap(value => [value.type, value.value])),
  ].filter((value): value is string => typeof value === 'string').join('\n')
}

function hasUserWayFrame(event: SentryEventLike) {
  return (event.exception?.values ?? []).some(value =>
    (value.stacktrace?.frames ?? []).some(frame => /userway\.org/i.test(frame.filename ?? '')),
  )
}

export function shouldDropSentryEvent(event: SentryEventLike) {
  const text = eventText(event)
  const isMonitoringRequest = `${event.transaction ?? ''} ${event.request?.url ?? ''}`.includes('/monitoring')

  // This warning originates from Node's stream handling for Sentry's tunnel.
  // It does not describe a user request or an application exception, and it
  // previously overwhelmed the issue feed with thousands of duplicate events.
  if (text.includes('MaxListenersExceededWarning') && text.includes('ServerResponse')) return true

  // Closing a browser tab while Sentry uploads an event can abort that upload.
  // Limit these filters to the tunnel so a real aborted application request is
  // still reported.
  if (isMonitoringRequest && (text === 'aborted' || text.includes('The destination stream closed early.'))) return true

  // UserWay is loaded as an external accessibility widget. Only suppress its
  // known M_ID error when the stack confirms that it came from UserWay.
  return text.includes("Cannot read properties of undefined (reading 'M_ID')") && hasUserWayFrame(event)
}
