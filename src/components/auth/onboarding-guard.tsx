'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'

// A user who registered but never finished the onboarding wizard (e.g. they
// closed the tab mid-way, or logged in again from a different device) should
// land back in onboarding instead of browsing the app half set-up. This is a
// UX redirect, not a security boundary — other routes still work without it
// since an incomplete profile just renders with missing data (for a client,
// that means no real name: appointments/reviews fall back to a generic
// "לקוחה" instead of showing "First L.").
const ALLOWED_PREFIXES = ['/onboarding', '/login', '/terms', '/privacy', '/accessibility', '/how-it-works']

export function OnboardingGuard() {
  const { role, onboardingCompleted, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (loading || !role || role === 'ADMIN' || onboardingCompleted) return
    const allowed = ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
    if (!allowed) router.replace(role === 'NAILIST' ? '/onboarding' : '/onboarding/client')
  }, [loading, role, onboardingCompleted, pathname, router])

  return null
}
