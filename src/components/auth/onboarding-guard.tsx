'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'

// A nailist who registered but never finished the onboarding wizard (e.g. she
// closed the tab mid-way, or logged in again from a different device) should
// land back in onboarding instead of browsing the app half set-up. This is a
// UX redirect, not a security boundary — /dashboard/nailist routes still work
// without it since incomplete profiles just render with missing data.
const ALLOWED_PREFIXES = ['/onboarding', '/login', '/terms', '/privacy', '/accessibility', '/how-it-works']

export function OnboardingGuard() {
  const { role, onboardingCompleted, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (loading || role !== 'NAILIST' || onboardingCompleted) return
    const allowed = ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
    if (!allowed) router.replace('/onboarding')
  }, [loading, role, onboardingCompleted, pathname, router])

  return null
}
