'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Inbox, Loader2, MessageCircleMore } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { FeedbackLauncher } from '@/components/feedback/FeedbackLauncher'
import type { FeedbackStatus, FeedbackType } from '@/types'

// This deliberately mirrors the safe reporter DTO from GET /api/feedback.
// Triage fields such as priority/internal notes are manager-only.
type Item = { id: string; type: FeedbackType; subject: string; description: string; status: FeedbackStatus; pageUrl: string; createdAt: string | null; updatedAt: string | null }

const statusLabel: Record<FeedbackStatus, string> = { NEW: 'התקבלה', IN_REVIEW: 'בבדיקה', PLANNED: 'מתוכננת', RESOLVED: 'נפתרה', CLOSED: 'נסגרה' }
const statusTone: Record<FeedbackStatus, string> = { NEW: 'bg-primary/10 text-primary', IN_REVIEW: 'bg-violet-500/10 text-violet-700 dark:text-violet-300', PLANNED: 'bg-sky-500/10 text-sky-700 dark:text-sky-300', RESOLVED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', CLOSED: 'bg-muted text-muted-foreground' }
const typeLabel: Record<FeedbackType, string> = { BUG: 'תקלה', IDEA: 'רעיון', QUESTION: 'שאלה', OTHER: 'אחר' }

function dateLabel(date: string | null) {
  if (!date) return 'לפני רגע'
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('he-IL', { dateStyle: 'medium' })
}

export default function MyFeedbackPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  async function load(cursor?: string) {
    const response = await fetch(`/api/feedback${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`)
    const payload = await response.json().catch(() => ({})) as { data?: Item[]; nextCursor?: string | null; error?: string }
    if (!response.ok) throw new Error(payload.error || 'לא הצלחנו לטעון את הפניות.')
    setItems(current => cursor ? [...current, ...(payload.data ?? [])] : (payload.data ?? []))
    setNextCursor(payload.nextCursor ?? null)
  }

  useEffect(() => { load().catch((e: Error) => setError(e.message)).finally(() => setLoading(false)) }, [])

  return <div dir="rtl" className="min-h-screen bg-background"><Navbar />
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-primary"><ArrowRight className="h-4 w-4" /> חזרה לאתר</Link>
      <section className="mt-5 overflow-hidden rounded-[28px] border border-primary/15 bg-card shadow-[0_16px_60px_rgba(96,18,58,0.09)]">
        <div className="bg-gradient-to-l from-[#9D174D] to-[#F5175C] px-6 py-7 text-white sm:px-8">
          <p className="text-xs font-black tracking-wide text-white/75">מרכז המשוב</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-black sm:text-3xl">הפניות שלי</h1><p className="mt-1 text-sm font-medium text-white/85">כאן אפשר לעקוב אחרי הטיפול במה ששלחת.</p></div><FeedbackLauncher className="bg-white/15 text-white hover:bg-white/25 hover:text-white" /></div>
        </div>
        <div className="p-5 sm:p-7">
          {loading ? <div className="flex justify-center py-14"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : error ? <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm font-bold text-destructive">{error}</p> : items.length === 0 ? <div className="py-14 text-center"><Inbox className="mx-auto h-10 w-10 text-primary/50" /><h2 className="mt-4 text-lg font-black">עוד לא שלחת פנייה</h2><p className="mt-1 text-sm text-muted-foreground">נתקלת במשהו? נשמח לשמוע ולשפר.</p></div> : <div className="space-y-3">{items.map(item => <article key={item.id} className="rounded-2xl border border-border bg-background p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">{typeLabel[item.type]}</span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusTone[item.status]}`}>{statusLabel[item.status]}</span></div><h2 className="mt-3 font-black text-foreground">{item.subject}</h2><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.description}</p></div><time className="text-xs font-semibold text-muted-foreground">{dateLabel(item.createdAt)}</time></div></article>)}</div>}
          {nextCursor && <button type="button" disabled={loadingMore} onClick={() => { setLoadingMore(true); load(nextCursor).catch((e: Error) => setError(e.message)).finally(() => setLoadingMore(false)) }} className="mx-auto mt-6 flex rounded-xl border border-primary/20 px-4 py-2 text-sm font-black text-primary hover:bg-primary/5 disabled:opacity-50">{loadingMore ? 'טוענים…' : 'טעני עוד פניות'}</button>}
        </div>
      </section>
    </main>
  </div>
}
