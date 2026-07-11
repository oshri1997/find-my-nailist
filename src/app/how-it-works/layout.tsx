import type { Metadata } from 'next'
import { HOW_IT_WORKS_FAQS } from '@/lib/how-it-works-faqs'

const BASE_URL = 'https://nailistiot.fun'
const title = 'איך זה עובד — הזמנת תור ופרסום פרופיל בנייליסטיות'
const description = "איך לקוחות מוצאות ומזמינות תור אצל נייליסטית באזורן, ואיך נייליסטיות פותחות פרופיל חינמי ומתחילות לקבל תורים — הסבר מלא, שלב אחר שלב."

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: 'website',
    locale: 'he_IL',
    siteName: 'נייליסטיות',
    url: `${BASE_URL}/how-it-works`,
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  alternates: { canonical: '/how-it-works' },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: HOW_IT_WORKS_FAQS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
}

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      {children}
    </>
  )
}
