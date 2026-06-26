import type { Metadata } from 'next'
import { Heebo } from 'next/font/google'
import Script from 'next/script'
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
      <head>
        {/* Apply saved theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()` }} />
      </head>
      <body className={heebo.className}>
        <Providers>{children}</Providers>
        {/* UserWay accessibility widget */}
        <script dangerouslySetInnerHTML={{ __html: `(function(d){var s=d.createElement("script");s.setAttribute("data-account","z8YM8BPOF6");s.setAttribute("data-position","2");s.setAttribute("src","https://cdn.userway.org/widget.js");(d.body||d.head).appendChild(s)})(document)` }} />
        {/* Force UserWay button to bottom-left — MutationObserver stops as soon as element is found */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){function fix(el){el.style.setProperty('position','fixed','important');el.style.setProperty('bottom','16px','important');el.style.setProperty('left','16px','important');el.style.setProperty('top','auto','important');el.style.setProperty('right','auto','important');}var obs=new MutationObserver(function(ml){ml.forEach(function(m){m.addedNodes.forEach(function(n){if(n.nodeType!==1)return;var el=n.id&&n.id.toLowerCase().includes('userway')?n:n.querySelector&&n.querySelector('[id*="userway"],[class*="userway"]');if(el){fix(el);obs.disconnect();}});});});obs.observe(document.body,{childList:true,subtree:true});})()` }} />
      </body>
    </html>
  )
}
