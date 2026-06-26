import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export const metadata = {
  title: 'הצהרת נגישות | נייליסטיות',
  description: 'הצהרת הנגישות של אתר נייליסטיות — מחויבות לנגישות דיגיטלית לכלל המשתמשים',
}

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <Navbar />

      <main className="flex-1 container mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-black text-foreground mb-2">הצהרת נגישות</h1>
        <p className="text-muted-foreground mb-10 text-sm">עודכן לאחרונה: יוני 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-foreground">

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">כללי</h2>
            <p className="text-muted-foreground leading-relaxed">
              אתר <strong className="text-foreground">נייליסטיות</strong> (nailistiot.fun) פועל לאפשר שימוש נוח ונגיש לכלל המשתמשות והמשתמשים, לרבות אנשים עם מוגבלות, בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע&quot;ג&ndash;2013, ולתקן הישראלי (ת&quot;י 5568) המבוסס על הנחיות WCAG 2.1 ברמת AA.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">רמת הנגישות</h2>
            <p className="text-muted-foreground leading-relaxed">
              אנו שואפים לעמוד ברמת התאמה <strong className="text-foreground">AA</strong> של תקן WCAG 2.1. האתר כולל:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground pr-2">
              <li>תמיכה בקורא מסך (NVDA, JAWS, VoiceOver)</li>
              <li>ניווט מלא במקלדת ללא עכבר</li>
              <li>ניגוד צבעים עומד בדרישות WCAG AA</li>
              <li>תמיכה בהגדלת טקסט עד 200% ללא אובדן תוכן</li>
              <li>תיאורי Alt לתמונות משמעותיות</li>
              <li>כותרות עמוד ברורות ומבנה היררכי תקין</li>
              <li>הודעות שגיאה מובנות בטפסים</li>
              <li>תמיכה בווידג&apos;ט הנגישות של UserWay</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">פרטים שאינם נגישים</h2>
            <p className="text-muted-foreground leading-relaxed">
              אנו מודעים לכך שייתכנו פערי נגישות מסוימים. אנו עובדים על שיפורם באופן שוטף. אם נתקלתם בבעיה — אנא פנו אלינו (ראו פרטי יצירת קשר מטה).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">יצירת קשר בנושא נגישות</h2>
            <p className="text-muted-foreground leading-relaxed">
              אם מצאתם בעיית נגישות, אתם מוזמנים לפנות אלינו:
            </p>
            <div className="bg-muted/50 rounded-2xl p-5 space-y-2 text-sm text-muted-foreground border border-border">
              <p><span className="font-semibold text-foreground">שם רכז הנגישות:</span> אושרי מועלם</p>
              <p>
                <span className="font-semibold text-foreground">דוא&quot;ל: </span>
                <a href="mailto:oshri19970@gmail.com" className="text-primary hover:underline">
                  oshri19970@gmail.com
                </a>
              </p>
              <p><span className="font-semibold text-foreground">זמן תגובה:</span> נשתדל להשיב תוך 5 ימי עסקים</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">בקשות וסיוע</h2>
            <p className="text-muted-foreground leading-relaxed">
              אם נתקלתם בקושי לבצע פעולה כלשהי באתר, נשמח לסייע. ניתן לפנות אלינו בדוא&quot;ל ונטפל בבקשתכם באופן ישיר.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">תאריך עדכון אחרון</h2>
            <p className="text-muted-foreground">הצהרה זו עודכנה לאחרונה ביוני 2025.</p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Link href="/" className="text-sm text-primary hover:underline">
            &larr; חזרה לדף הבית
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
