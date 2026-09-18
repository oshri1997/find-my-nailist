'use client'

import { useEffect, useState } from 'react'
import { Loader2, Megaphone, Undo2 } from 'lucide-react'
import type { Announcement, AnnouncementAudience, AnnouncementPriority } from '@/types'

const AUDIENCE_OPTIONS: Array<{ value: AnnouncementAudience; label: string }> = [
  { value: 'ALL', label: 'כולן' },
  { value: 'NAILIST', label: 'נייליסטיות' },
  { value: 'CLIENT', label: 'לקוחות' },
]

const PRIORITY_OPTIONS: Array<{ value: AnnouncementPriority; label: string }> = [
  { value: 'MAJOR', label: '⭐ עדכון גדול' },
  { value: 'MINOR', label: 'עדכון קטן' },
]

const AUDIENCE_LABEL: Record<AnnouncementAudience, string> = { ALL: 'כולן', NAILIST: 'נייליסטיות', CLIENT: 'לקוחות' }

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminAnnouncementsPage() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<AnnouncementAudience>('ALL')
  const [priority, setPriority] = useState<AnnouncementPriority>('MAJOR')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [items, setItems] = useState<Announcement[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [retractingId, setRetractingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/announcements')
      .then((r) => r.json())
      .then((json) => setItems(json.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingList(false))
  }, [])

  async function publish() {
    if (!title.trim() || !body.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), audience, priority }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'הפרסום נכשל')
        return
      }
      setItems((prev) => [json.data, ...prev])
      setTitle('')
      setBody('')
    } catch {
      setError('הפרסום נכשל — נסי שוב')
    } finally {
      setSaving(false)
    }
  }

  async function retract(id: string) {
    setRetractingId(id)
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RETRACTED' }),
      })
      if (res.ok) {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'RETRACTED' } : item)))
      }
    } finally {
      setRetractingId(null)
    }
  }

  return (
    <div className="p-4 md:p-8" dir="rtl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 dark:bg-primary/20">
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground">הכרזות</h1>
          <p className="text-sm text-muted-foreground">ספרי לנייליסטיות ולקוחות מה חדש בפלטפורמה</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-4 rounded-3xl border border-border bg-card p-6">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-muted-foreground">כותרת</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="לדוגמה: שעות עבודה מפוצלות"
              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-muted-foreground">תוכן ההכרזה</label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="ספרי בקצרה מה השתנה ולמה זה עוזר..."
              className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-muted-foreground">קהל יעד</label>
            <div className="flex flex-wrap gap-2">
              {AUDIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAudience(opt.value)}
                  className={`h-11 rounded-full border px-4 text-sm font-bold transition-colors ${
                    audience === opt.value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-muted-foreground">חשיבות</label>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={`h-11 rounded-full border px-4 text-sm font-bold transition-colors ${
                    priority === opt.value
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs font-medium leading-5 text-muted-foreground">
              {priority === 'MAJOR'
                ? 'עדכון גדול ייפתח כחלון קופץ בכניסה הבאה של הקהל שבחרת.'
                : 'עדכון קטן יופיע רק בארכיון "מה חדש", בלי לקפוץ בכניסה.'}
            </p>
          </div>

          {error && <p className="text-sm font-semibold text-destructive">{error}</p>}

          <button
            type="button"
            onClick={publish}
            disabled={saving || !title.trim() || !body.trim()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-black text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'פרסמי הכרזה'}
          </button>
          <p className="text-xs text-muted-foreground">
            אחרי הפרסום, הכותרת והתוכן קפואים — לתיקון טעות בטלי את הפרסום ופרסמי הכרזה חדשה.
          </p>
        </div>

        <div className="space-y-3">
          {loadingList ? (
            <div className="flex items-center gap-2 p-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> טוענת הכרזות...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              עדיין לא פורסמו הכרזות
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          item.priority === 'MAJOR' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {item.priority === 'MAJOR' ? '⭐ עדכון גדול' : 'עדכון קטן'}
                      </span>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                        {AUDIENCE_LABEL[item.audience]}
                      </span>
                      {item.status === 'RETRACTED' && (
                        <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive">
                          בוטל
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-base font-black text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm font-medium leading-6 text-muted-foreground">{item.body}</p>
                    <p className="mt-2 text-xs font-semibold text-muted-foreground/70">{formatDate(item.publishedAt)}</p>
                  </div>
                  {item.status === 'PUBLISHED' && (
                    <button
                      type="button"
                      onClick={() => retract(item.id)}
                      disabled={retractingId === item.id}
                      className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
                    >
                      {retractingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                      בטלי פרסום
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
