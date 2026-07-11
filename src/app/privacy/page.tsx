import Link from 'next/link'
import { Footer } from '@/components/layout/footer'

export const metadata = {
  title: 'מדיניות פרטיות | נייליסטיות',
  description: 'מדיניות הפרטיות של אתר נייליסטיות — כיצד אנו אוספים, משתמשים ומגנים על המידע שלך',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <main className="flex-1 container mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-black text-foreground mb-2">מדיניות פרטיות</h1>
        <p className="text-muted-foreground mb-10 text-sm">עודכן לאחרונה: יוני 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-foreground">

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">1. כללי</h2>
            <p className="text-muted-foreground leading-relaxed">
              מדיניות פרטיות זו מתארת כיצד <strong className="text-foreground">נייליסטיות</strong> (&quot;אנחנו&quot;, &quot;האתר&quot;) אוספת, משתמשת ומגנה על המידע האישי שלך בעת שימוש בשירות בכתובת nailistiot.fun. השימוש באתר מהווה הסכמה למדיניות זו. המדיניות כתובה בהתאם לחוק הגנת הפרטיות, התשמ&quot;א&ndash;1981 ותקנותיו.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">2. המידע שאנו אוספים</h2>
            <p className="text-muted-foreground leading-relaxed">אנו אוספים את סוגי המידע הבאים:</p>
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground mb-1">מידע שאתה מספק ישירות</h3>
                <ul className="list-disc list-inside space-y-1.5 text-muted-foreground pr-2">
                  <li>שם מלא או שם עסק</li>
                  <li>כתובת דוא&quot;ל</li>
                  <li>מספר טלפון / וואטסאפ (אופציונלי)</li>
                  <li>עיר מגורים / עיר פעילות</li>
                  <li>תמונת פרופיל ותמונות פורטפוליו (לנייליסטיות)</li>
                  <li>תיאור עסקי, שירותים ומחירים (לנייליסטיות)</li>
                  <li>ביקורות שכתבת</li>
                </ul>
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground mb-1">מידע שנאסף אוטומטית</h3>
                <ul className="list-disc list-inside space-y-1.5 text-muted-foreground pr-2">
                  <li>כתובת IP וסוג הדפדפן</li>
                  <li>היסטוריית הזמנות ופעולות באתר</li>
                  <li>מידע טכני כגון זמני גישה ושגיאות</li>
                </ul>
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground mb-1">מידע מגורמי צד שלישי</h3>
                <ul className="list-disc list-inside space-y-1.5 text-muted-foreground pr-2">
                  <li>בהרשמה דרך Google — שם, כתובת דוא&quot;ל ותמונת פרופיל מחשבון Google שלך</li>
                  <li>נתוני מיקום משוערים לצורך חיפוש נייליסטיות בקרבתך (רק בהסכמה)</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">3. כיצד אנו משתמשים במידע</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground pr-2">
              <li>לאפשר קביעת תורים בין לקוחות לנייליסטיות</li>
              <li>לשלוח אישורים, תזכורות ועדכוני תורים בדוא&quot;ל</li>
              <li>לשלוח בקשות ביקורת לאחר תור שהושלם</li>
              <li>להציג פרופיל נייליסטית לגולשים המחפשים שירות</li>
              <li>לתפעל ולשפר את השירות, לטפל בתקלות ולמנוע שימוש לרעה</li>
              <li>לעמוד בדרישות חוקיות ורגולטוריות</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              אנו <strong className="text-foreground">לא מוכרים</strong> את המידע שלך לצדדים שלישיים ולא משתמשים בו לפרסום ממוקד.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">4. שיתוף מידע</h2>
            <p className="text-muted-foreground leading-relaxed">
              המידע שלך עשוי להיות נגיש לצדדים השלישיים הבאים, אך ורק לצורך מתן השירות:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground pr-2">
              <li><strong className="text-foreground">Google Firebase</strong> — אחסון מסד הנתונים ואימות זהות. <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">מדיניות פרטיות</a></li>
              <li><strong className="text-foreground">Resend</strong> — שירות שליחת דוא&quot;ל. <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">מדיניות פרטיות</a></li>
              <li><strong className="text-foreground">Google OAuth</strong> — הרשמה וכניסה דרך חשבון Google</li>
              <li><strong className="text-foreground">Google Places API</strong> — השלמה אוטומטית של שמות ערים</li>
              <li><strong className="text-foreground">UserWay</strong> — ווידג&apos;ט נגישות. <a href="https://userway.org/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">מדיניות פרטיות</a></li>
              <li><strong className="text-foreground">Railway</strong> — שרת האחסון והתשתית של האתר</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              מידע על פרופיל הנייליסטית (שם, עיר, תמונות, שירותים, ביקורות) מוצג בפומבי לכלל גולשי האתר. מידע זה נמסר מרצון על ידי הנייליסטית בעת יצירת הפרופיל.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">5. אבטחת מידע</h2>
            <p className="text-muted-foreground leading-relaxed">
              אנו נוקטים באמצעי אבטחה סבירים להגנה על המידע שלך, לרבות הצפנת תעבורה (HTTPS), אימות מבוסס Firebase Authentication וגישה מוגבלת למסד הנתונים. יחד עם זאת, אין מערכת מאובטחת לחלוטין ואיננו יכולים להבטיח אבטחה מלאה.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">6. שמירת מידע</h2>
            <p className="text-muted-foreground leading-relaxed">
              המידע שלך נשמר כל עוד חשבונך פעיל. עם מחיקת החשבון, נמחק המידע האישי שלך תוך 30 ימים, למעט מידע שנדרש לשמור לצורכי חוק או יישוב מחלוקות.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">7. זכויותיך</h2>
            <p className="text-muted-foreground leading-relaxed">בהתאם לחוק הגנת הפרטיות, יש לך זכות:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground pr-2">
              <li>לעיין במידע האישי שלך השמור אצלנו</li>
              <li>לתקן מידע שגוי</li>
              <li>לבקש מחיקת חשבונך ומידעך האישי</li>
              <li>לבקש הגבלת עיבוד המידע שלך</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              לממש את זכויותיך, פנה אלינו בדוא&quot;ל:{' '}
              <a href="mailto:oshri19970@gmail.com" className="text-primary hover:underline">oshri19970@gmail.com</a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">8. קטינים</h2>
            <p className="text-muted-foreground leading-relaxed">
              השירות אינו מיועד לבני פחות מ-16. אנו לא אוספים ביודעין מידע מקטינים. אם גילית כי קטין מסר לנו מידע, פנה אלינו ונמחק אותו.
            </p>
          </section>

          <section id="cookies" className="space-y-3 scroll-mt-24">
            <h2 className="text-xl font-bold text-foreground">9. עוגיות (Cookies)</h2>
            <p className="text-muted-foreground leading-relaxed">
              האתר משתמש בעוגיות הכרחיות לצורך שמירת מצב ההתחברות. אין שימוש בעוגיות פרסומיות או ניתוח התנהגות מעבר לנדרש לתפעול השירות.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">10. שינויים במדיניות</h2>
            <p className="text-muted-foreground leading-relaxed">
              אנו עשויים לעדכן מדיניות זו מעת לעת. שינויים מהותיים יפורסמו באתר ויישלח עדכון בדוא&quot;ל לחשבונות פעילים. המשך השימוש לאחר פרסום השינויים מהווה הסכמה למדיניות המעודכנת.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">11. יצירת קשר</h2>
            <div className="bg-muted/50 rounded-2xl p-5 space-y-2 text-sm text-muted-foreground border border-border">
              <p><span className="font-semibold text-foreground">ממונה על הפרטיות:</span> אושרי מועלם</p>
              <p>
                <span className="font-semibold text-foreground">דוא&quot;ל: </span>
                <a href="mailto:oshri19970@gmail.com" className="text-primary hover:underline">
                  oshri19970@gmail.com
                </a>
              </p>
              <p><span className="font-semibold text-foreground">זמן תגובה:</span> עד 30 ימים מקבלת הפנייה</p>
            </div>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-border flex gap-6 text-sm">
          <Link href="/" className="text-primary hover:underline">&larr; חזרה לדף הבית</Link>
          <Link href="/terms" className="text-primary hover:underline">תנאי שימוש</Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
