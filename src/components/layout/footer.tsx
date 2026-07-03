import Link from 'next/link'
import Image from 'next/image'
import { JoinLink } from '@/components/auth/JoinLink'

const FOOTER_CITIES = [
  { slug: 'tel-aviv', name: 'תל אביב' },
  { slug: 'jerusalem', name: 'ירושלים' },
  { slug: 'haifa', name: 'חיפה' },
  { slug: 'rishon-lezion', name: 'ראשון לציון' },
  { slug: 'petah-tikva', name: 'פתח תקווה' },
  { slug: 'netanya', name: 'נתניה' },
  { slug: 'ramat-gan', name: 'רמת גן' },
  { slug: 'herzliya', name: 'הרצליה' },
  { slug: 'ashdod', name: 'אשדוד' },
  { slug: 'beer-sheva', name: 'באר שבע' },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5 font-black text-xl mb-5">
              <Image src="/logo.png" alt="נייליסטיות לוגו" width={36} height={36} />
              <span className="gradient-text">נייליסטיות</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              הפלטפורמה המובילה לחיבור בין לקוחות ומומחיות ציפורניים ברחבי ישראל.
            </p>
          </div>

          <div>
            <h4 className="font-black text-foreground mb-4 text-sm">ללקוחות</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/search" className="hover:text-primary transition-colors">חיפוש נייליסטיות</Link></li>
              <li><JoinLink href="/login?tab=register" className="hover:text-primary transition-colors">הרשמה חינמית</JoinLink></li>
              <li><Link href="/how-it-works" className="hover:text-primary transition-colors">איך זה עובד</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-foreground mb-4 text-sm">לנייליסטיות</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><JoinLink href="/login?tab=register" className="hover:text-primary transition-colors">הצטרפי כנייליסטית</JoinLink></li>
              <li><Link href="/dashboard/nailist" className="hover:text-primary transition-colors">לוח הבקרה</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-foreground mb-4 text-sm">מדיניות ונגישות</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link href="/terms" className="hover:text-primary transition-colors">
                  תנאי שימוש
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-primary transition-colors">
                  מדיניות פרטיות
                </Link>
              </li>
              <li>
                <Link href="/accessibility" className="hover:text-primary transition-colors">
                  הצהרת נגישות
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* City links — helps Google discover city landing pages */}
        <div className="mt-10 pt-8 border-t border-border">
          <h4 className="font-black text-foreground mb-4 text-sm">חפשי נייליסטית לפי עיר</h4>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {FOOTER_CITIES.map((c) => (
              <li key={c.slug}>
                <Link href={`/cities/${c.slug}`} className="hover:text-primary transition-colors">
                  נייליסטית ב{c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <span>© 2026 נייליסטיות. כל הזכויות שמורות.</span>
        </div>
      </div>
    </footer>
  )
}
