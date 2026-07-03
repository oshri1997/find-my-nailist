import type { Metadata } from 'next'
import { Heebo } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers } from '@/components/providers'
import { ConditionalNavbar } from '@/components/layout/conditional-navbar'

const heebo = Heebo({ subsets: ['hebrew', 'latin'], weight: ['300', '400', '500', '600', '700', '800', '900'] })

const APP_URL = 'https://nailistiot.fun'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    template: '%s | נייליסטיות',
    default: "נייליסטיות — ג'ל, מניקור ונייל ארט בעירך",
  },
  description: "נייליסטיות — מצאי נייליסטית באזורך בקלות. ג'ל, מניקור, נייל ארט ופדיקור. הזמיני תור אצל נייליסטית מקצועית בתל אביב, ירושלים, חיפה, ראשון לציון ועוד.",
  keywords: [
    'נייליסטיות', 'נייליסטית', 'הזמנת תור', 'ציפורניים', 'ציפורנים',
    "ג'ל", 'נייל ארט', 'מניקור', 'פדיקור', 'עיצוב ציפורניים',
    'נייליסטית בתל אביב', 'נייליסטית בירושלים', 'נייליסטית בחיפה',
    'נייליסטית בראשון לציון', 'נייליסטית בפתח תקווה', 'נייליסטית בנתניה',
    "ג'ל בעיר שלי", 'עיצוב ציפורניים קרוב אלי',
  ],
  openGraph: {
    title: "נייליסטיות — ג'ל, מניקור ונייל ארט בעירך",
    description: "נייליסטיות — מצאי נייליסטית באזורך בקלות. ג'ל, מניקור, נייל ארט ופדיקור בכל הערים.",
    type: 'website',
    locale: 'he_IL',
    siteName: 'נייליסטיות',
    url: APP_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: "נייליסטיות — הזמיני תור אצל נייליסטית",
    description: "הפלטפורמה הישראלית להזמנת תורים אצל נייליסטיות מקצועיות. ג'ל, מניקור ונייל ארט בכל הערים.",
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

const orgJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'נייליסטיות',
    url: APP_URL,
    description: "הפלטפורמה הישראלית המובילה לחיפוש והזמנת תורים אצל נייליסטיות מקצועיות",
    inLanguage: 'he',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${APP_URL}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'נייליסטיות',
    url: APP_URL,
    logo: `${APP_URL}/icon.png`,
    description: "פלטפורמה ישראלית להזמנת תורים אצל נייליסטיות — ג'ל, מניקור, נייל ארט ופדיקור",
    foundingLocation: { '@type': 'Place', addressCountry: 'IL' },
    areaServed: { '@type': 'Country', name: 'Israel' },
    knowsLanguage: 'he',
  },
]

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
        <Providers>
          <ConditionalNavbar />
          {children}
        </Providers>
        {/* UserWay accessibility widget, plus positioning fix combined into a single
            script tag — two separate dangerouslySetInnerHTML scripts here would let the
            first one's synchronous DOM injection (the widget's own <script> tag) shift
            sibling positions before hydration finishes, which desyncs React's hydration
            match for the second script and throws a false "attributes didn't match"
            hydration error. One script tag avoids that race entirely.
            Bottom offset: 80px on mobile to clear the dashboard's fixed bottom nav
            (md:hidden, so mobile-only), 16px on desktop where there's no bottom nav to
            avoid. MutationObserver stops as soon as the widget button is found; a resize
            listener keeps the offset correct across the md (768px) breakpoint. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(d){var s=d.createElement("script");s.setAttribute("data-account","z8YM8BPOF6");s.setAttribute("data-position","2");s.setAttribute("src","https://cdn.userway.org/widget.js");(d.body||d.head).appendChild(s);var target=null;function fix(el){var bottom=window.innerWidth<768?'80px':'16px';el.style.setProperty('position','fixed','important');el.style.setProperty('bottom',bottom,'important');el.style.setProperty('left','16px','important');el.style.setProperty('top','auto','important');el.style.setProperty('right','auto','important');}var obs=new MutationObserver(function(ml){ml.forEach(function(m){m.addedNodes.forEach(function(n){if(n.nodeType!==1)return;var el=n.id&&n.id.toLowerCase().includes('userway')?n:n.querySelector&&n.querySelector('[id*="userway"],[class*="userway"]');if(el){target=el;fix(el);obs.disconnect();}});});});obs.observe(d.body,{childList:true,subtree:true});window.addEventListener('resize',function(){if(target)fix(target);});})(document)` }} />
      </body>
    </html>
  )
}
