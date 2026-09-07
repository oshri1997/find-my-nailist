'use client'

import { useEffect, useRef } from 'react'
import { classifyVisitSource } from '@/lib/visit-analytics'

const SESSION_KEY = 'nailistiot.visit-tracked'
const PRODUCTION_HOSTNAME = 'nailistiot.fun'

export function shouldTrackVisit(hostname: string) {
  return hostname === PRODUCTION_HOSTNAME
}

// Records one anonymous visit per browser tab session. No account, path, IP, or
// persistent identifier is sent; only the coarse acquisition source is stored.
export function VisitTracker() {
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true
    if (!shouldTrackVisit(window.location.hostname)) return

    try {
      if (window.sessionStorage.getItem(SESSION_KEY)) return
      window.sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      // Private browsing can deny session storage. Still record this page load.
    }

    fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: classifyVisitSource(document.referrer) }),
      keepalive: true,
    }).catch(() => {})
  }, [])

  return null
}
