'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Sparkles, X } from 'lucide-react'
import { AnnouncementBody } from '@/components/announcements/AnnouncementBody'
import type { Announcement } from '@/types'

function formatPublishedDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })
}

interface AnnouncementModalViewProps {
  items: Announcement[]
  hasMore: boolean
  onClose: () => void
}

/**
 * The modal's presentation, with nothing about fetching or the watermark —
 * reused by AnnouncementModal (the real, global gate) and by the admin
 * composer's live preview, so what an admin previews can never drift from
 * what a real user actually sees.
 */
export function AnnouncementModalView({ items, hasMore, onClose }: AnnouncementModalViewProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable?.length) return
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
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (items.length === 0) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-modal-title"
      dir="rtl"
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
    >
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-6 text-right shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">⭐ עדכון גדול</span>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="סגירה"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h2 id="announcement-modal-title" className="text-xl font-black text-foreground">
          ✨ מה חדש בפלטפורמה
        </h2>

        <div className="mt-4 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Sparkles className="h-[18px] w-[18px] text-primary" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{item.title}</p>
                <AnnouncementBody body={item.body} className="mt-0.5 text-sm font-medium leading-6 text-muted-foreground" />
                <p className="mt-1 text-xs font-semibold text-muted-foreground/70">{formatPublishedDate(item.publishedAt)}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-black text-primary-foreground transition-colors hover:bg-primary/90"
        >
          הבנתי, תודה!
        </button>
        <Link
          href="/whats-new"
          onClick={onClose}
          className="mt-3 block text-center text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          {hasMore ? 'יש עוד — לצפייה בכל העדכונים' : 'לצפייה בכל העדכונים'}
        </Link>
      </div>
    </div>
  )
}
