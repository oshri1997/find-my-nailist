'use client'

import { useState } from 'react'
import { Mail, Loader2, Check } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

export function EmailVerificationBanner() {
  const { user } = useAuth()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  if (!user || user.emailVerified) return null

  async function handleResend() {
    setSending(true)
    try {
      const res = await fetch('/api/auth/verify-email', { method: 'POST' })
      if (res.ok) setSent(true)
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
          disabled={sending || sent}
          className="font-bold underline underline-offset-2 hover:text-amber-950 dark:hover:text-amber-100 disabled:no-underline disabled:opacity-70 flex items-center gap-1"
        >
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : sent ? (
            <><Check className="h-3.5 w-3.5" /> נשלח!</>
          ) : (
            'שליחה מחדש'
          )}
        </button>
      </div>
    </div>
  )
}
