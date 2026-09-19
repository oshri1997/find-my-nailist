'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { driver, type Driver, type DriveStep } from 'driver.js'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'

const TOUR_VERSION = 'v2'
const RESTART_EVENT = 'nailistiot:restart-product-tour'

function storageKey(userId: string) {
  return `nailistiot:product-tour:${TOUR_VERSION}:${userId}`
}

function wasCompleted(userId: string) {
  try {
    return window.localStorage.getItem(storageKey(userId)) === 'completed'
  } catch {
    return false
  }
}

function markCompleted(userId: string) {
  try {
    window.localStorage.setItem(storageKey(userId), 'completed')
  } catch {
    // A private browser session must never stop a user from using the app.
  }
}

const clientSteps: DriveStep[] = [
  {
    popover: {
      title: 'כך קובעות תור',
      description: 'נראה לך בקצרה איך למצוא נייליסטית ומה קורה אחרי שליחת בקשה.',
    },
  },
  {
    element: '[data-tour="client-search-filters"]',
    popover: {
      title: 'מתחילות בחיפוש',
      description: 'אפשר לסנן לפי אזור, שירות, תאריך ומחיר. לא חייבים למלא הכול.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="client-search-results"]',
    popover: {
      title: 'בוחרות את מי שמתאימה לך',
      description: 'לחצי על נייליסטית כדי לראות עבודות, שירותים ושעות פנויות. לאחר שליחת בקשה היא תקבל עדכון, וכשהיא תאשר — תקבלי אישור במייל.',
      side: 'top',
      align: 'center',
    },
  },
]

function nailistSteps(isMobile: boolean): DriveStep[] {
  const navigationTarget = isMobile ? '[data-tour="nailist-mobile-navigation"]' : '[data-tour="nailist-sidebar"]'
  const appointmentsTarget = isMobile ? '[data-tour="nailist-mobile-appointments"]' : '[data-tour="nailist-nav-appointments"]'
  const servicesTarget = isMobile ? '[data-tour="nailist-mobile-services"]' : '[data-tour="nailist-nav-services"]'
  const settingsTarget = isMobile ? '[data-tour="nailist-mobile-settings"]' : '[data-tour="nailist-nav-settings"]'

  return [
  {
    popover: {
      title: 'ככה בקשה הופכת לתור',
      description: 'לקוחה בוחרת שעה ושולחת בקשה; את מחליטה אם לאשר. נראה לך בדיוק איפה מנהלות כל שלב.',
    },
  },
  {
    element: navigationTarget,
    popover: {
      title: isMobile ? 'הניווט שלך נמצא כאן' : 'כל העסק שלך נמצא בתפריט הזה',
      description: isMobile
        ? 'מכאן מגיעים לסקירה, לתורים, לשירותים ולהגדרות. לחצי על ״עוד״ כדי להגיע לביקורות, לפורטפוליו ולשעות הפעילות.'
        : 'סקירה היא דף הבית שלך. מכאן מגיעים לתורים, שירותים, הגדרות, שעות פעילות, פורטפוליו וביקורות.',
      side: isMobile ? 'top' : 'left',
      align: 'center',
    },
  },
  {
    element: appointmentsTarget,
    popover: {
      title: '1. לקוחה שולחת בקשה',
      description: 'בקשה חדשה מופיעה בתורים במצב ״ממתינה״. שם רואים את השירות, התאריך, השעה ופרטי הלקוחה לפני שמחליטים.',
      side: isMobile ? 'top' : 'left',
      align: 'center',
    },
  },
  {
    element: '[data-tour="nailist-upcoming-appointments"]',
    popover: {
      title: '2. עוקבות גם מהסקירה',
      description: 'הבקשות והתורים הקרובים מופיעים גם כאן בדף הראשי, כדי שלא תפספסי דבר. אפשר להיכנס מכאן לרשימת כל התורים.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: appointmentsTarget,
    popover: {
      title: '3. מאשרות או מבטלות',
      description: 'בתוך ״תורים״ אפשר לאשר או לבטל בקשה. באישור, הלקוחה מקבלת מייל והתור משתנה ל״מאושר״. ביטול מעדכן גם אותה.',
      side: isMobile ? 'top' : 'left',
      align: 'center',
    },
  },
  {
    element: servicesTarget,
    popover: {
      title: '4. השירותים והשעות קובעים מה אפשר להזמין',
      description: 'לקוחות רואות רק שירותים פעילים ורק שעות שהגדרת. עדכון מחיר, משך טיפול או זמינות משפיע על החיפוש הבא שלהן.',
      side: isMobile ? 'top' : 'left',
      align: 'center',
    },
  },
  {
    element: '[data-tour="nailist-recent-reviews"]',
    popover: {
      title: '5. אחרי הטיפול מגיעות ביקורות',
      description: 'כשתור מסומן כהושלם, הלקוחה מקבלת בקשה להשאיר ביקורת. כאן רואים את האחרונות, ובתפריט ״ביקורות״ רואים את כולן.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: settingsTarget,
    popover: {
      title: '6. שומרות על הפרופיל מעודכן',
      description: 'בהגדרות מעדכנים את פרטי העסק. בפורטפוליו מציגים עבודות — וב״פרופיל ציבורי״ רואים בדיוק מה לקוחות רואות.',
      side: isMobile ? 'top' : 'left',
      align: 'center',
    },
  },
  {
    popover: {
      title: 'את מוכנה להתחיל',
      description: 'בקשה חדשה → בודקים בתורים → מאשרים או מבטלים → הלקוחה מתעדכנת במייל. אפשר לפתוח את ההדרכה שוב בכל עת מהתפריט.',
    },
  },
  ]
}

/**
 * A compact, role-specific introduction after the required onboarding has
 * finished. It deliberately explains the real booking flow instead of
 * forcing the user through a long set of cosmetic clicks.
 */
export function ProductTour() {
  const { user, role, loading, onboardingCompleted, verificationReminderActive, setProductTourActive } = useAuth()
  const pathname = usePathname()
  const activeDriverRef = useRef<Driver | null>(null)

  const eligible = !!user && !loading && onboardingCompleted && !verificationReminderActive
    && ((role === 'CLIENT' && pathname === '/search') || (role === 'NAILIST' && pathname === '/dashboard/nailist'))

  function start(force = false) {
    if (!user || !eligible || activeDriverRef.current) return
    if (!force && wasCompleted(user.uid)) return

    setProductTourActive(true)
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const isMobile = window.matchMedia?.('(max-width: 767px)').matches === true
    const activeDriver = driver({
      steps: role === 'NAILIST' ? nailistSteps(isMobile) : clientSteps,
      animate: !reduceMotion,
      overlayColor: '#09090B',
      overlayOpacity: 0.72,
      stagePadding: 8,
      stageRadius: 16,
      allowClose: true,
      allowKeyboardControl: true,
      smoothScroll: true,
      showProgress: true,
      progressText: '{{current}} מתוך {{total}}',
      nextBtnText: 'המשך',
      prevBtnText: 'חזרה',
      doneBtnText: 'הבנתי, אפשר להתחיל',
      onDestroyed: () => {
        markCompleted(user.uid)
        activeDriverRef.current = null
        setProductTourActive(false)
      },
    })
    activeDriverRef.current = activeDriver
    activeDriver.drive()
  }

  // This runs before ordinary effects (including announcements), ensuring the
  // first-use guide gets the first, uncluttered moment after onboarding.
  useLayoutEffect(() => {
    if (!eligible || !user || wasCompleted(user.uid)) return
    const timer = window.setTimeout(() => start(), 100)
    return () => window.clearTimeout(timer)
  // `start` intentionally reads the current render's role/path state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, user?.uid])

  useEffect(() => {
    const handleRestart = () => start(true)
    window.addEventListener(RESTART_EVENT, handleRestart)
    return () => {
      window.removeEventListener(RESTART_EVENT, handleRestart)
      activeDriverRef.current?.destroy()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, user?.uid, role, pathname])

  return null
}
