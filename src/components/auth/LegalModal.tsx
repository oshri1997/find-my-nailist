'use client'

import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type LegalType = 'terms' | 'privacy'

interface LegalModalProps {
  type: LegalType
  onAgree: () => void
  onClose: () => void
}

const CONTENT: Record<LegalType, { title: string; sections: { heading: string; body: string }[] }> = {
  terms: {
    title: 'תנאי שימוש',
    sections: [
      {
        heading: '1. הסכמה לתנאים',
        body: 'השימוש באתר נייליסטיות (nailistiot.fun) ובשירותים המוצעים בו מהווה הסכמה מלאה לתנאי שימוש אלה. תנאים אלה חלים על כל משתמשי האתר — לקוחות ונייליסטיות כאחד.',
      },
      {
        heading: '2. אופי השירות',
        body: 'נייליסטיות היא פלטפורמת תיווך בלבד המחברת בין לקוחות לנייליסטיות עצמאיות. אנו אינינו צד לעסקה בין הלקוח לנייליסטית, ואיננו אחראים לאיכות השירות, לתוצאות הטיפול, לנזקים שנגרמו במהלך הטיפול, או לכל מחלוקת שתתגלע בין הצדדים. האחריות המקצועית חלה על הנייליסטית בלבד.',
      },
      {
        heading: '3. הרשמה וחשבון משתמש',
        body: 'יש להיות מעל גיל 16 כדי להירשם. המידע שתמסור חייב להיות נכון ומדויק. אתה אחראי לשמירת פרטי ההתחברות שלך ולכל פעולה שתבוצע תחת חשבונך. חל איסור ליצור חשבון עבור אדם אחר ללא הרשאתו.',
      },
      {
        heading: '4. כללי התנהגות',
        body: 'חל איסור מוחלט: להעלות תוכן פוגעני, מטעה, גזעני, מאיים או בלתי חוקי; להתחזות לאדם אחר; לפרסם ביקורות שקריות; לפגוע בתפקוד האתר; לשלוח ספאם או הודעות הטרדה.',
      },
      {
        heading: '5. תנאים לנייליסטיות',
        body: 'הנייליסטית מצהירה שהיא בעלת הכישורים המקצועיים לביצוע השירותים המפורסמים. המחירים, שעות הפעילות והשירותים חייבים להיות מדויקים ועדכניים. תמונות הפורטפוליו חייבות להיות עבודות מקוריות שלה בלבד.',
      },
      {
        heading: '6. הגבלת אחריות',
        body: 'נייליסטיות לא תהיה אחראית לנזקים ישירים, עקיפים, מקריים או תוצאתיים הנובעים משימוש בשירות, לרבות נזקים מטיפול, מחלוקות בין הצדדים, שיבושים בשירות, או אבדן מידע. השימוש בשירות הוא על אחריות המשתמש בלבד.',
      },
      {
        heading: '7. קניין רוחני',
        body: 'כל הזכויות באתר, לרבות עיצוב, קוד, לוגו ושם המותג, שייכות לנייליסטיות. חל איסור להעתיק, לשכפל או לעשות שימוש מסחרי בתכנים ללא אישור בכתב.',
      },
      {
        heading: '8. דין חל',
        body: 'תנאים אלה כפופים לחוקי מדינת ישראל. כל מחלוקת תידון בבתי המשפט המוסמכים במחוז תל אביב, ישראל.',
      },
    ],
  },
  privacy: {
    title: 'מדיניות פרטיות',
    sections: [
      {
        heading: '1. כללי',
        body: 'מדיניות זו מתארת כיצד נייליסטיות אוספת, משתמשת ומגנה על המידע האישי שלך. השימוש באתר מהווה הסכמה למדיניות זו. המדיניות כתובה בהתאם לחוק הגנת הפרטיות, התשמ"א–1981.',
      },
      {
        heading: '2. המידע שאנו אוספים',
        body: 'אנו אוספים: שם מלא, כתובת דוא"ל, מספר טלפון (אופציונלי), עיר, תמונת פרופיל ותמונות פורטפוליו (לנייליסטיות), היסטוריית הזמנות וביקורות שכתבת. בהרשמה דרך Google — שם, דוא"ל ותמונה מחשבונך.',
      },
      {
        heading: '3. שימוש במידע',
        body: 'המידע משמש לאפשר קביעת תורים, לשלוח אישורים ועדכוני תורים בדוא"ל, להציג פרופיל נייליסטית לגולשים, ולתפעל ולשפר את השירות. אנו לא מוכרים את המידע שלך לצדדים שלישיים ולא משתמשים בו לפרסום ממוקד.',
      },
      {
        heading: '4. שירותי צד שלישי',
        body: 'המידע עשוי להיות נגיש ל: Google Firebase (אחסון ואימות), Resend (שליחת דוא"ל), Google OAuth (הרשמה), Google Places API (השלמת ערים), UserWay (נגישות), ו-Railway (שרת). כולם מחויבים לתנאי פרטיות משלהם.',
      },
      {
        heading: '5. אבטחה ושמירת מידע',
        body: 'אנו נוקטים באמצעי אבטחה סבירים (HTTPS, Firebase Authentication). המידע נשמר כל עוד חשבונך פעיל. עם מחיקת החשבון, המידע נמחק תוך 30 ימים.',
      },
      {
        heading: '6. זכויותיך',
        body: 'יש לך זכות לעיין במידע שלך, לתקן מידע שגוי, לבקש מחיקת חשבונך, ולבקש הגבלת עיבוד המידע. לממש את זכויותיך — פנה אלינו בדוא"ל: oshri19970@gmail.com.',
      },
      {
        heading: '7. קטינים',
        body: 'השירות אינו מיועד לבני פחות מ-16. אנו לא אוספים ביודעין מידע מקטינים. אם גילית כי קטין מסר לנו מידע, פנה אלינו ונמחק אותו.',
      },
    ],
  },
}

export default function LegalModal({ type, onAgree, onClose }: LegalModalProps) {
  const [checked, setChecked] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const content = CONTENT[type]

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
          <h2 className="font-black text-foreground text-lg">{content.title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            aria-label="סגור"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {content.sections.map((s) => (
            <div key={s.heading} className="space-y-1.5">
              <h3 className="font-bold text-sm text-foreground">{s.heading}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t border-border px-6 py-4 bg-card space-y-3">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary cursor-pointer"
            />
            <span className="text-sm text-foreground font-medium">
              קראתי ואני מסכים/ה ל{content.title}
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
