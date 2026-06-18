import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="container mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 font-black text-xl mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="gradient-text">מצאי נייליסטית</span>
            </Link>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
              הפלטפורמה המובילה לחיבור בין לקוחות ומומחיות ציפורניים ברחבי ישראל.
            </p>
            <div className="flex gap-3 mt-5">
              {['💗', '✨', '💅'].map((e) => (
                <span key={e} className="text-xl">{e}</span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-black text-gray-800 mb-4 text-sm uppercase tracking-wider">ללקוחות</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link href="/search" className="hover:text-pink-500 transition-colors">חיפוש נייליסטיות</Link></li>
              <li><Link href="/register?role=client" className="hover:text-pink-500 transition-colors">הרשמה חינמית</Link></li>
              <li><Link href="/how-it-works" className="hover:text-pink-500 transition-colors">איך זה עובד</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black text-gray-800 mb-4 text-sm uppercase tracking-wider">לנייליסטיות</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link href="/register?role=nailist" className="hover:text-pink-500 transition-colors">הצטרפי כנייליסטית</Link></li>
              <li><Link href="/dashboard/nailist" className="hover:text-pink-500 transition-colors">לוח הבקרה</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-8 border-t border-gray-100 text-center text-sm text-gray-300">
          © {new Date().getFullYear()} מצאי נייליסטית. כל הזכויות שמורות. עשוי עם 💗 בישראל
        </div>
      </div>
    </footer>
  )
}
