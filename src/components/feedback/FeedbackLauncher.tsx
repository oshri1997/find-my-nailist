'use client'

import { useCallback, useEffect, useId, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { Bug, CheckCircle2, HelpCircle, ImagePlus, Lightbulb, Loader2, MessageCircleMore, Send, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FeedbackType } from '@/types'
import { validateFeedbackScreenshot } from '@/lib/feedback-screenshot'
import { useAuth } from '@/components/auth/auth-provider'

type FeedbackCategory = {
  type: FeedbackType
  label: string
  description: string
  Icon: typeof Bug
  activeClass: string
}

const CATEGORIES: FeedbackCategory[] = [
  { type: 'BUG', label: 'תקלה', description: 'משהו לא עבד כמצופה', Icon: Bug, activeClass: 'bg-rose-500 text-white shadow-[0_8px_22px_rgba(245,23,92,0.28)]' },
  { type: 'IDEA', label: 'רעיון', description: 'שיפור שיעזור לך', Icon: Lightbulb, activeClass: 'bg-violet-600 text-white shadow-[0_8px_22px_rgba(124,58,237,0.24)]' },
  { type: 'QUESTION', label: 'שאלה', description: 'משהו שתרצי להבין', Icon: HelpCircle, activeClass: 'bg-sky-600 text-white shadow-[0_8px_22px_rgba(2,132,199,0.24)]' },
  { type: 'OTHER', label: 'משהו אחר', description: 'כל דבר שחשוב לנו לדעת', Icon: MessageCircleMore, activeClass: 'bg-amber-600 text-white shadow-[0_8px_22px_rgba(217,119,6,0.24)]' },
]

type FeedbackLauncherProps = {
  /** Keeps the dashboard affordance quiet while still making help easy to find. */
  compact?: boolean
  className?: string
  /** Useful when the trigger lives inside a menu that should close after the dialog is dismissed. */
  onClose?: () => void
  /** Lets a parent keep the dialog mounted when its trigger is transient UI, such as a dropdown. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Hides the built-in trigger when a parent supplies its own. */
  hideTrigger?: boolean
  /** Stable element to return focus to after a parent-owned dialog closes. */
  returnFocusRef?: RefObject<HTMLElement | null>
}

function friendlyError(status: number, payload: unknown) {
  const apiError = typeof payload === 'object' && payload !== null && 'error' in payload
    ? (payload as { error?: unknown }).error
    : null
  if (typeof apiError === 'string' && apiError.trim()) return apiError
  if (status === 401) return 'ההתחברות פגה. התחברי מחדש ואז נסי שוב.'
  return 'לא הצלחנו לשלוח את הפנייה. בדקי את החיבור ונסי שוב.'
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter((element) => !element.hasAttribute('aria-hidden'))
}

/**
 * One small, authenticated route to the manager. Context is captured locally
 * (page, version and browser) but deliberately never displayed in the form.
 */
export function FeedbackLauncher({ compact = false, className, onClose, open: controlledOpen, onOpenChange, hideTrigger = false, returnFocusRef }: FeedbackLauncherProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('BUG')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [referenceId, setReferenceId] = useState<string | null>(null)
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLButtonElement>(null)
  const lastActiveElement = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()
  const open = controlledOpen ?? uncontrolledOpen
  const portalHost = typeof document === 'undefined' ? null : document.body

  const setOpen = useCallback((nextOpen: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(nextOpen)
    onOpenChange?.(nextOpen)
  }, [controlledOpen, onOpenChange])

  function resetForm() {
    setType('BUG')
    setSubject('')
    setDescription('')
    setError('')
    setReferenceId(null)
    setScreenshot(null)
    setUploadProgress(null)
  }

  function openDialog() {
    lastActiveElement.current = returnFocusRef?.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    resetForm()
    setOpen(true)
  }

  const closeDialog = useCallback(() => {
    if (submitting) return
    setOpen(false)
    onClose?.()
  }, [onClose, setOpen, submitting])

  useEffect(() => {
    if (!open) return
    lastActiveElement.current ??= returnFocusRef?.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>('[data-feedback-close]')?.focus()
    }, 0)

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeDialog()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = getFocusableElements(dialogRef.current)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      // Closing unmounts the focused dialog control. Restore after that DOM
      // removal so browsers do not move focus back to document.body.
      const focusTarget = lastActiveElement.current
      window.setTimeout(() => focusTarget?.focus(), 0)
    }
  // Re-register when submission or focus target changes so Escape and focus
  // restoration always use current state.
  }, [closeDialog, open, returnFocusRef])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanSubject = subject.trim()
    const cleanDescription = description.trim()
    if (!cleanSubject || !cleanDescription) {
      setError('מלאי כותרת ותיאור קצר כדי שנוכל לטפל בפנייה.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      let screenshotStorageKey: string | undefined
      if (screenshot) {
        if (!user?.uid) {
          setError('יש להתחבר מחדש לפני צירוף צילום.')
          return
        }
        setUploadProgress(0)
        // Keep Firebase Storage out of the initial client bundle/module graph:
        // users who only open or submit text feedback do not initialize it.
        const { uploadFeedbackScreenshot } = await import('@/lib/firebase/storage')
        const uploaded = await uploadFeedbackScreenshot(user.uid, screenshot, setUploadProgress)
        screenshotStorageKey = uploaded.storageKey
      }
      const relativeUrl = typeof window === 'undefined'
        ? pathname
        : `${pathname}${window.location.search}${window.location.hash}`
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          subject: cleanSubject,
          description: cleanDescription,
          pageUrl: relativeUrl,
          ...(process.env.NEXT_PUBLIC_APP_VERSION ? { appVersion: process.env.NEXT_PUBLIC_APP_VERSION } : {}),
          ...(typeof navigator !== 'undefined' ? { userAgent: navigator.userAgent.slice(0, 500) } : {}),
          ...(screenshotStorageKey ? { screenshotStorageKey } : {}),
        }),
      })
      const payload: unknown = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(friendlyError(response.status, payload))
        return
      }
      const id = typeof payload === 'object' && payload !== null
        && 'data' in payload && typeof (payload as { data?: { id?: unknown } }).data?.id === 'string'
        ? (payload as { data: { id: string } }).data.id
        : null
      if (!id) {
        setError('הפנייה נשלחה, אבל לא התקבל מספר מעקב. אפשר לנסות שוב מאוחר יותר.')
        return
      }
      setReferenceId(id)
    } catch {
      setError('לא הצלחנו להתחבר לשרת. בדקי את החיבור ונסי שוב.')
    } finally {
      setSubmitting(false)
      setUploadProgress(null)
    }
  }

  return (
    <>
      {!hideTrigger && (
        <button
          ref={openerRef}
          type="button"
          onClick={openDialog}
          className={cn(
            compact
              ? 'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-primary hover:bg-primary/8 transition-all cursor-pointer'
              : 'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors cursor-pointer',
            className
          )}
        >
          <MessageCircleMore className={compact ? 'h-4 w-4' : 'h-[17px] w-[17px]'} />
          עזרה ומשוב
        </button>
      )}

      {portalHost && createPortal(
        <AnimatePresence>
          {open && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-3 sm:p-5"
            dir="rtl"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.button
              type="button"
              aria-label="סגירת חלון המשוב"
              onClick={closeDialog}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
            />
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 28, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              style={{ maxHeight: 'calc(100dvh - 1.5rem)' }}
              className="relative my-auto flex w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-white/20 bg-card shadow-[0_28px_100px_rgba(73,8,38,0.35)]"
            >
              <div className="relative shrink-0 overflow-hidden bg-gradient-to-l from-[#9D174D] via-[#D31558] to-[#F5175C] px-5 pb-6 pt-5 sm:px-7 sm:pt-6">
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wide text-white/80">
                      <Sparkles className="h-3.5 w-3.5" />
                      שומעים אותך
                    </p>
                    <h2 id={titleId} className="text-xl font-black tracking-tight text-white sm:text-2xl">מה תרצי לשתף?</h2>
                    <p id={descriptionId} className="mt-1 text-sm font-medium text-white/85">פנייה קצרה מגיעה ישירות למנהל המערכת.</p>
                  </div>
                  <button
                    data-feedback-close
                    type="button"
                    onClick={closeDialog}
                    disabled={submitting}
                    aria-label="סגירת חלון המשוב"
                    className="mt-0.5 p-0 text-white/90 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#D31558] disabled:opacity-50"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {referenceId ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="min-h-0 overflow-y-auto px-6 py-10 text-center sm:px-10"
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-emerald-500/12 text-emerald-600">
                    <CheckCircle2 className="h-9 w-9" />
                  </div>
                  <h3 className="mt-5 text-xl font-black text-foreground">קיבלנו את הפנייה</h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-muted-foreground">תודה שעזרת לנו לשפר. נחזור אלייך אם נצטרך עוד פרטים.</p>
                  <p className="mt-5 inline-flex rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary" aria-label={`מספר פנייה ${referenceId}`}>
                    מספר פנייה: {referenceId}
                  </p>
                  <div className="mx-auto mt-7 flex justify-center gap-2">
                    <Link href="/my-feedback" onClick={closeDialog} className="inline-flex h-10 items-center justify-center rounded-xl border border-input bg-background px-4 text-sm font-bold text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">הפניות שלי</Link>
                    <Button type="button" onClick={closeDialog} className="rounded-xl bg-primary px-6 font-black text-white hover:bg-primary/90">סגור</Button>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div data-testid="feedback-form-scroll" className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6">
                    <div>
                      <p className="mb-2 text-sm font-black text-foreground">סוג הפנייה</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="סוג הפנייה">
                      {CATEGORIES.map((category) => {
                        const selected = category.type === type
                        return (
                          <button
                            key={category.type}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => { setType(category.type); setError('') }}
                            className={cn(
                              'group rounded-2xl border px-3 py-3 text-right transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                              selected ? `${category.activeClass} border-transparent` : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/35 hover:bg-primary/5 hover:text-foreground'
                            )}
                          >
                            <category.Icon className="mb-2 h-4 w-4" />
                            <span className="block text-xs font-black">{category.label}</span>
                            <span className={cn('mt-0.5 block text-[10px] leading-4', selected ? 'text-white/80' : 'text-muted-foreground')}>{category.description}</span>
                          </button>
                        )
                      })}
                      </div>
                    </div>

                  <div>
                    <label htmlFor="feedback-screenshot" className="mb-1.5 block text-sm font-black text-foreground">צילום מסך <span className="font-medium text-muted-foreground">(אופציונלי)</span></label>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/[0.035] px-3 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/55 hover:bg-primary/[0.07]">
                      <ImagePlus className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate">{screenshot ? screenshot.name : 'PNG, JPEG או WebP עד 5MB'}</span>
                      <span className="text-xs font-bold text-primary">בחירת קובץ</span>
                      <input
                        id="feedback-screenshot"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null
                          const validationError = file ? validateFeedbackScreenshot(file) : null
                          if (validationError) { setScreenshot(null); setError(validationError); event.target.value = ''; return }
                          setScreenshot(file)
                          setError('')
                        }}
                      />
                    </label>
                    {uploadProgress !== null && <p className="mt-1.5 text-xs font-bold text-primary" role="status">מעלים צילום… {uploadProgress}%</p>}
                  </div>

                  <div>
                    <label htmlFor="feedback-subject" className="mb-1.5 block text-sm font-black text-foreground">כותרת קצרה</label>
                    <input
                      id="feedback-subject"
                      value={subject}
                      onChange={(event) => { setSubject(event.target.value); setError('') }}
                      maxLength={120}
                      required
                      autoComplete="off"
                      placeholder={type === 'BUG' ? 'לדוגמה: לא הצלחתי לבחור שעה' : 'מה חשוב לך שנדע?'}
                      className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground outline-none transition-shadow placeholder:text-muted-foreground/65 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label htmlFor="feedback-description" className="mb-1.5 block text-sm font-black text-foreground">פרטים</label>
                    <textarea
                      id="feedback-description"
                      value={description}
                      onChange={(event) => { setDescription(event.target.value); setError('') }}
                      maxLength={4000}
                      required
                      rows={4}
                      placeholder={type === 'BUG'
                        ? 'מה ניסית לעשות, מה קרה בפועל ומה ציפית שיקרה?'
                        : 'כמה שיותר הקשר יעזור לנו להבין ולטפל מהר.'}
                      className="w-full resize-y rounded-xl border border-border bg-background px-3 py-3 text-sm font-medium leading-6 text-foreground outline-none transition-shadow placeholder:text-muted-foreground/65 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="mt-1.5 text-xs font-medium text-muted-foreground">
                      {type === 'BUG' ? 'נצרף אוטומטית את העמוד שבו היית ופרטי דפדפן כלליים כדי לעזור באבחון.' : 'נצרף אוטומטית את העמוד שבו היית כדי שנבין את ההקשר.'}
                    </p>
                  </div>

                  {error && (
                    <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/8 px-3 py-2.5 text-sm font-semibold text-destructive">{error}</p>
                  )}

                  </div>

                  <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-card px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:pb-6">
                    <button type="button" onClick={closeDialog} disabled={submitting} className="rounded-xl px-4 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50">
                      ביטול
                    </button>
                    <Button type="submit" disabled={submitting || !subject.trim() || !description.trim()} className="rounded-xl bg-gradient-to-l from-[#9D174D] to-[#F5175C] px-5 font-black text-white shadow-[0_6px_18px_rgba(245,23,92,0.26)] hover:brightness-105 disabled:shadow-none">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {submitting ? (uploadProgress !== null ? 'מעלים צילום...' : 'שולחים...') : 'שלחי פנייה'}
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>,
        portalHost
      )}
    </>
  )
}
