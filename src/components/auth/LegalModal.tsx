'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LegalModalProps {
  onAgree: () => void
  onClose: () => void
}

const SECTIONS = [
  {
    heading: 'תנאי שימוש',
    isTitle: true,
  },
  {
    heading: '1. הסכמה לתנאים',
    body: 'השימוש באתר נייליסטיות (nailistiot.fun) ובשירותים המוצעים בו מהווה הסכמה מלאה לתנאי שימוש אלה. תנאים אלה חלים על כל משתמשי האתר — לקוחות ונייליסטיות כאחד.',
  },
  {
    heading: '2. אופי השירות',
    body: 'נייליסטיות היא פלטפורמת תיווך בלבד המחברת בין לקוחות לנייליסטיות עצמאיות. אנו אינינו צד לעסקה בין הלקוח לנייליסטית, ואיננו אחראים לאיכות השירות, לנזקים שנגרמו במהלך הטיפול, או לכל מחלוקת שתתגלע בין הצדדים.',
  },
  {
    heading: '3. הרשמה וחשבון משתמש',
    body: 'יש להיות מעל גיל 16 כדי להירשם. המידע שתמסור חייב להיות נכון ומדויק. אתה אחראי לשמירת פרטי ההתחברות שלך ולכל פעולה שתבוצע תחת חשבונך.',
  },
  {
    heading: '4. כללי התנהגות',
    body: 'חל איסור: להעלות תוכן פוגעני, מטעה, גזעני או בלתי חוקי; להתחזות לאדם אחר; לפרסם ביקורות שקריות; לפגוע בתפקוד האתר; לשלוח ספאם.',
  },
  {
    heading: '5. הגבלת אחריות',
    body: 'נייליסטיות לא תהיה אחראית לנזקים ישירים, עקיפים או תוצאתיים הנובעים משימוש בשירות, לרבות נזקים מטיפול, מחלוקות בין הצדדים, שיבושים בשירות, או אבדן מידע.',
  },
  {
    heading: '6. קניין רוחני',
    body: 'כל הזכויות באתר — עיצוב, קוד, לוגו ושם המותג — שייכות לנייליסטיות. חל איסור להעתיק או לעשות שימוש מסחרי בתכנים ללא אישור בכתב.',
  },
  {
    heading: '7. דין חל',
    body: 'תנאים אלה כפופים לחוקי מדינת ישראל. כל מחלוקת תידון בבתי המשפט המוסמכים במחוז תל אביב.',
  },
  {
    heading: 'מדיניות פרטיות',
    isTitle: true,
  },
  {
    heading: '1. כללי',
    body: 'מדיניות זו מתארת כיצד נייליסטיות אוספת, משתמשת ומגנה על המידע האישי שלך, בהתאם לחוק הגנת הפרטיות, התשמ"א–1981.',
  },
  {
    heading: '2. המידע שאנו אוספים',
    body: 'שם מלא, דוא"ל, טלפון (אופציונלי), עיר, תמונת פרופיל ופורטפוליו (לנייליסטיות), היסטוריית הזמנות וביקורות. בהרשמה דרך Google — שם, דוא"ל ותמונה מחשבונך.',
  },
  {
    heading: '3. שימוש במידע',
    body: 'המידע משמש לקביעת תורים, שליחת עדכונים בדוא"ל, והצגת פרופילים. אנו לא מוכרים את המידע שלך לצדדים שלישיים ולא משתמשים בו לפרסום ממוקד.',
  },
  {
    heading: '4. שירותי צד שלישי',
    body: 'Google Firebase (אחסון ואימות), Resend (דוא"ל), Google OAuth, Google Places API, UserWay (נגישות), Railway (שרת) — כולם מחויבים למדיניות פרטיות משלהם.',
  },
  {
    heading: '5. שמירת מידע',
    body: 'המידע נשמר כל עוד חשבונך פעיל. עם מחיקת החשבון, המידע נמחק תוך 30 ימים.',
  },
  {
    heading: '6. זכויותיך',
    body: 'יש לך זכות לעיין במידע, לתקן אותו, לבקש מחיקתו. לממש את זכויותיך — פנה אלינו: oshri19970@gmail.com.',
  },
]

export default function LegalModal({ onAgree, onClose }: LegalModalProps) {
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handleAgree() {
    if (!checked) return
    onAgree()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden" style={{ maxHeight: '85vh' }} dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-black text-foreground text-lg">תנאי שימוש ומדיניות פרטיות</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            aria-label="סגור"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {SECTIONS.map((s) =>
            'isTitle' in s && s.isTitle ? (
              <h3 key={s.heading} className="text-base font-black text-foreground pt-2 border-t border-border first:border-0 first:pt-0">
                {s.heading}
              </h3>
            ) : (
              <div key={s.heading} className="space-y-1">
                <p className="text-sm font-bold text-foreground">{s.heading}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{'body' in s ? s.body : ''}</p>
              </div>
            )
          )}
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t border-border px-6 py-4 bg-card space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              className="h-4 w-4 shrink-0 accent-primary cursor-pointer"
            />
            <span className="text-sm text-foreground font-medium">
              קראתי ואני מסכים/ה לתנאי השימוש ולמדיניות הפרטיות
            </span>
          </label>
          <div className="flex gap-2">
            <Button
              onClick={handleAgree}
              disabled={!checked}
              className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold disabled:opacity-50"
            >
              אישור
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 rounded-xl font-bold"
            >
              סגור
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
