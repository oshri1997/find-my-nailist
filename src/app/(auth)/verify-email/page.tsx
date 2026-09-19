'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, Mail, Pencil, Send } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageLoader } from '@/components/ui/page-loader'
import { suggestEmailCorrection } from '@/lib/email-suggestion'

function changeEmailError(error: unknown): string {
  const code = (error as { code?: string } | undefined)?.code
  if (code === 'auth/email-already-in-use') return 'כתובת המייל הזו כבר מחוברת לחשבון אחר'
  if (code === 'auth/requires-recent-login') return 'מטעמי אבטחה, התחברי שוב לחשבון ואז נסי לשנות את הכתובת'
  if (code === 'auth/invalid-email') return 'כתובת המייל אינה תקינה'
  return 'לא הצלחנו לשלוח קישור לכתובת החדשה — נסי שוב'
}

export default function VerifyEmailPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [sending, setSending] = useState(false)
  const [changing, setChanging] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const emailSuggestion = suggestEmailCorrection(newEmail)

  const refreshVerification = useCallback(async () => {
    if (!user) return
    setChecking(true)
    setError('')
    try {
      await user.reload()
      if (!user.emailVerified) {
        const emailStatusRes = await fetch('/api/me/email-status')
        const emailStatus = await emailStatusRes.json().catch(() => ({}))
        if (emailStatus.deliveryStatus === 'BOUNCED') {
          setError('לא הצלחנו למסור את המייל. עדכני את כתובת המייל כדי להמשיך.')
        }
        setChecking(false)
        return
      }
      const token = await user.getIdToken(true)
      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!sessionRes.ok) throw new Error('session sync failed')
      const syncRes = await fetch('/api/me/sync-email', { method: 'POST' })
      if (!syncRes.ok) throw new Error('email sync failed')
      router.replace('/onboarding/welcome')
    } catch {
      setError('לא הצלחנו לעדכן את סטטוס האימות — נסי שוב')
      setChecking(false)
    }
  }, [router, user])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login')
      return
    }
    // The first verification lookup is an external Firebase synchronization,
    // not a derived React-state update. It must run after the initial paint.
    const timer = window.setTimeout(() => void refreshVerification(), 0)
    return () => window.clearTimeout(timer)
    // The Firebase user object is stable for this page. Re-checking is driven
    // by the explicit button after the user clicks the email link.
  }, [authLoading, user, router, refreshVerification])

  async function resend() {
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-email', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'לא הצלחנו לשלוח מייל — נסי שוב מאוחר יותר')
        return
      }
      setMessage('שלחנו קישור אימות חדש. בדקי גם את תיקיית הספאם.')
    } catch {
      setError('לא הצלחנו לשלוח מייל — נסי שוב מאוחר יותר')
    } finally {
      setSending(false)
    }
  }

  async function requestEmailChange(event: React.FormEvent) {
    event.preventDefault()
    if (!user) return
    setSending(true)
    setError('')
    try {
      const candidate = newEmail.trim().toLowerCase()
      const domainRes = await fetch('/api/auth/validate-email-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: candidate }),
      })
      const domainData = await domainRes.json().catch(() => ({}))
      if (!domainRes.ok || domainData.valid !== true) {
        setError(domainData.reason === 'unavailable'
          ? 'לא הצלחנו לבדוק את כתובת המייל — נסי שוב בעוד רגע'
          : 'הדומיין בכתובת המייל אינו קיים או אינו יכול לקבל הודעות')
        return
      }

      const { verifyBeforeUpdateEmail } = await import('firebase/auth')
      await verifyBeforeUpdateEmail(user, candidate, {
        url: `${window.location.origin}/verify-email`,
        handleCodeInApp: false,
        linkDomain: 'auth.nailistiot.fun',
      })
      setChanging(false)
      setMessage(`שלחנו קישור אימות אל ${candidate}. הכתובת תוחלף רק לאחר לחיצה עליו.`)
    } catch (changeError) {
      setError(changeEmailError(changeError))
    } finally {
      setSending(false)
    }
  }

  // AuthProvider owns the one global full-screen loader while Firebase is
  // restoring the account. Rendering another page-level spinner here at the
  // same time made a freshly registered user see two loaders before onboarding.
  if (authLoading || !user) return null

  if (checking) return <PageLoader text="בודקת את האימות" />

  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <section className="mx-auto max-w-md rounded-3xl border border-border bg-card p-7 text-center shadow-[0_12px_35px_rgba(245,23,92,.08)] sm:p-9">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"><Mail className="h-7 w-7" /></span>
        <h1 className="mt-5 text-2xl font-black text-foreground">אשרי את כתובת המייל</h1>
        <p className="mt-3 leading-6 text-muted-foreground">שלחנו קישור אימות אל</p>
        <p dir="ltr" className="mt-1 break-all font-bold text-foreground">{user.email}</p>

        {message && <p className="mt-5 rounded-xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">{message}</p>}
        {error && <p className="mt-5 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{error}</p>}

        {!changing ? (
          <div className="mt-7 space-y-3">
            <Button onClick={() => void refreshVerification()} className="h-12 w-full font-black">
              <CheckCircle2 className="ml-2 h-5 w-5" /> כבר אישרתי את המייל
            </Button>
            <Button variant="outline" onClick={() => void resend()} disabled={sending} className="h-12 w-full font-bold">
              {sending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Send className="ml-2 h-4 w-4" />} שליחה מחדש
            </Button>
            <button type="button" onClick={() => { setChanging(true); setNewEmail(user.email ?? '') }} className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
              <Pencil className="h-3.5 w-3.5" /> טעיתי בכתובת המייל
            </button>
          </div>
        ) : (
          <form onSubmit={requestEmailChange} className="mt-7 space-y-4 text-right">
            <div>
              <label htmlFor="new-email" className="mb-2 block text-sm font-bold text-foreground">כתובת מייל חדשה</label>
              <Input id="new-email" dir="ltr" type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} required className="h-12 text-left" />
              {emailSuggestion && (
                <button type="button" onClick={() => setNewEmail(emailSuggestion)} className="mt-2 text-sm font-bold text-primary hover:underline">
                  האם התכוונת ל־<span dir="ltr">{emailSuggestion}</span>?
                </button>
              )}
            </div>
            <p className="text-sm leading-5 text-muted-foreground">נשלח קישור לכתובת החדשה. היא תוחלף רק לאחר שתאשרי אותה.</p>
            <Button type="submit" disabled={sending} className="h-12 w-full font-black">
              {sending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />} שלחי קישור לכתובת החדשה
            </Button>
            <Button type="button" variant="ghost" onClick={() => setChanging(false)} className="h-10 w-full">ביטול</Button>
          </form>
        )}
      </section>
    </main>
  )
}
