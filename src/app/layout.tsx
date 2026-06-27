import type { Metadata } from 'next'
import { Heebo } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers } from '@/components/providers'

const heebo = Heebo({ subsets: ['hebrew', 'latin'], weight: ['300', '400', '500', '600', '700', '800', '900'] })

const APP_URL = 'https://nailistiot.fun'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    template: '%s | נייליסטיות',
    default: 'נייליסטיות — מצאי נייליסטית מקצועית קרוב אלייך',
  },
  description: 'הפלטפורמה הישראלית המובילה לחיפוש והזמנת תורים אצל נייליסטיות מקצועיות. עיצוב גל, נייל ארט, מניקור ופדיקור — הזמיני תור בשניות.',
  keywords: ['נייליסטיות', 'נייליסטית', 'הזמנת תור', 'ציפורניים', 'גל', 'נייל ארט', 'מניקור', 'פדיקור', 'עיצוב ציפורניים'],
  openGraph: {
    title: 'נייליסטיות — מצאי נייליסטית מקצועית',
    description: 'הפלטפורמה הישראלית להזמנת תורים אצל נייליסטיות מקצועיות. גל, נייל ארט, מניקור ופדיקור.',
    type: 'website',
    locale: 'he_IL',
    siteName: 'נייליסטיות',
    url: APP_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'נייליסטיות — הזמיני תור אצל נייליסטית',
    description: 'הפלטפורמה הישראלית להזמנת תורים אצל נייליסטיות מקצועיות.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: APP_URL,
  },
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'נייליסטיות',
  url: APP_URL,
  description: 'הפלטפורמה הישראלית המובילה לחיפוש והזמנת תורים אצל נייליסטיות מקצועיות',
  inLanguage: 'he',
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${APP_URL}/search?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        {/* Apply saved theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()` }} />
      </head>
      <body className={heebo.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <Providers>{children}</Providers>
        {/* UserWay accessibility widget */}
        <script dangerouslySetInnerHTML={{ __html: `(function(d){var s=d.createElement("script");s.setAttribute("data-account","z8YM8BPOF6");s.setAttribute("data-position","2");s.setAttribute("src","https://cdn.userway.org/widget.js");(d.body||d.head).appendChild(s)})(document)` }} />
        {/* Force UserWay button to bottom-left — MutationObserver stops as soon as element is found */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){function fix(el){el.style.setProperty('position','fixed','important');el.style.setProperty('bottom','16px','important');el.style.setProperty('left','16px','important');el.style.setProperty('top','auto','important');el.style.setProperty('right','auto','important');}var obs=new MutationObserver(function(ml){ml.forEach(function(m){m.addedNodes.forEach(function(n){if(n.nodeType!==1)return;var el=n.id&&n.id.toLowerCase().includes('userway')?n:n.querySelector&&n.querySelector('[id*="userway"],[class*="userway"]');if(el){fix(el);obs.disconnect();}});});});obs.observe(document.body,{childList:true,subtree:true});})()` }} />
      </body>
    </html>
  )
}
