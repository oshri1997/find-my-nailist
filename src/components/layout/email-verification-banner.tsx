'use client'

import { useState, useEffect } from 'react'
import { Mail, Loader2, Check } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

export function EmailVerificationBanner() {
  const { user } = useAuth()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0)

  useEffect(() => {
    if (retryAfterSeconds <= 0) return
    const interval = setInterval(() => setRetryAfterSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(interval)
  }, [retryAfterSeconds])

  if (!user || user.emailVerified) return null

  async function handleResend() {
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-email', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 429 && typeof data.retryAfterSeconds === 'number') {
          setRetryAfterSeconds(data.retryAfterSeconds)
        }
        setError(data.error || 'שגיאה בשליחה — נסי שוב מאוחר יותר')
        return
      }
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-sm">
      <div className="container mx-auto max-w-7xl px-6 py-2.5 flex flex-wrap items-center justify-center gap-2 text-center">
        <Mail className="h-4 w-4 shrink-0" />
        <span className="font-semibold">כדי להזמין תור צריך קודם לאשר את ההרשמה במייל.</span>
        <span className="text-amber-700/80 dark:text-amber-400/80">בדקי את תיבת הדואר (וגם את תיקיית הספאם).</span>
        <button
          type="button"
          onClick={handleResend}
          disabled={sending || sent || retryAfterSeconds > 0}
          className="font-bold underline underline-offset-2 hover:text-amber-950 dark:hover:text-amber-100 disabled:no-underline disabled:opacity-70 flex items-center gap-1"
        >
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : sent ? (
            <><Check className="h-3.5 w-3.5" /> נשלח!</>
          ) : retryAfterSeconds > 0 ? (
            `נסי שוב בעוד ${Math.ceil(retryAfterSeconds / 60)} דק'`
          ) : (
            'שליחה מחדש'
          )}
        </button>
        {error && <span className="text-red-600 dark:text-red-400 font-semibold">{error}</span>}
      </div>
    </div>
  )
}
