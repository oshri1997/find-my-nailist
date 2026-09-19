'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { driver, type Driver, type DriveStep } from 'driver.js'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'

const TOUR_VERSION = 'v1'
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

const nailistSteps: DriveStep[] = [
  {
    popover: {
      title: 'ברוכה הבאה לדשבורד',
      description: 'כאן מנהלים את העסק, רואים תורים ומעדכנים את הלקוחות.',
    },
  },
  {
    element: '[data-tour="nailist-upcoming-appointments"]',
    popover: {
      title: 'כאן מופיעות בקשות ותורים',
      description: 'כשלקוחה שולחת בקשת תור, היא מופיעה ברשימת התורים. נשלח אלייך גם עדכון למייל עם פרטי הבקשה.',
      side: 'top',
      align: 'center',
    },
  },
  {
    popover: {
      title: 'מה קורה כשמאשרים?',
      description: 'אחרי אישור הבקשה, הלקוחה מקבלת אישור במייל והתור נשמר אצלך ביומן התורים. שירותים ושעות פעילות שאת מגדירה הם מה שהלקוחות יכולות להזמין.',
    },
  },
]

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
    const activeDriver = driver({
      steps: role === 'NAILIST' ? nailistSteps : clientSteps,
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
    const timer = window.setTimeout(() => start(), 450)
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
