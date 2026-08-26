// Accept: text/markdown content negotiation (RFC 7231 §5.3.2 content
// negotiation, RFC 7763 text/markdown media type — see acceptmarkdown.com).
// An agent that would rather parse Markdown than HTML sends
// `Accept: text/markdown` (optionally alongside `text/html;q=0.x`); the
// server picks whichever representation best matches and must set
// `Vary: Accept` on BOTH representations so a cache never serves the wrong
// one to the wrong requester.

interface MediaTypePreference {
  type: string
  q: number
}

function parseAccept(header: string): MediaTypePreference[] {
  return header
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [type, ...params] = part.split(';').map((s) => s.trim())
      const qParam = params.find((p) => p.toLowerCase().startsWith('q='))
      const q = qParam ? parseFloat(qParam.slice(2)) : 1
      return { type: type.toLowerCase(), q: Number.isFinite(q) ? q : 1 }
    })
}

// Best matching q-value for `mediaType` among the parsed preferences
// (exact match, `type/*`, and — unless `allowWildcard` is false — the
// universal `*/*`) — -1 if not accepted at all.
function matchQuality(mediaType: string, prefs: MediaTypePreference[], allowWildcard = true): number {
  const type = mediaType.split('/')[0]
  let best = -1
  for (const p of prefs) {
    const matches = p.type === mediaType || p.type === `${type}/*` || (allowWildcard && p.type === '*/*')
    if (matches && p.q > best) best = p.q
  }
  return best
}

// True when the request's Accept header prefers text/markdown over
// text/html (present with a q-value at least as high as text/html's, and
// not explicitly excluded via q=0).
//
// Markdown must be *explicitly* requested (text/markdown or text/*) — a
// bare `*/*` does not count, even though it technically matches. `*/*` is
// what curl, most HTTP client libraries, and most crawlers send by default
// when the caller never set an Accept header at all; treating that as "give
// me markdown" would serve markdown to nearly every plain request instead
// of the small minority that actually asked for it.
export function prefersMarkdown(acceptHeader: string | null | undefined): boolean {
  if (!acceptHeader) return false
  const prefs = parseAccept(acceptHeader)
  const markdownQ = matchQuality('text/markdown', prefs, false)
  if (markdownQ <= 0) return false
  const htmlQ = matchQuality('text/html', prefs)
  return markdownQ >= htmlQ
}

const APP_URL = 'https://nailistiot.fun'

// Markdown mirror of the homepage's real, static copy (src/app/page.tsx and
// the section components it renders) — kept in sync by hand since the page
// itself is built from framer-motion client components, not a CMS/data
// source this could be generated from automatically.
export function buildHomepageMarkdown(): string {
  return `# מצאי את הנייליסטית המושלמת עבורך

> נייליסטיות (Nailistiot) — הפלטפורמה הישראלית המובילה לחיפוש והזמנת תורים אצל נייליסטיות מקצועיות.

גלי מאות מומחיות ציפורניים בקרבתך — עיצוב ג'ל, נייל ארט ומניקור מקצועי. הזמיני תור בקליק אחד, בלי שיחות, בלי המתנה.

## איך זה עובד

1. **גלי נייליסטיות בקרבתך** — השתמשי במיקום שלך כדי לגלות מאות מומחיות ציפורניים באזורך.
2. **עיצוב ופורטפוליו** — עיצובים before & after, ביקורות אמיתיות ומחירים שקופים.
3. **הזמיני תור בקליק** — בחרי שירות, תאריך ושעה — בלי שיחות, בלי המתנה.

## מה מקבלים

- **חיפוש חכם** — סינון לפי מיקום, סוג שירות, מחיר וזמינות בזמן אמת.
- **ביקורות אמיתיות** — רק לקוחות שהגיעו לתור יכולות לכתוב ביקורת.
- **הזמנה מהטלפון** — ממשק מותאם לנייד, מכל מקום ובכל זמן.
- **בטוח ואמין** — כל הנייליסטיות עוברות אימות, הנתונים שלך מוגנים.
- **תקשורת ישירה** — שליחת הודעות לנייליסטית לפני ואחרי התור.
- **גלריית עיצובים** — תמונות של עיצובים אמיתיים לפני שמחליטים.

## שאלות נפוצות

**איך מוצאים נייליסטית בקרבתי?**
ב-נייליסטיות מחפשים לפי עיר, רואים תמונות עבודה, קוראים ביקורות ומזמינות תור ישירות — הכל במקום אחד, בחינם.

**אילו שירותים ניתן להזמין?**
עיצוב ג'ל, נייל ארט, מניקור קלאסי, פדיקור, הסרה, חיזוק ציפורניים ועוד — בהתאם לשירותים שמציעה כל נייליסטית.

**האם ההזמנה דרך האתר בחינם?**
כן, קביעת תור דרך נייליסטיות היא חינמית לחלוטין. משלמים רק לנייליסטית עצמה בסיום הטיפול.

**איך נייליסטית מצטרפת לאתר?**
נייליסטיות מקצועיות מוזמנות להירשם בחינם, להעלות תיק עבודות ולקבל לקוחות חדשות ישירות דרך הפלטפורמה.

## קישורים

- [חיפוש נייליסטיות](${APP_URL}/search)
- [איך זה עובד](${APP_URL}/how-it-works)
- [מפת האתר](${APP_URL}/sitemap.xml)
- [llms.txt](${APP_URL}/llms.txt) — מידע לסוכני AI
`
}
