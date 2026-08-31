'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Bug, ChevronLeft, ExternalLink, Loader2, MessageCircleMore, Search, Send, ShieldAlert, X } from 'lucide-react'
import type { FeedbackPriority, FeedbackStatus, FeedbackType } from '@/types'

type AdminFeedback = {
  id: string
  reporterUid: string
  reporterEmail: string
  reporterDisplayName: string
  reporterRole: string | null
  type: FeedbackType
  subject: string
  description: string
  status: FeedbackStatus
  priority: FeedbackPriority
  pageUrl: string
  appVersion: string | null
  internalNote: string | null
  hasScreenshot: boolean
  createdAt: string | null
  updatedAt: string | null
}

type FeedbackCounts = Record<FeedbackStatus, number> & { total: number }

const STATUS_OPTIONS: Array<{ value: FeedbackStatus; label: string; tone: string }> = [
  { value: 'NEW', label: 'חדשה', tone: 'bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/20' },
  { value: 'IN_REVIEW', label: 'בבדיקה', tone: 'bg-violet-500/12 text-violet-700 dark:text-violet-300 border-violet-500/20' },
  { value: 'PLANNED', label: 'מתוכננת', tone: 'bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/20' },
  { value: 'RESOLVED', label: 'נפתרה', tone: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' },
  { value: 'CLOSED', label: 'נסגרה', tone: 'bg-muted text-muted-foreground border-border' },
]

const PRIORITY_OPTIONS: Array<{ value: FeedbackPriority; label: string; tone: string }> = [
  { value: 'LOW', label: 'נמוכה', tone: 'bg-muted text-muted-foreground border-border' },
  { value: 'NORMAL', label: 'רגילה', tone: 'bg-primary/10 text-primary border-primary/15' },
  { value: 'HIGH', label: 'גבוהה', tone: 'bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/20' },
  { value: 'CRITICAL', label: 'קריטית', tone: 'bg-destructive/10 text-destructive border-destructive/20' },
]

const TYPE_OPTIONS: Array<{ value: FeedbackType; label: string }> = [
  { value: 'BUG', label: 'תקלה' },
  { value: 'IDEA', label: 'רעיון' },
  { value: 'QUESTION', label: 'שאלה' },
  { value: 'OTHER', label: 'אחר' },
]

const ALLOWED_TRANSITIONS: Record<FeedbackStatus, FeedbackStatus[]> = {
  NEW: ['NEW', 'IN_REVIEW', 'CLOSED'],
  IN_REVIEW: ['IN_REVIEW', 'PLANNED', 'RESOLVED', 'CLOSED'],
  PLANNED: ['PLANNED', 'IN_REVIEW', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['RESOLVED', 'IN_REVIEW', 'CLOSED'],
  CLOSED: ['CLOSED', 'IN_REVIEW'],
}

const EMPTY_COUNTS: FeedbackCounts = { NEW: 0, IN_REVIEW: 0, PLANNED: 0, RESOLVED: 0, CLOSED: 0, total: 0 }

function optionLabel<T extends string>(options: Array<{ value: T; label: string }>, value: T) {
  return options.find((option) => option.value === value)?.label ?? value
}

function optionTone<T extends string>(options: Array<{ value: T; tone: string }>, value: T) {
  return options.find((option) => option.value === value)?.tone ?? 'bg-muted text-muted-foreground border-border'
}

function dateLabel(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('he-IL', { dateStyle: 'medium', timeStyle: 'short' })
}

function safePageLink(value: string) {
  try {
    const url = new URL(value, window.location.origin)
    const isRelativePath = value.startsWith('/') && !value.startsWith('//') && url.origin === window.location.origin
    const isCanonicalNailistiotOrigin = url.origin === 'https://nailistiot.fun' || url.origin === 'https://dev.nailistiot.fun'
    if (!isRelativePath && !isCanonicalNailistiotOrigin) return null
    const path = `${url.pathname}${url.search}${url.hash}`
    return { href: isRelativePath ? path : url.href, label: path }
  } catch {
    return null
  }
}

function FeedbackBadge({ feedback, field }: { feedback: AdminFeedback; field: 'status' | 'priority' | 'type' }) {
  if (field === 'status') return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${optionTone(STATUS_OPTIONS, feedback.status)}`}>{optionLabel(STATUS_OPTIONS, feedback.status)}</span>
  if (field === 'priority') return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${optionTone(PRIORITY_OPTIONS, feedback.priority)}`}>{optionLabel(PRIORITY_OPTIONS, feedback.priority)}</span>
  return <span className="inline-flex rounded-full border border-border bg-muted/65 px-2.5 py-1 text-xs font-bold text-foreground">{optionLabel(TYPE_OPTIONS, feedback.type)}</span>
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<AdminFeedback[]>([])
  const [counts, setCounts] = useState<FeedbackCounts>(EMPTY_COUNTS)
  const [status, setStatus] = useState<FeedbackStatus | ''>('')
  const [type, setType] = useState<FeedbackType | ''>('')
  const [priority, setPriority] = useState<FeedbackPriority | ''>('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<AdminFeedback | null>(null)
  const [draftStatus, setDraftStatus] = useState<FeedbackStatus>('NEW')
  const [draftPriority, setDraftPriority] = useState<FeedbackPriority>('NORMAL')
  const [draftNote, setDraftNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const requestId = useRef(0)
  const nextCursorRef = useRef<string | null>(null)
  const panelTitleId = useId()

  const loadFeedback = useCallback(async (append = false, cursor?: string | null) => {
    const currentRequest = ++requestId.current
    if (append) setLoadingMore(true)
    else { setLoading(true); setError('') }
    const params = new URLSearchParams({ pageSize: '25' })
    if (status) params.set('status', status)
    if (type) params.set('type', type)
    if (priority) params.set('priority', priority)
    if (search) params.set('q', search)
    const pageCursor = cursor ?? (append ? nextCursorRef.current : null)
    if (pageCursor) params.set('cursor', pageCursor)

    try {
      const response = await fetch(`/api/admin/feedback?${params.toString()}`)
      const payload: unknown = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
          ? payload.error : 'לא הצלחנו לטעון את הפניות'
        throw new Error(message)
      }
      if (currentRequest !== requestId.current) return
      const result = payload as { data?: AdminFeedback[]; counts?: FeedbackCounts; pagination?: { nextCursor?: string | null } }
      const incoming = Array.isArray(result.data) ? result.data : []
      setItems((previous) => append ? [...previous, ...incoming.filter((entry) => !previous.some((known) => known.id === entry.id))] : incoming)
      setCounts(result.counts ?? EMPTY_COUNTS)
      const receivedCursor = result.pagination?.nextCursor ?? null
      nextCursorRef.current = receivedCursor
      setNextCursor(receivedCursor)
    } catch (loadError) {
      if (currentRequest === requestId.current) setError(loadError instanceof Error ? loadError.message : 'לא הצלחנו לטעון את הפניות')
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [priority, search, status, type])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadFeedback() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadFeedback])

  function openFeedback(feedback: AdminFeedback) {
    setSelected(feedback)
    setDraftStatus(feedback.status)
    setDraftPriority(feedback.priority)
    setDraftNote(feedback.internalNote ?? '')
    setSaveError('')
    setSaveSuccess('')
  }

  useEffect(() => {
    if (!selected) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) setSelected(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [selected, saving])

  function applySearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearch(searchInput.trim())
  }

  async function saveSelected() {
    if (!selected) return
    setSaving(true)
    setSaveError('')
    setSaveSuccess('')
    try {
      const response = await fetch(`/api/admin/feedback/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: draftStatus, priority: draftPriority, internalNote: draftNote.trim() || null }),
      })
      const payload: unknown = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
          ? payload.error : 'לא הצלחנו לשמור את הפנייה'
        throw new Error(message)
      }
      const updated = (payload as { data?: AdminFeedback }).data
      if (!updated) throw new Error('לא התקבל עדכון מהשרת')
      setItems((previous) => previous.map((item) => item.id === updated.id ? updated : item))
      setSelected(updated)
      setSaveSuccess('השינויים נשמרו')
      void loadFeedback()
    } catch (saveFailure) {
      setSaveError(saveFailure instanceof Error ? saveFailure.message : 'לא הצלחנו לשמור את הפנייה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-5 md:space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wide text-primary"><MessageCircleMore className="h-3.5 w-3.5" />מרכז הקשבה</p>
            <h1 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">פניות למנהל</h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">מקום אחד לטפל בתקלות, שאלות ורעיונות מהשטח.</p>
          </div>
          <div className="rounded-2xl border border-primary/15 bg-primary/[0.045] px-4 py-3 text-sm font-bold text-primary">
            {counts.total.toLocaleString('he-IL')} פניות בתצוגה
          </div>
        </header>

        <section aria-label="סיכום פניות" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {STATUS_OPTIONS.map((entry) => (
            <button key={entry.value} type="button" onClick={() => setStatus(status === entry.value ? '' : entry.value)} className={`rounded-2xl border p-3 text-right transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${status === entry.value ? 'border-primary bg-primary/8 shadow-[0_6px_18px_rgba(157,23,77,0.09)]' : 'border-border bg-card hover:border-primary/30 hover:bg-primary/[0.025]'}`}>
              <span className="text-xs font-bold text-muted-foreground">{entry.label}</span>
              <span className="mt-1 block text-2xl font-black text-foreground">{counts[entry.value].toLocaleString('he-IL')}</span>
            </button>
          ))}
        </section>

        <section className="rounded-2xl border border-border bg-card p-3 shadow-[0_10px_28px_rgba(73,8,38,0.035)] sm:p-4">
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_150px_150px_150px]">
            <form onSubmit={applySearch} className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input aria-label="חיפוש פניות" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} maxLength={40} placeholder="חיפוש במילה אחת: נושא, שם או אימייל" className="h-10 w-full rounded-xl border border-border bg-background pr-9 pl-20 text-sm font-medium outline-none transition-shadow placeholder:text-muted-foreground/75 focus:border-primary focus:ring-2 focus:ring-primary/20" />
              <button type="submit" className="absolute left-1 top-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground hover:bg-primary/90">חיפוש</button>
            </form>
            <select aria-label="סינון לפי סוג" value={type} onChange={(event) => setType(event.target.value as FeedbackType | '')} className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground outline-none focus:border-primary">
              <option value="">כל הסוגים</option>{TYPE_OPTIONS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
            </select>
            <select aria-label="סינון לפי סטטוס" value={status} onChange={(event) => setStatus(event.target.value as FeedbackStatus | '')} className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground outline-none focus:border-primary">
              <option value="">כל הסטטוסים</option>{STATUS_OPTIONS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
            </select>
            <select aria-label="סינון לפי עדיפות" value={priority} onChange={(event) => setPriority(event.target.value as FeedbackPriority | '')} className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground outline-none focus:border-primary">
              <option value="">כל העדיפויות</option>{PRIORITY_OPTIONS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
            </select>
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center rounded-2xl border border-border bg-card"><Loader2 className="h-7 w-7 animate-spin text-primary" aria-label="טוען פניות" /></div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/[0.06] p-6 text-center">
            <ShieldAlert className="mx-auto h-7 w-7 text-destructive" />
            <p className="mt-3 font-black text-foreground">לא הצלחנו לטעון את הפניות</p><p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <button type="button" onClick={() => void loadFeedback()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground">נסי שוב</button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/[0.025] p-12 text-center">
            <MessageCircleMore className="mx-auto h-8 w-8 text-primary/65" />
            <p className="mt-4 font-black text-foreground">אין פניות שמתאימות לסינון</p><p className="mt-1 text-sm text-muted-foreground">כשהמשתמשות ישלחו משוב, הוא יופיע כאן.</p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_10px_28px_rgba(73,8,38,0.035)]">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-right text-sm">
                <thead><tr className="border-b border-border bg-muted/35 text-xs text-muted-foreground"><th className="px-5 py-3 font-bold">פנייה</th><th className="px-4 py-3 font-bold">סוג</th><th className="px-4 py-3 font-bold">סטטוס</th><th className="px-4 py-3 font-bold">עדיפות</th><th className="px-4 py-3 font-bold">שולחת</th><th className="px-5 py-3 font-bold">נשלחה</th><th className="w-10 px-3 py-3" /></tr></thead>
                <tbody className="divide-y divide-border">{items.map((feedback) => <tr key={feedback.id} className="cursor-pointer transition-colors hover:bg-primary/[0.025] focus-within:bg-primary/[0.025]" onClick={() => openFeedback(feedback)}><td className="max-w-sm px-5 py-4"><p className="truncate font-black text-foreground">{feedback.subject}</p><p className="mt-1 truncate text-xs text-muted-foreground">{feedback.description}</p></td><td className="px-4 py-4"><FeedbackBadge feedback={feedback} field="type" /></td><td className="px-4 py-4"><FeedbackBadge feedback={feedback} field="status" /></td><td className="px-4 py-4"><FeedbackBadge feedback={feedback} field="priority" /></td><td className="max-w-44 truncate px-4 py-4 font-medium text-foreground">{feedback.reporterDisplayName || feedback.reporterEmail || '—'}</td><td className="whitespace-nowrap px-5 py-4 text-xs text-muted-foreground">{dateLabel(feedback.createdAt)}</td><td className="px-3 py-4"><button type="button" aria-label={`פתיחת פנייה ${feedback.subject}`} onClick={(event) => { event.stopPropagation(); openFeedback(feedback) }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"><ChevronLeft className="h-4 w-4" /></button></td></tr>)}</tbody>
              </table>
            </div>
            <div className="divide-y divide-border md:hidden">{items.map((feedback) => <button key={feedback.id} type="button" onClick={() => openFeedback(feedback)} className="w-full p-4 text-right transition-colors hover:bg-primary/[0.025]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-black text-foreground">{feedback.subject}</p><p className="mt-1 truncate text-xs text-muted-foreground">{feedback.reporterDisplayName || feedback.reporterEmail || '—'} · {dateLabel(feedback.createdAt)}</p></div><ChevronLeft className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" /></div><div className="mt-3 flex flex-wrap gap-1.5"><FeedbackBadge feedback={feedback} field="type" /><FeedbackBadge feedback={feedback} field="status" /><FeedbackBadge feedback={feedback} field="priority" /></div></button>)}</div>
          </section>
        )}

        {!loading && !error && nextCursor && <div className="flex justify-center"><button type="button" onClick={() => void loadFeedback(true)} disabled={loadingMore} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-black text-foreground transition-colors hover:border-primary/35 hover:bg-primary/[0.03] disabled:opacity-60">{loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}{loadingMore ? 'טוען עוד פניות...' : 'טען עוד'}</button></div>}
      </div>

      {selected && <FeedbackDetailsPanel feedback={selected} titleId={panelTitleId} status={draftStatus} priority={draftPriority} note={draftNote} saving={saving} error={saveError} success={saveSuccess} onClose={() => setSelected(null)} onStatusChange={setDraftStatus} onPriorityChange={setDraftPriority} onNoteChange={setDraftNote} onSave={() => void saveSelected()} />}
    </div>
  )
}

function FeedbackDetailsPanel({ feedback, titleId, status, priority, note, saving, error, success, onClose, onStatusChange, onPriorityChange, onNoteChange, onSave }: { feedback: AdminFeedback; titleId: string; status: FeedbackStatus; priority: FeedbackPriority; note: string; saving: boolean; error: string; success: string; onClose: () => void; onStatusChange: (value: FeedbackStatus) => void; onPriorityChange: (value: FeedbackPriority) => void; onNoteChange: (value: string) => void; onSave: () => void }) {
  const pageLink = safePageLink(feedback.pageUrl)
  const allowedStatuses = ALLOWED_TRANSITIONS[feedback.status]
  const panelRef = useRef<HTMLElement>(null)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [screenshotError, setScreenshotError] = useState('')
  const [loadingScreenshot, setLoadingScreenshot] = useState(feedback.hasScreenshot)
  useEffect(() => {
    if (!feedback.hasScreenshot) return
    let active = true
    fetch(`/api/admin/feedback/${feedback.id}/screenshot`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as { data?: { url?: string }; error?: string }
        if (!response.ok || !payload.data?.url) throw new Error(payload.error || 'לא הצלחנו לטעון את צילום המסך')
        if (active) setScreenshotUrl(payload.data.url)
      })
      .catch((loadError: unknown) => { if (active) setScreenshotError(loadError instanceof Error ? loadError.message : 'לא הצלחנו לטעון את צילום המסך') })
      .finally(() => { if (active) setLoadingScreenshot(false) })
    return () => { active = false }
  }, [feedback.hasScreenshot, feedback.id])
  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>('[data-close-feedback-details]')?.focus(), 0)
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable.at(-1)!
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', trapFocus)
    return () => { window.clearTimeout(focusTimer); document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', trapFocus); previouslyFocused?.focus() }
  }, [])
  return <div className="fixed inset-0 z-50" dir="rtl"><button type="button" aria-label="סגירת פרטי הפנייה" onClick={onClose} disabled={saving} className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]" /><aside ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="absolute inset-y-0 left-0 flex w-full max-w-xl flex-col overflow-y-auto border-r border-border bg-card shadow-[-20px_0_70px_rgba(73,8,38,0.24)]">
    <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-5 py-4 backdrop-blur sm:px-6"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-bold text-primary">פנייה #{feedback.id}</p><h2 id={titleId} className="mt-1 truncate text-lg font-black text-foreground">{feedback.subject}</h2></div><button data-close-feedback-details type="button" onClick={onClose} disabled={saving} aria-label="סגירת פרטי הפנייה" className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"><X className="h-5 w-5" /></button></div></div>
    <div className="flex-1 space-y-6 p-5 sm:p-6"><div className="flex flex-wrap gap-2"><FeedbackBadge feedback={feedback} field="type" /><FeedbackBadge feedback={feedback} field="status" /><FeedbackBadge feedback={feedback} field="priority" /></div><section><h3 className="text-xs font-black uppercase tracking-wide text-muted-foreground">פרטי הפנייה</h3><p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-7 text-foreground">{feedback.description}</p></section><section className="grid gap-3 rounded-2xl border border-border bg-muted/25 p-4 text-sm"><div><span className="text-xs font-bold text-muted-foreground">שולחת</span><p className="mt-0.5 font-bold text-foreground">{feedback.reporterDisplayName || 'ללא שם'}{feedback.reporterRole ? <span className="mr-2 text-xs font-medium text-muted-foreground">({feedback.reporterRole})</span> : null}</p><p className="text-xs text-muted-foreground">{feedback.reporterEmail || 'אין אימייל'}</p></div><div><span className="text-xs font-bold text-muted-foreground">נשלחה</span><p className="mt-0.5 font-medium text-foreground">{dateLabel(feedback.createdAt)}</p></div><div><span className="text-xs font-bold text-muted-foreground">העמוד שבו נשלחה</span>{pageLink ? <a href={pageLink.href} target="_blank" rel="noreferrer noopener" className="mt-0.5 flex w-fit items-center gap-1 text-sm font-bold text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" />{pageLink.label}</a> : <p className="mt-0.5 text-sm font-medium text-muted-foreground">העמוד אינו זמין</p>}</div>{feedback.appVersion && <div><span className="text-xs font-bold text-muted-foreground">גרסת אתר</span><p className="mt-0.5 text-sm font-medium text-foreground">{feedback.appVersion}</p></div>}</section>{feedback.hasScreenshot && <section className="rounded-2xl border border-border bg-muted/25 p-4"><h3 className="text-xs font-black uppercase tracking-wide text-muted-foreground">צילום מסך מצורף</h3>{loadingScreenshot ? <Loader2 aria-label="טוען צילום מסך" className="mt-3 h-5 w-5 animate-spin text-primary" /> : screenshotUrl ? <a href={screenshotUrl} target="_blank" rel="noreferrer noopener" className="mt-3 block overflow-hidden rounded-xl border border-primary/15 focus:outline-none focus:ring-2 focus:ring-primary"><img src={screenshotUrl} alt="צילום המסך שצורף לפנייה" className="max-h-80 w-full object-contain bg-muted/40" /><span className="block border-t border-border px-3 py-2 text-xs font-bold text-primary">פתחי בגודל מלא</span></a> : <p role="alert" className="mt-3 text-sm font-bold text-destructive">{screenshotError}</p>}</section>}<section className="space-y-4 border-t border-border pt-5"><h3 className="flex items-center gap-2 font-black text-foreground"><Bug className="h-4 w-4 text-primary" />טיפול בפנייה</h3><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-bold text-foreground">סטטוס<select aria-label="סטטוס הפנייה" value={status} onChange={(event) => onStatusChange(event.target.value as FeedbackStatus)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none focus:border-primary">{STATUS_OPTIONS.filter((entry) => allowedStatuses.includes(entry.value)).map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></label><label className="grid gap-1.5 text-sm font-bold text-foreground">עדיפות<select aria-label="עדיפות הפנייה" value={priority} onChange={(event) => onPriorityChange(event.target.value as FeedbackPriority)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none focus:border-primary">{PRIORITY_OPTIONS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></label></div><label className="grid gap-1.5 text-sm font-bold text-foreground">הערה פנימית<textarea aria-label="הערה פנימית" value={note} onChange={(event) => onNoteChange(event.target.value)} maxLength={2000} rows={5} placeholder="הערה שרק את רואה…" className="resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>{error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3 py-2 text-sm font-bold text-destructive">{error}</p>}{success && <p role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-3 py-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">{success}</p>}<button type="button" onClick={onSave} disabled={saving} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#9D174D] to-[#F5175C] px-4 text-sm font-black text-white shadow-[0_8px_20px_rgba(157,23,77,0.25)] transition hover:brightness-105 disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{saving ? 'שומר…' : 'שמרי שינויים'}</button></section></div>
  </aside></div>
}
