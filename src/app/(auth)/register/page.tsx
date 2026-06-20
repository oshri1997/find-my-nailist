'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/login?tab=register') }, [router])
  return null
}
