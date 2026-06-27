import type { Metadata } from 'next'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { HeroSection } from '@/components/home/hero-section'
import { HowItWorksSection } from '@/components/home/how-it-works'
import { FeaturesSection } from '@/components/home/features-section'
import { StatsSection } from '@/components/home/stats-section'
import { NailistCtaSection } from '@/components/home/nailist-cta'

export const metadata: Metadata = {
  title: 'נייליסטיות — מצאי נייליסטית מקצועית קרוב אלייך',
  description: 'הפלטפורמה הישראלית המובילה לחיפוש נייליסטיות מקצועיות. חפשי לפי עיר, השווי מחירים וקביעי תור אונליין — גל, נייל ארט, מניקור ופדיקור.',
  alternates: { canonical: 'https://nailistiot.fun' },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'איך מוצאים נייליסטית בקרבתי?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'ב-נייליסטיות.fun מחפשים לפי עיר, רואים תמונות עבודה, קוראים ביקורות ומזמינות תור ישירות — הכל במקום אחד, בחינם.',
      },
    },
    {
      '@type': 'Question',
      name: 'אילו שירותים ניתן להזמין?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'ניתן לקבוע תור לעיצוב גל, נייל ארט, מניקור קלאסי, פדיקור, הסרה, חיזוק ציפורניים ועוד — בהתאם לשירותים שמציעה כל נייליסטית.',
      },
    },
    {
      '@type': 'Question',
      name: 'האם ההזמנה דרך האתר בחינם?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'כן, קביעת תור דרך נייליסטיות היא חינמית לחלוטין. משלמים רק לנייליסטית עצמה בסיום הטיפול.',
      },
    },
    {
      '@type': 'Question',
      name: 'איך נייליסטית מצטרפת לאתר?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'נייליסטיות מקצועיות מוזמנות להירשם בחינם, להעלות תיק עבודות ולקבל לקוחות חדשות ישירות דרך הפלטפורמה.',
      },
    },
  ],
}

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
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
