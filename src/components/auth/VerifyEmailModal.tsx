'use client'

import { useState } from 'react'
import type { User } from 'firebase/auth'
import { Loader2, Mail, Check } from 'lucide-react'

export function VerifyEmailModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleResend() {
    setSending(true)
    setError('')
    try {
      const { sendVerificationEmail } = await import('@/lib/firebase/auth-helpers')
      await sendVerificationEmail(user)
      setSent(true)
    } catch {
      setError('שגיאה בשליחת המייל — נסי שוב בעוד כמה דקות')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full space-y-4 text-center"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/30 flex items-center justify-center mx-auto">
          <Mail className="h-6 w-6 text-pink-500" />
        </div>
        <h3 className="font-black text-foreground text-lg">יש לאמת את כתובת המייל</h3>
        <p className="text-sm text-muted-foreground">
          כדי לקבוע תור, קודם צריך לאמת את כתובת המייל שלך ({user.email}). בדקי את תיבת הדואר — ייתכן שהמייל בתיקיית ספאם.
        </p>
        {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-muted text-foreground rounded-xl py-2.5 text-sm font-bold hover:bg-muted/70 transition-colors"
          >
            סגירה
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={sending || sent}
            className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : sent ? (
              <><Check className="h-4 w-4" /> נשלח!</>
            ) : (
              'שליחה מחדש'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
