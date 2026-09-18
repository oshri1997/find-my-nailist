'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Megaphone, Sparkles } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import type { Announcement } from '@/types'

// Full published history for the caller's audience — no read/unread state
// here (that only exists to gate the modal). See src/lib/announcements.ts.
function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="h-3 w-24 rounded bg-muted" />
      <div className="h-4 w-2/3 rounded bg-muted" />
      <div className="h-3 w-full rounded bg-muted" />
      <div className="h-3 w-4/5 rounded bg-muted" />
    </div>
  )
}

function formatPublishedDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function WhatsNewPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login?redirect=/whats-new')
      return
    }
    fetch('/api/announcements/archive')
      .then((r) => r.json())
      .then((json) => setItems(json.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, authLoading, router])

  return (
    <div className="min-h-screen bg-muted/40" dir="rtl">
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 dark:bg-primary/20">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">מה חדש</h1>
            <p className="text-sm text-muted-foreground">כל העדכונים והפיצ&apos;רים שפרסמנו</p>
          </div>
        </div>

        {loading || authLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 dark:bg-primary/20">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <p className="text-xl font-black text-foreground">עדיין אין עדכונים</p>
            <p className="max-w-xs text-sm text-muted-foreground">כשנפרסם משהו חדש, זה יופיע כאן</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.04 }}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      item.priority === 'MAJOR'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {item.priority === 'MAJOR' ? '⭐ עדכון גדול' : 'עדכון קטן'}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">{formatPublishedDate(item.publishedAt)}</span>
                </div>
                <p className="mt-3 text-base font-black text-foreground">{item.title}</p>
                <p className="mt-1.5 text-sm font-medium leading-6 text-muted-foreground">{item.body}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
