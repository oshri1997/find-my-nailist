'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'

export function HomeRedirect() {
  const { user, role, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading || !user) return
    if (role === 'NAILIST') router.replace('/dashboard/nailist')
    else if (role === 'CLIENT') router.replace('/search')
  }, [user, role, loading, router])

  return null
}
