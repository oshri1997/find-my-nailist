'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'

export function HomeRedirect() {
  const { user, role, onboardingCompleted, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading || !user) return
    // An incomplete-onboarding user goes straight to their onboarding wizard —
    // sending them to /dashboard/nailist or /search first would just bounce
    // again immediately (OnboardingGuard redirects any incomplete user away
    // from those too).
    if (role === 'NAILIST') router.replace(onboardingCompleted ? '/dashboard/nailist' : '/onboarding')
    else if (role === 'CLIENT') router.replace(onboardingCompleted ? '/search' : '/onboarding/client')
    else if (role === 'ADMIN') router.replace('/admin')
  }, [user, role, onboardingCompleted, loading, router])

  return null
}
