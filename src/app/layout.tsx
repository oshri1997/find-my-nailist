import type { Metadata } from 'next'
import { Heebo } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { ConditionalNavbar } from '@/components/layout/conditional-navbar'
import { CookieNotice } from '@/components/layout/cookie-notice'

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
        <CookieNotice />
        {/* UserWay accessibility widget, plus positioning fix combined into a single
            script tag — two separate dangerouslySetInnerHTML scripts here would let the
            first one's synchronous DOM injection (the widget's own <script> tag) shift
            sibling positions before hydration finishes, which desyncs React's hydration
            match for the second script and throws a false "attributes didn't match"
            hydration error. One script tag avoids that race entirely.
            Bottom offset: 80px only on /dashboard routes on mobile, to clear THAT
            layout's fixed bottom tab bar (md:hidden, so mobile-only) — everywhere else
            (including the homepage) the button sits flush at 16px, same as desktop, per
            "pin it to the bottom-left on mobile". It was previously offset 80px on
            every mobile page regardless of route, stranding it with a pointless gap
            above the true bottom edge where there's no nav to clear.
            Element matching is done by manually lowercasing id/className rather than a
            CSS `[id*="userway"]` attribute selector, since that selector is
            case-sensitive and UserWay's real markup can use mixed-case ids/classes a
            lowercase-only selector silently never matches — the widget then keeps
            whatever default in-flow position it rendered with and never gets pinned at
            all (this was observed happening, not just theoretical).
            The body observer never disconnects (UserWay can recreate the button node
            later), an attribute observer re-applies the fix if the widget's own script
            repositions it, a resize listener keeps the offset correct across the md
            (768px) breakpoint, and a 1s poll re-applies the fix after client-side route
            changes (a plain script has no hook into the App Router, so this is the
            simplest way to notice navigating into/out of /dashboard without a full page
            reload). */}
        <script dangerouslySetInnerHTML={{ __html: `(function(d){
  var s=d.createElement("script");
  s.setAttribute("data-account","z8YM8BPOF6");
  s.setAttribute("data-position","2");
  s.setAttribute("src","https://cdn.userway.org/widget.js");
  (d.body||d.head).appendChild(s);

  function isDashboardRoute(){return window.location.pathname.indexOf('/dashboard')===0;}
  function bottomPx(){return (window.innerWidth<768 && isDashboardRoute())?'80px':'16px';}
  function matchesUserway(el){
    if(!el||el.nodeType!==1)return false;
    var id=(el.id||'').toLowerCase();
    var cls=(typeof el.className==='string'?el.className:'').toLowerCase();
    return id.indexOf('userway')!==-1||cls.indexOf('userway')!==-1;
  }
  function findWidgetEl(){
    // The real clickable icon is #userwayAccessibilityIcon (confirmed via a
    // live DOM dump) — it sets its own independent position:fixed with
    // explicit top/left, ignoring whatever its ancestor wrapper does. Several
    // OTHER elements also match "userway" in id/class (a zero-size outer
    // wrapper, a hidden legacy icon, a panel iframe) and, critically, come
    // FIRST in document order — a first-match-wins scan was grabbing one of
    // those instead, so fixing it had no visible effect since the real icon
    // never looked at it. Try the known id directly first; fall back to the
    // first nonzero-size, non-hidden match in case UserWay ever renames it.
    var byId=d.getElementById('userwayAccessibilityIcon');
    if(byId)return byId;
    var all=d.body.querySelectorAll('*');
    var fallback=null;
    for(var i=0;i<all.length;i++){
      if(!matchesUserway(all[i]))continue;
      if(!fallback)fallback=all[i];
      var r=all[i].getBoundingClientRect();
      var cls=(typeof all[i].className==='string'?all[i].className:'');
      if(r.width>0&&r.height>0&&cls.indexOf('hidden')===-1)return all[i];
    }
    return fallback;
  }
  function needsFix(el){
    var cs=getComputedStyle(el);
    return cs.position!=='fixed'||cs.left!=='16px'||cs.bottom!==bottomPx()||cs.top!=='auto'||cs.right!=='auto';
  }
  function fix(el){
    if(!needsFix(el))return;
    el.style.setProperty('position','fixed','important');
    el.style.setProperty('bottom',bottomPx(),'important');
    el.style.setProperty('left','16px','important');
    el.style.setProperty('top','auto','important');
    el.style.setProperty('right','auto','important');
  }
  var current=null,attrObs=null;
  function watch(el){
    current=el;fix(el);
    if(attrObs)attrObs.disconnect();
    attrObs=new MutationObserver(function(){fix(el);});
    attrObs.observe(el,{attributes:true,attributeFilter:['style','class']});
  }
  var existing=findWidgetEl();if(existing)watch(existing);
  var bodyObs=new MutationObserver(function(){
    if(!current||!d.body.contains(current)){var el=findWidgetEl();if(el)watch(el);}
  });
  bodyObs.observe(d.body,{childList:true,subtree:true});
  window.addEventListener('resize',function(){if(current)fix(current);});
  setInterval(function(){if(current&&d.body.contains(current))fix(current);},1000);

  // Temporary on-page diagnostic, only active with ?debugA11y=1 in the URL —
  // the widget's actual markup can't be inspected from this environment (no
  // outbound network access to the CDN or the live site), so this renders
  // what's really in the DOM directly on-screen instead of guessing blind.
  // Remove once the real fix is confirmed working.
  if(window.location.search.indexOf('debugA11y')!==-1){
    setTimeout(function(){
      function describe(el){
        var r=el.getBoundingClientRect();
        var cls=typeof el.className==='string'?el.className:'';
        return el.tagName+'#'+el.id+'.'+cls+' rect='+JSON.stringify({top:Math.round(r.top),left:Math.round(r.left),bottom:Math.round(r.bottom),right:Math.round(r.right)});
      }
      var allEls=d.body.querySelectorAll('*');
      var fixedEls=[];
      var nameMatches=[];
      for(var i=0;i<allEls.length;i++){
        var el=allEls[i];
        if(getComputedStyle(el).position==='fixed')fixedEls.push(describe(el));
        var id=(el.id||'').toLowerCase();
        var cls2=(typeof el.className==='string'?el.className:'').toLowerCase();
        if(id.indexOf('userway')!==-1||cls2.indexOf('userway')!==-1||id.indexOf('access')!==-1||cls2.indexOf('access')!==-1){
          nameMatches.push(describe(el));
        }
      }
      var panel=d.createElement('div');
      panel.style.cssText='position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#000;color:#0f0;font-size:10px;line-height:1.4;padding:8px;max-height:60vh;overflow:auto;white-space:pre-wrap;direction:ltr;text-align:left;font-family:monospace;';
      panel.textContent='current found by our own logic: '+(current?describe(current):'(none)')+
        '\\n\\nFIXED-POSITION ELEMENTS ('+fixedEls.length+'):\\n'+(fixedEls.join('\\n\\n')||'(none)')+
        '\\n\\nID/CLASS CONTAINS "userway" OR "access" ('+nameMatches.length+'):\\n'+(nameMatches.join('\\n\\n')||'(none)');
      d.body.appendChild(panel);
    },3000);
  }
})(document)` }} />
      </body>
    </html>
  )
}
