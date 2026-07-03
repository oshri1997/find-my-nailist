'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'

const HIDDEN_PREFIXES = [
  '/admin',
  '/dashboard',
  '/onboarding',
  '/login',
  '/register',
  '/forgot-password',
  '/appointments/confirmed',
]

export function ConditionalNavbar() {
  const pathname = usePathname()
  const hidden = HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
  if (hidden) return null
  return <Navbar />
}
