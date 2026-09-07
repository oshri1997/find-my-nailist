'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { AuthProvider } from './auth/auth-provider'
import { OnboardingGuard } from './auth/onboarding-guard'
import { VisitTracker } from './analytics/visit-tracker'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60 * 1000 } } })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <VisitTracker />
        <OnboardingGuard />
        {children}
      </AuthProvider>
    </QueryClientProvider>
  )
}
