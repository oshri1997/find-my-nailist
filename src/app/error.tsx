'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'

// Root-level error boundary — catches uncaught exceptions anywhere in the
// app tree while keeping the root layout (navbar, etc.) intact. Falls back to
// global-error.tsx only if the root layout itself is what crashed.
export default function Error({
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
    <div className="min-h-[60vh] flex items-center justify-center px-6" dir="rtl">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-black text-foreground mb-2">משהו השתבש</h1>
        <p className="text-muted-foreground mb-6">
          קרתה שגיאה בלתי צפויה. צוות האתר קיבל התראה על כך.
        </p>
        <Button onClick={() => unstable_retry()} className="bg-primary hover:bg-primary/90 text-white border-0 rounded-xl px-8 h-12 font-bold">
          נסי שוב
        </Button>
      </div>
    </div>
  )
}
