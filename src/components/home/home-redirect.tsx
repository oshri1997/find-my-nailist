'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'

export function HomeRedirect() {
  const { user, role, onboardingCompleted, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading || !user) return
    // An incomplete-onboarding nailist goes straight to /onboarding — sending
    // her to /dashboard/nailist first would just bounce again immediately
    // (OnboardingGuard redirects any incomplete nailist away from there too).
    if (role === 'NAILIST') router.replace(onboardingCompleted ? '/dashboard/nailist' : '/onboarding')
    else if (role === 'CLIENT') router.replace('/search')
  }, [user, role, onboardingCompleted, loading, router])

  return null
}
