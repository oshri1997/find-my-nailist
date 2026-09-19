'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { AnnouncementModalView } from '@/components/announcements/AnnouncementModalView'
import type { Announcement } from '@/types'

/**
 * Mounted once, globally (see Providers). Waits for onboarding to complete
 * and for the verification reminder (a concrete action item) to not be on
 * screen, then checks once per session for unseen MAJOR announcements. See
 * src/lib/announcements.ts and the AnnouncementDoc comment in src/types for
 * the full design (watermark, priority, immutable-once-published).
 */
export function AnnouncementModal() {
  const { user, loading, role, onboardingCompleted, verificationReminderActive, productTourActive } = useAuth()
  const pathname = usePathname()
  const [items, setItems] = useState<Announcement[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [open, setOpen] = useState(false)
  const fetchedRef = useRef(false)

  useEffect(() => {
    // The login page starts its redirect only after AuthProvider finishes
    // resolving role data. Without this gate the global modal can win that
    // race and briefly open on /login before the user reaches her destination.
    const isAuthFlow = pathname === '/login' || pathname === '/verify-email' || pathname?.startsWith('/onboarding/')
    if (isAuthFlow) return
    if (loading || !user || !role || role === 'ADMIN' || !onboardingCompleted) return
    if (verificationReminderActive) return
    if (productTourActive) return
    if (fetchedRef.current) return
    fetchedRef.current = true

    void (async () => {
      try {
        const res = await fetch('/api/announcements')
        if (!res.ok) {
          // Never block the app on this, but a silent failure here (e.g. a
          // missing Firestore composite index) previously looked identical
          // to "nothing to show" — log it so it's actually diagnosable.
          console.error('GET /api/announcements failed:', res.status, await res.text().catch(() => ''))
          return
        }
        const { data } = await res.json()
        if (data?.items?.length) {
          setItems(data.items)
          setHasMore(!!data.hasMore)
          setOpen(true)
        }
      } catch (error) {
        console.error('GET /api/announcements failed:', error)
      }
    })()
  }, [pathname, loading, user, role, onboardingCompleted, verificationReminderActive, productTourActive])

  function close() {
    setOpen(false)
    fetch('/api/announcements/seen', { method: 'POST' }).catch(() => {})
  }

  if (!open) return null
  return <AnnouncementModalView items={items} hasMore={hasMore} onClose={close} />
}
