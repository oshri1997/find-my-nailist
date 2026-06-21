import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { HeroSection } from '@/components/home/hero-section'
import { HowItWorksSection } from '@/components/home/how-it-works'
import { FeaturesSection } from '@/components/home/features-section'
import { StatsSection } from '@/components/home/stats-section'
import { NailistCtaSection } from '@/components/home/nailist-cta'

export default function HomePage() {
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
