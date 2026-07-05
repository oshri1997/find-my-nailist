import * as Sentry from '@sentry/nextjs'

// Runs once per server instance (Node + Edge) before it starts handling
// requests. captureConsoleIntegration turns every existing console.error(...)
// call across the whole API surface into a captured Sentry event — this repo
// has ~20+ routes that already catch-and-log rather than re-throw, so without
// this, Next's own onRequestError hook (below) would never see them.
export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  const environment = process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV
  const release = process.env.NEXT_PUBLIC_APP_VERSION

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn,
      environment,
      release,
      tracesSampleRate: 1,
      integrations: [Sentry.captureConsoleIntegration({ levels: ['error'] })],
    })
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      environment,
      release,
      tracesSampleRate: 1,
    })
  }
}

// Catches uncaught exceptions from Server Components, Route Handlers, and
// Server Actions that Next.js itself surfaces (as opposed to ones already
// caught and logged internally, which captureConsoleIntegration above picks up).
export const onRequestError = Sentry.captureRequestError
