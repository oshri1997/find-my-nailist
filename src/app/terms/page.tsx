import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export const metadata = {
  title: 'תנאי שימוש | נייליסטיות',
  description: 'תנאי השימוש של אתר נייליסטיות — הכללים וההגבלות לשימוש בפלטפורמה',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <Navbar />

      <main className="flex-1 container mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-black text-foreground mb-2">תנאי שימוש</h1>
        <p className="text-muted-foreground mb-10 text-sm">עודכן לאחרונה: יוני 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-foreground">

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">1. הסכמה לתנאים</h2>
            <p className="text-muted-foreground leading-relaxed">
              ברוכים הבאים לאתר <strong className="text-foreground">נייליסטיות</strong> (nailistiot.fun). השימוש באתר ובשירותים המוצעים בו מהווה הסכמה מלאה לתנאי שימוש אלה. אם אינך מסכים לתנאים, אנא הפסק להשתמש באתר. תנאים אלה חלים על כל משתמשי האתר — לקוחות ונייליסטיות כאחד.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">2. הגדרות</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground pr-2">
              <li><strong className="text-foreground">&quot;האתר&quot;</strong> — nailistiot.fun וכל שירותיו</li>
              <li><strong className="text-foreground">&quot;אנחנו&quot; / &quot;המפעיל&quot;</strong> — נייליסטיות, מפעילת הפלטפורמה</li>
              <li><strong className="text-foreground">&quot;משתמש&quot;</strong> — כל אדם המשתמש באתר, בין אם רשום ובין אם לאו</li>
              <li><strong className="text-foreground">&quot;לקוח&quot;</strong> — משתמש המחפש שירותי ציפורניים וקובע תורים</li>
              <li><strong className="text-foreground">&quot;נייליסטית&quot;</strong> — בעלת מקצוע המציעה שירותי ציפורניים דרך האתר</li>
              <li><strong className="text-foreground">&quot;תור&quot;</strong> — הזמנת שירות שנקבעה בין לקוח לנייליסטית דרך האתר</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">3. אופי השירות</h2>
            <p className="text-muted-foreground leading-relaxed">
              נייליסטיות היא <strong className="text-foreground">פלטפורמת תיווך בלבד</strong> המחברת בין לקוחות לנייליסטיות עצמאיות. אנו אינינו צד לעסקה בין הלקוח לנייליסטית, ואיננו אחראים לאיכות השירות, לתוצאות הטיפול, לעמידה בזמנים, לנזקים שנגרמו במהלך הטיפול, או לכל מחלוקת שתתגלע בין הצדדים. האחריות המקצועית חלה על הנייליסטית בלבד.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">4. הרשמה וחשבון משתמש</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground pr-2">
              <li>יש להיות בגיר (מעל גיל 16) כדי להירשם לאתר</li>
              <li>המידע שתמסור בהרשמה חייב להיות נכון ומדויק</li>
              <li>אתה אחראי לשמירת פרטי ההתחברות שלך ולכל פעולה שתבוצע תחת חשבונך</li>
              <li>חל איסור ליצור חשבון עבור אדם אחר ללא הרשאתו</li>
              <li>אנו שומרים לעצמנו הזכות לבטל חשבון שמפר תנאים אלה</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">5. כללי התנהגות</h2>
            <p className="text-muted-foreground leading-relaxed">חל איסור מוחלט:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground pr-2">
              <li>להעלות תוכן פוגעני, מטעה, מגונה, גזעני, מאיים או בלתי חוקי</li>
              <li>להתחזות לאדם אחר, לעסק אחר, או לנציג האתר</li>
              <li>לפרסם מידע שקרי על שירותים, מחירים או זמינות</li>
              <li>לכתוב ביקורות שקריות או ממניעים זרים (שאינן מניסיון אישי)</li>
              <li>לפגוע בתפקוד האתר, לנסות לפרוץ לו, לסרוק אותו אוטומטית, או לגרד את תוכנו</li>
              <li>לשלוח ספאם, פרסומות לא מבוקשות, או הודעות הטרדה</li>
              <li>לעקוף מנגנוני האימות והאבטחה של האתר</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">6. תנאים ספציפיים לנייליסטיות</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground pr-2">
              <li>הנייליסטית מצהירה שהיא בעלת הכישורים המקצועיים לביצוע השירותים המפורסמים</li>
              <li>המחירים, שעות הפעילות והשירותים המוצגים בפרופיל חייבים להיות מדויקים ועדכניים</li>
              <li>הנייליסטית מתחייבת לעדכן לקוחות בזמן סביר במקרה של ביטול תור</li>
              <li>תמונות הפורטפוליו חייבות להיות עבודות מקוריות של הנייליסטית בלבד</li>
              <li>הנייליסטית אחראית לעמוד בכל דרישות הרגולציה, הרישוי, וחוקי הבריאות החלים</li>
              <li>השימוש בפלטפורמה לצורכי הונאה או גביית כספים שלא כדין אסור ויגרור הסרה מיידית</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">7. תנאים ספציפיים ללקוחות</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground pr-2">
              <li>הלקוח מתחייב להגיע לתורים שנקבעו, או לבטל מראש בזמן סביר</li>
              <li>ביקורות יכתבו רק על בסיס חוויה אישית ואמיתית</li>
              <li>הלקוח אחראי לוודא שהשירות המבוקש מתאים לצרכיו לפני קביעת התור</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">8. תוכן שמועלה לאתר</h2>
            <p className="text-muted-foreground leading-relaxed">
              בהעלאת תוכן (תמונות, ביוגרפיה, ביקורות) אתה מעניק לנייליסטיות רישיון לא-בלעדי, חופשי מתמלוגים, להציג תוכן זה כחלק מהשירות. אתה מצהיר שהתוכן שלך אינו מפר זכויות יוצרים של צד שלישי, ושיש לך את הרשות לפרסמו. אנו שומרים לעצמנו הזכות להסיר תוכן שמפר תנאים אלה.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">9. קניין רוחני</h2>
            <p className="text-muted-foreground leading-relaxed">
              כל הזכויות באתר, לרבות עיצוב, קוד, לוגו, שם המותג ותוכן מקורי, שייכות לנייליסטיות. חל איסור להעתיק, לשכפל, להפיץ או לעשות שימוש מסחרי בתכנים אלה ללא אישור מפורש בכתב.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">10. הגבלת אחריות</h2>
            <p className="text-muted-foreground leading-relaxed">
              בכפוף לכל דין, נייליסטיות לא תהיה אחראית לנזקים ישירים, עקיפים, מקריים או תוצאתיים הנובעים משימוש בשירות, לרבות: נזקים שנגרמו במהלך טיפול, אי-הגעה לתור, מחלוקות בין לקוחות לנייליסטיות, שיבושים בשירות, או אבדן מידע. השימוש בשירות הוא על אחריות המשתמש בלבד.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">11. ביטול חשבון</h2>
            <p className="text-muted-foreground leading-relaxed">
              תוכל לבטל את חשבונך בכל עת על ידי פנייה אלינו בדוא&quot;ל. אנו שומרים לעצמנו הזכות להשעות או לבטל חשבון שמפר תנאים אלה, ללא הודעה מוקדמת במקרים חמורים.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">12. שינויים בתנאים</h2>
            <p className="text-muted-foreground leading-relaxed">
              אנו עשויים לעדכן תנאים אלה מעת לעת. שינויים מהותיים יפורסמו באתר ויישלח עדכון בדוא&quot;ל. המשך השימוש לאחר פרסום שינויים מהווה הסכמה לתנאים המעודכנים. מומלץ לבדוק עמוד זה מדי פעם.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">13. דין חל וסמכות שיפוט</h2>
            <p className="text-muted-foreground leading-relaxed">
              תנאים אלה כפופים לחוקי מדינת ישראל. כל מחלוקת שתתגלע בקשר עם תנאים אלה תידון בבתי המשפט המוסמכים במחוז תל אביב, ישראל.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">14. יצירת קשר</h2>
            <div className="bg-muted/50 rounded-2xl p-5 space-y-2 text-sm text-muted-foreground border border-border">
              <p><span className="font-semibold text-foreground">מפעיל האתר:</span> אושרי מועלם</p>
              <p>
                <span className="font-semibold text-foreground">דוא&quot;ל: </span>
                <a href="mailto:oshri19970@gmail.com" className="text-primary hover:underline">
                  oshri19970@gmail.com
                </a>
              </p>
            </div>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-border flex gap-6 text-sm">
          <Link href="/" className="text-primary hover:underline">&larr; חזרה לדף הבית</Link>
          <Link href="/privacy" className="text-primary hover:underline">מדיניות פרטיות</Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
