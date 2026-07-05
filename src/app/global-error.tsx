'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import './globals.css'

// Root-level error boundary — Next.js only renders this when everything else
// (including the root layout) has crashed, so it must define its own
// <html>/<body> and stay maximally simple/self-contained; this repo's custom
// Next.js build renamed the standard `reset` prop to `unstable_retry` (see
// node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md).
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-black text-foreground mb-2">משהו השתבש</h1>
          <p className="text-muted-foreground mb-6">
            קרתה שגיאה בלתי צפויה. צוות האתר קיבל התראה על כך.
          </p>
          <button
            onClick={() => unstable_retry()}
            className="bg-primary hover:bg-primary/90 text-white border-0 rounded-xl px-8 h-12 font-bold cursor-pointer"
          >
            נסי שוב
          </button>
        </div>
      </body>
    </html>
  )
}
