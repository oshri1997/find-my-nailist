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
        <script dangerouslySetInnerHTML={{ __html: `(function(d){var s=d.createElement("script");s.setAttribute("data-position",2);s.setAttribute("data-size","small");s.setAttribute("data-language","he");s.setAttribute("data-mobile",true);s.setAttribute("data-account","z8YM8BPOF6");s.setAttribute("src","https://cdn.userway.org/widget.js");(d.body||d.head).appendChild(s)})(document)` }} />
        {/* Force UserWay button to bottom-left — setInterval wins over any internal repositioning */}
        <script dangerouslySetInnerHTML={{ __html: `
(function(){
  function applyPos(el){
    el.style.setProperty('position','fixed','important');
    el.style.setProperty('bottom','16px','important');
    el.style.setProperty('left','16px','important');
    el.style.setProperty('right','auto','important');
    el.style.setProperty('top','auto','important');
    el.style.setProperty('z-index','999999','important');
  }
  function fix(){
    var selectors=['#userwayAccessibilityIcon','.userway_buttons_wrapper','[id*="userway"i]','[class*="userway"i]'];
    var found=false;
    for(var i=0;i<selectors.length;i++){
      var els=document.querySelectorAll(selectors[i]);
      els.forEach(function(el){applyPos(el);found=true;});
    }
    return found;
  }
  var attempts=0;
  var iv=setInterval(function(){
    fix();
    attempts++;
    if(attempts>100)clearInterval(iv);
  },100);
})();
        ` }} />
      </body>
    </html>
  )
}
