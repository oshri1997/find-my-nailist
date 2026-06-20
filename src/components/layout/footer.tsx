import Link from 'next/link'
import { Sparkles, Heart } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="container mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5 font-black text-xl mb-5">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-[0_2px_8px_rgba(236,72,153,0.3)]">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="gradient-text">ניליסטיות</span>
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
        </div>

        <div className="mt-10 pt-8 border-t border-border text-center text-sm text-muted-foreground flex items-center justify-center gap-1.5 flex-wrap">
          <span>© {new Date().getFullYear()} ניליסטיות. כל הזכויות שמורות. עשוי עם</span>
          <Heart className="w-3.5 h-3.5 fill-primary text-primary" />
          <span>בישראל</span>
        </div>
      </div>
    </footer>
  )
}
