import Link from 'next/link'
import Image from 'next/image'
import { Heart } from 'lucide-react'

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
            <h4 className="font-black text-foreground mb-4 text-xs uppercase tracking-widest">ללקוחות</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/search" className="hover:text-primary transition-colors">חיפוש נייליסטיות</Link></li>
              <li><Link href="/login?tab=register" className="hover:text-primary transition-colors">הרשמה חינמית</Link></li>
              <li><Link href="/how-it-works" className="hover:text-primary transition-colors">איך זה עובד</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-foreground mb-4 text-xs uppercase tracking-widest">לנייליסטיות</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/login?tab=register" className="hover:text-primary transition-colors">הצטרפי כנייליסטית</Link></li>
              <li><Link href="/dashboard/nailist" className="hover:text-primary transition-colors">לוח הבקרה</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-foreground mb-4 text-xs uppercase tracking-widest">נגישות ומדיניות</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://userway.org/accessibility-statement/z8YM8BPOF6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  הצהרת נגישות
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-border text-center text-sm text-muted-foreground flex items-center justify-center gap-1.5 flex-wrap">
          <span>© {new Date().getFullYear()} נייליסטיות. כל הזכויות שמורות. עשוי עם</span>
          <Heart className="w-3.5 h-3.5 fill-primary text-primary" />
          <span>בישראל</span>
          {process.env.NEXT_PUBLIC_ENV === 'staging' ? (
            <span className="text-xs text-muted-foreground/50 mr-2">staging</span>
          ) : process.env.NEXT_PUBLIC_APP_VERSION ? (
            <span className="text-xs text-muted-foreground/50 mr-2">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
          ) : null}
        </div>
      </div>
    </footer>
  )
}
