'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { AuthProvider } from './auth/auth-provider'
import { OnboardingGuard } from './auth/onboarding-guard'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60 * 1000 } } })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OnboardingGuard />
        {children}
      </AuthProvider>
    </QueryClientProvider>
  )
}
