'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { HeroSection } from '@/components/home/hero-section'
import { HowItWorksSection } from '@/components/home/how-it-works'
import { FeaturesSection } from '@/components/home/features-section'
import { StatsSection } from '@/components/home/stats-section'
import { NailistCtaSection } from '@/components/home/nailist-cta'

export default function HomePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (authLoading || !user) return
    fetch('/api/me/role')
      .then(r => r.json())
      .then(({ role }) => {
        if (role === 'NAILIST') router.replace('/dashboard/nailist')
        else router.replace('/search')
      })
      .catch(() => {})
  }, [user, authLoading, router])

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <HowItWorksSection />
      <FeaturesSection />
      <NailistCtaSection />
      <Footer />
    </div>
  )
}
