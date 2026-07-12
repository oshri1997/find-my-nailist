import type { Metadata } from 'next'
import { Heebo, Frank_Ruhl_Libre } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { ConditionalNavbar } from '@/components/layout/conditional-navbar'
import { CookieNotice } from '@/components/layout/cookie-notice'

const heebo = Heebo({ subsets: ['hebrew', 'latin'], weight: ['300', '400', '500', '600', '700', '800', '900'] })
// Elegant Hebrew-native display serif for hero/section headings — reserved
// for large display text via the `.font-display` utility (see globals.css),
// not applied body-wide; Heebo stays the UI/body workhorse everywhere else.
const frankRuhlLibre = Frank_Ruhl_Libre({
  subsets: ['hebrew', 'latin'],
  weight: ['500', '700', '900'],
  variable: '--font-display',
})

const APP_URL = 'https://nailistiot.fun'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    template: '%s | נייליסטיות',
    default: "נייליסטיות — מצאי נייליסטיות באזורך במהירות ובקלות",
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
    title: "נייליסטיות — מצאי נייליסטיות באזורך במהירות ובקלות",
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
      <body className={`${heebo.className} ${frankRuhlLibre.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <Providers>
          <ConditionalNavbar />
          {children}
        </Providers>
        <CookieNotice />
        {/* UserWay accessibility widget. data-position="5"/data-size="small" (per
            UserWay's own docs at help.userway.org) got it onto the correct side
            of the screen and to the right discrete size — data-position="2"
            (the old value) was actually "Middle right", never bottom-left.
            But a live ?debugA11y=1 dump showed UserWay itself still renders the
            icon with a HARDCODED pixel `top` value (e.g. top:560px) rather than
            an actual bottom-anchored position, with no transform/containing-
            block issue involved at all (a transform-trap theory from an earlier
            version of this comment was investigated and ruled out — verified
            directly via that same dump: transform:none on the icon and both of
            its ancestors). A hardcoded top offset computed once doesn't track
            the real viewport height, which on mobile Safari changes as the
            address bar shows/hides — explaining why it lands well short of the
            true bottom edge. fixPosition() force-overrides top/bottom/left/
            right directly (the one part of this that genuinely does need a JS
            override, since UserWay's own bottom-anchoring isn't reliable here),
            re-applied on any DOM/attribute change and on resize so it keeps
            correcting if UserWay's script reasserts its own top value.
            The nailist dashboard has its own fixed bottom tab bar on mobile
            (md:hidden, see dashboard/layout.tsx) — bottomPx() adds clearance for
            that route specifically.
            Kept in one script tag (not two) — the widget's own <script> tag
            insertion shifts sibling positions before hydration finishes, which
            would desync React's hydration match if split across two
            dangerouslySetInnerHTML scripts. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(d){
  var mobile=window.innerWidth<768;
  var s=d.createElement("script");
  s.setAttribute("data-account","z8YM8BPOF6");
  s.setAttribute("data-position","5");
  if(mobile)s.setAttribute("data-size","small");
  s.setAttribute("src","https://cdn.userway.org/widget.js");
  (d.body||d.head).appendChild(s);

  function isDashboardRoute(){return window.location.pathname.indexOf('/dashboard')===0;}
  function bottomPx(){return (window.innerWidth<768&&isDashboardRoute())?'80px':'16px';}
  // data-size="small" is UserWay's smallest documented option (the only other
  // value is "large") — scale it down further on mobile, anchored to its own
  // bottom-left corner so shrinking it doesn't shift it off the corner it's
  // pinned to.
  function scaleValue(){return window.innerWidth<768?'0.75':'1';}
  function fixPosition(){
    var el=d.getElementById('userwayAccessibilityIcon');
    if(!el)return;
    el.style.setProperty('position','fixed','important');
    el.style.setProperty('top','auto','important');
    el.style.setProperty('bottom',bottomPx(),'important');
    el.style.setProperty('left','16px','important');
    el.style.setProperty('right','auto','important');
    el.style.setProperty('transform-origin','0% 100%','important');
    el.style.setProperty('transform','scale('+scaleValue()+')','important');
  }
  var obs=new MutationObserver(fixPosition);
  obs.observe(d.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style']});
  window.addEventListener('resize',fixPosition);
  setInterval(fixPosition,1000);
})(document)` }} />
      </body>
    </html>
  )
}
