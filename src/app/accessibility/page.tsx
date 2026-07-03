import Link from 'next/link'
import { Footer } from '@/components/layout/footer'

export const metadata = {
  title: 'הצהרת נגישות | נייליסטיות',
  description: 'הצהרת הנגישות של אתר נייליסטיות — מחויבות לנגישות דיגיטלית לכלל המשתמשים',
}

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <main className="flex-1 container mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-black text-foreground mb-2">הצהרת נגישות</h1>
        <p className="text-muted-foreground mb-10 text-sm">עודכן לאחרונה: יוני 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-foreground">

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">כללי</h2>
            <p className="text-muted-foreground leading-relaxed">
              אתר <strong className="text-foreground">נייליסטיות</strong> (nailistiot.fun) שואף לאפשר שימוש נוח ונגיש לכלל המשתמשות והמשתמשים, לרבות אנשים עם מוגבלות, בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע&quot;ג&ndash;2013, ולתקן הישראלי (ת&quot;י 5568) המבוסס על הנחיות WCAG 2.1 ברמת AA. אנו ממשיכים לשפר את נגישות האתר באופן שוטף.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">מה כבר מיושם</h2>
            <p className="text-muted-foreground leading-relaxed">
              התכונות הבאות מיושמות באתר כרגע:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground pr-2">
              <li>כותרות עמוד ברורות ומבנה היררכי תקין (h1/h2/h3)</li>
              <li>שפה וכיווניות מוגדרים כהלכה (<code>lang=&quot;he&quot; dir=&quot;rtl&quot;</code>)</li>
              <li>תיאורי Alt לתמונות משמעותיות (תמונות פרופיל, לוגו)</li>
              <li>תמיכה בווידג&apos;ט הנגישות של UserWay — כלי עזר לגלישה</li>
              <li>סימון מיקוד (focus) גלוי על כפתורים ושדות קלט</li>
              <li>הודעות שגיאה מוצגות ויזואלית בטפסים</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">פערים ידועים — בתהליך שיפור</h2>
            <p className="text-muted-foreground leading-relaxed">
              אנו מודעים לפערים הבאים ועובדים על תיקונם:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground pr-2">
              <li>ניווט מלא במקלדת — חלק מהפעולות (בחירת תאריך, דירוג בביקורת) עדיין דורשות עכבר</li>
              <li>תמיכה מלאה בקוראי מסך — חלק מהאלמנטים האינטראקטיביים טרם קיבלו תיוג ARIA</li>
              <li>הגדלת טקסט — הגדלה מעל 150% עשויה לגרום לחפיפות ויזואליות בכמה תצוגות</li>
              <li>ניגוד צבעים — לא נבדק פורמלית בכל שילובי הצבעים; עשויים להיות פערים</li>
            </ul>
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
            <p className="text-muted-foreground">הצהרה זו עודכנה לאחרונה ביוני 2026.</p>
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
