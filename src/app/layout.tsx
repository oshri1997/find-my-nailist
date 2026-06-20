import type { Metadata } from 'next'
import { Heebo } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const heebo = Heebo({ subsets: ['hebrew', 'latin'], weight: ['300', '400', '500', '600', '700', '800', '900'] })

export const metadata: Metadata = {
  title: 'נייליסטיות | גלי מומחיות ציפורניים קרוב אלייך',
  description: 'הזמיני תור אצל מומחיות ציפורניים מוכשרות בקרבתך. עיצוב ג\'ל, נייל ארט, ומניקור מקצועי.',
  keywords: ['נייליסטית', 'ציפורניים', 'ג\'ל', 'נייל ארט', 'מניקור', 'תור'],
  openGraph: {
    title: 'נייליסטיות',
    description: 'גלי מומחיות ציפורניים קרוב אלייך',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className={heebo.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
