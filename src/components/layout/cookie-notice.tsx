'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Cookie } from 'lucide-react'

const STORAGE_KEY = 'cookieNoticeDismissed'

// The site today only ever sets one, strictly-necessary session cookie (see
// src/app/privacy/page.tsx's "עוגיות" section) — nothing optional to opt in
// or out of yet, so this is a one-button acknowledgment, not a consent form.
// The copy below intentionally also mentions analytics/personalization ahead
// of those actually existing, so it won't need revisiting the moment they do.
export function CookieNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localStorage.getItem(STORAGE_KEY) !== '1') setVisible(true)
  }, [])

  if (!visible) return null

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  return (
    // z-45: strictly between the z-40 mobile sticky chrome (dashboard/admin
    // bottom nav, also fixed bottom-0) it must render above so it's actually
    // visible and dismissible there, and the z-50+ real modals it must stay
    // below so it never sits on top of and blocks clicks on interactive UI.
    <div className="fixed bottom-0 inset-x-0 z-[45] bg-card border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="container mx-auto max-w-7xl px-6 py-3 flex flex-wrap items-center justify-center gap-3 text-center text-sm">
        <Cookie className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-foreground/80">
          אנו מכבדים את פרטיותכם - לידיעתכם, אתר זה עושה שימוש בקובצי Cookie ובטכנולוגיות דומות לצורך שיפור חוויית המשתמש,
          התאמת תוכן אישי, ולביצוע ניתוחים סטטיסטיים. למידע נוסף, אנא עיינו ב
          <Link href="/privacy#cookies" className="font-bold underline underline-offset-2 hover:text-foreground">
            מדיניות הפרטיות שלנו
          </Link>
          .
        </span>
        <button
          type="button"
          onClick={dismiss}
          className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-4 py-1.5 shrink-0 cursor-pointer"
        >
          הבנתי
        </button>
      </div>
    </div>
  )
}
