import type { Metadata } from 'next'
import { Navbar } from '@/components/layout/navbar'

export const metadata: Metadata = {
  title: 'נייליסטיות — מצאי נייליסטית מקצועית קרוב אלייך',
  description: 'חפשי נייליסטיות מקצועיות בעירך והזמיני תור בשניות. עיצוב גל, נייל ארט, מניקור ופדיקור — הפלטפורמה הישראלית המובילה לנייליסטיות.',
  alternates: { canonical: 'https://nailistiot.fun' },
}
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
