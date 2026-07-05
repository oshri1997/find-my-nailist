import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION,
  tracesSampleRate: 1,
  // Record video-like session replays so a reported bug can be watched, not
  // just read as a stack trace. Low sample rate for ordinary sessions (cost
  // control), but always capture the replay when an error actually happens —
  // that's the case that matters. Text/media are masked/blocked by default
  // (Sentry's own default), which matters here given real emails/phone
  // numbers pass through this app's forms.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [
    Sentry.replayIntegration(),
    Sentry.captureConsoleIntegration({ levels: ['error'] }),
  ],
  // Routes client-side error/replay ingest through our own domain
  // (/monitoring, wired up by withSentryConfig in next.config.ts) so ad
  // blockers that block sentry.io outright don't silently drop crash reports
  // from real users — a well-known gap in a "no code changes needed" setup.
  tunnel: '/monitoring',
})

export function onRouterTransitionStart(url: string, navigationType: 'push' | 'replace' | 'traverse') {
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `${navigationType} → ${url}`,
    level: 'info',
  })
}
