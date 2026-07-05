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
        {/* UserWay accessibility widget. Positioning/size are set via UserWay's own
            documented config attributes (help.userway.org), not hacked via JS —
            an earlier version of this fought the widget's own positioning with a
            pile of MutationObservers/CSS overrides, which caused a visible
            flash-then-jump (our JS correcting UserWay's own position-recovery
            animation) and was fundamentally the wrong approach: data-position="2"
            was actually "Middle right" per UserWay's own position table
            (1=top-right, 2=middle-right, 3=bottom-right, 4=bottom-middle,
            5=bottom-left, 6=middle-left, 7=top-left, 8=top-middle) — never
            bottom-left at all, which was the actual root cause the whole time.
            data-size ("small"/"large") only accepts those two discrete values,
            set to "small" on mobile per request to shrink it there.
            Even with the correct config, the widget's own outer wrapper carries
            an inline transform (confirmed via a DOM reconstruction) — ANY
            transform on an ancestor creates a new containing block for a
            position:fixed descendant, silently redirecting "fixed" to be
            relative to that ancestor's box instead of the real viewport, so the
            icon still doesn't land flush in the true corner even with
            data-position="5" set correctly. Reparenting the icon itself (tried
            earlier) escapes this but breaks its own sizing/styling, which
            depends on staying nested under its wrapper — so instead,
            neutralizeContainingBlocks() strips the offending CSS property from
            the wrapper IN PLACE, scoped to ancestors that themselves match
            "userway" so it can never touch an element that belongs to this
            app's own UI/animations.
            The nailist dashboard has its own fixed bottom tab bar on mobile
            (md:hidden, see dashboard/layout.tsx) that a bottom-left icon would
            otherwise sit on top of — clearBottomNav() ADDS extra margin there
            without touching position/bottom/left/size at all, so it never
            fights UserWay's own placement (no more flash/jump risk).
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

  function matchesUserway(el){
    if(!el||el.nodeType!==1)return false;
    var id=(el.id||'').toLowerCase();
    var cls=(typeof el.className==='string'?el.className:'').toLowerCase();
    return id.indexOf('userway')!==-1||cls.indexOf('userway')!==-1;
  }
  function neutralizeContainingBlocks(el){
    var node=el.parentElement;
    while(node&&node!==d.body){
      if(matchesUserway(node)){
        var cs=getComputedStyle(node);
        if(cs.transform!=='none')node.style.setProperty('transform','none','important');
        if(cs.perspective!=='none')node.style.setProperty('perspective','none','important');
        if(cs.filter!=='none')node.style.setProperty('filter','none','important');
        if(cs.willChange!=='auto')node.style.setProperty('will-change','auto','important');
      }
      node=node.parentElement;
    }
  }
  function isDashboardMobile(){
    return window.innerWidth<768&&window.location.pathname.indexOf('/dashboard')===0;
  }
  function clearBottomNav(){
    var el=d.getElementById('userwayAccessibilityIcon');
    if(!el)return;
    neutralizeContainingBlocks(el);
    el.style.setProperty('margin-bottom',isDashboardMobile()?'64px':'0px','important');
  }
  var obs=new MutationObserver(clearBottomNav);
  obs.observe(d.body,{childList:true,subtree:true});
  window.addEventListener('resize',clearBottomNav);

  // Temporary on-page diagnostic, only active with ?debugA11y=1 in the URL —
  // the fix was verified against an ASSUMED real DOM structure (captured once,
  // before the transform check existed) but didn't visibly change anything on
  // the real device, meaning that assumption is wrong somewhere. This dumps
  // the icon's actual computed style plus EVERY ancestor up to <body> (not
  // just ones matching "userway" — neutralizeContainingBlocks only touches
  // those on purpose, so if the real trap is on one of THIS APP'S OWN
  // elements instead, this will show it even though our fix currently skips
  // it) and every containing-block-relevant property on each, so there's
  // real data instead of another guess.
  if(window.location.search.indexOf('debugA11y')!==-1){
    setTimeout(function(){
      function boxProps(cs){
        var props=[];
        if(cs.transform&&cs.transform!=='none')props.push('transform='+cs.transform);
        if(cs.perspective&&cs.perspective!=='none')props.push('perspective='+cs.perspective);
        if(cs.filter&&cs.filter!=='none')props.push('filter='+cs.filter);
        if(cs.backdropFilter&&cs.backdropFilter!=='none')props.push('backdropFilter='+cs.backdropFilter);
        if(cs.willChange&&cs.willChange!=='auto')props.push('willChange='+cs.willChange);
        if(cs.contain&&cs.contain!=='none')props.push('contain='+cs.contain);
        return props;
      }
      function describe(el){
        var r=el.getBoundingClientRect();
        var cls=typeof el.className==='string'?el.className:'';
        return el.tagName+'#'+el.id+'.'+cls+' rect='+JSON.stringify({top:Math.round(r.top),left:Math.round(r.left),bottom:Math.round(r.bottom),right:Math.round(r.right),w:Math.round(r.width),h:Math.round(r.height)});
      }
      var icon=d.getElementById('userwayAccessibilityIcon');
      var iconInfo='(not found)';
      var chainLines=[];
      if(icon){
        var cs=getComputedStyle(icon);
        iconInfo=describe(icon)+' position='+cs.position+' top='+cs.top+' left='+cs.left+' bottom='+cs.bottom+' right='+cs.right+' marginBottom='+cs.marginBottom+' transform='+cs.transform;
        var node=icon.parentElement;
        while(node&&node!==d.body){
          var ncs=getComputedStyle(node);
          var props=boxProps(ncs);
          chainLines.push(describe(node)+(props.length?' ['+props.join(', ')+']':' [no containing-block props]')+(matchesUserway(node)?' <userway-matched>':' <NOT userway-matched>'));
          node=node.parentElement;
        }
      }
      var panel=d.createElement('div');
      panel.style.cssText='position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#000;color:#0f0;font-size:10px;line-height:1.4;padding:8px;max-height:70vh;overflow:auto;white-space:pre-wrap;direction:ltr;text-align:left;font-family:monospace;';
      panel.textContent='ICON: '+iconInfo+
        '\\n\\nANCESTOR CHAIN (icon -> body), '+chainLines.length+' node(s):\\n'+(chainLines.join('\\n')||'(none — icon already a direct child of body, or not found)');
      d.body.appendChild(panel);
    },3000);
  }
})(document)` }} />
      </body>
    </html>
  )
}
