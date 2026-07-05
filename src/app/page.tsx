import type { Metadata } from 'next'
import { Footer } from '@/components/layout/footer'
import { HeroSection } from '@/components/home/hero-section'
import { HowItWorksSection } from '@/components/home/how-it-works'
import { FeaturesSection } from '@/components/home/features-section'
import { NailistCtaSection } from '@/components/home/nailist-cta'
import { HomeRedirect } from '@/components/home/home-redirect'

export const metadata: Metadata = {
  title: "נייליסטיות — מצאי נייליסטיות באזורך במהירות ובקלות",
  description: "הפלטפורמה הישראלית לחיפוש נייליסטיות מקצועיות. נייליסטית בתל אביב, ירושלים, חיפה, ראשון לציון, פתח תקווה, נתניה ועוד. ג'ל, נייל ארט, מניקור ופדיקור — הזמיני תור בשניות.",
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
      <HomeRedirect />
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <NailistCtaSection />
      <Footer />
    </div>
  )
}
