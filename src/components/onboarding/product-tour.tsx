'use client'

import { useCallback, useEffect, useRef } from 'react'
import { driver, type Config, type Driver, type DriveStep, type PopoverDOM } from 'driver.js'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import {
  TOUR_RESTART_EVENT,
  isTourDue,
  isTourRoute,
  markTourCompleted,
} from '@/lib/product-tour'

const MOBILE_QUERY = '(max-width: 767px)'

/**
 * How long a step waits for its anchor to appear before the step is skipped.
 * Dashboard cards mount with their data, so a step can legitimately be a
 * moment early — but it must never end up as a popover pointing at nothing.
 */
const ANCHOR_WAIT_MS = 1600

/** Lets the route's entrance animations settle before the first measurement. */
const START_DELAY_MS = 500

/**
 * Re-measure shortly after each step. Anchors animate in (framer-motion runs
 * the dashboard cards with a delay), and driver.js only re-measures on scroll
 * and resize — without this the spotlight can sit on an element's entrance
 * position rather than its final one.
 */
const SETTLE_REFRESH_MS = 340

function isMobileViewport() {
  return window.matchMedia?.(MOBILE_QUERY).matches === true
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

const clientSteps: DriveStep[] = [
  {
    popover: {
      title: 'נראה לך איך זה עובד',
      description: 'שלושה שלבים קצרים. אפשר לדלג מתי שרוצים.',
    },
  },
  {
    element: '[data-tour="client-search-filters"]',
    popover: {
      title: 'קודם מחפשות',
      description: 'בוחרות אזור, שירות, תאריך או מחיר. לא חייבים למלא הכול.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="client-search-results"]',
    popover: {
      title: 'אחר כך בוחרות',
      description: 'לוחצות על נייליסטית כדי לראות עבודות, מחירים ושעות פנויות — ומשם מבקשות תור.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="client-appointments"]',
    popover: {
      title: 'וזה הכל',
      description: 'הנייליסטית תאשר, יגיע לך מייל, והתור יופיע כאן ב״התורים שלי״.',
      side: 'bottom',
      align: 'end',
    },
  },
]

function nailistSteps(isMobile: boolean): DriveStep[] {
  const navigationTarget = isMobile ? '[data-tour="nailist-mobile-navigation"]' : '[data-tour="nailist-sidebar"]'
  const appointmentsTarget = isMobile ? '[data-tour="nailist-mobile-appointments"]' : '[data-tour="nailist-nav-appointments"]'
  const servicesTarget = isMobile ? '[data-tour="nailist-mobile-services"]' : '[data-tour="nailist-nav-services"]'
  const settingsTarget = isMobile ? '[data-tour="nailist-mobile-settings"]' : '[data-tour="nailist-nav-settings"]'
  const menuSide = isMobile ? 'top' : 'left'

  return [
    {
      popover: {
        title: 'סיור קצר על העסק שלך',
        description: 'איך בקשה של לקוחה הופכת לתור. אפשר לדלג מתי שרוצים.',
      },
    },
    {
      element: navigationTarget,
      popover: {
        title: isMobile ? 'הניווט שלך כאן' : 'התפריט הזה הוא כל העסק',
        description: isMobile
          ? 'תמונת מצב, תורים, שירותים ופרטי העסק. ב״עוד״ יש ביקורות, העבודות שלך ושעות הפעילות.'
          : '״תמונת מצב״ היא דף הבית שלך. מכאן גם לתורים, לשירותים, לפרטי העסק, לשעות, לעבודות ולביקורות.',
        side: menuSide,
        align: 'center',
      },
    },
    {
      element: appointmentsTarget,
      popover: {
        title: '1. מגיעה בקשה',
        description: 'כל בקשה חדשה מופיעה ב״התורים שלי״ כ״ממתינה״ — עם השירות, התאריך, השעה ומי הלקוחה.',
        side: menuSide,
        align: 'center',
      },
    },
    {
      element: '[data-tour="nailist-upcoming-appointments"]',
      popover: {
        title: '2. רואים הכל גם מכאן',
        description: 'הבקשות והתורים הקרובים מופיעים גם ב״תמונת מצב״, כדי שלא תפספסי.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: appointmentsTarget,
      popover: {
        title: '3. מאשרות או מבטלות',
        description: 'לחיצה אחת ב״התורים שלי״. באישור הלקוחה מקבלת מייל והתור עובר ל״מאושר״. גם ביטול מעדכן אותה.',
        side: menuSide,
        align: 'center',
      },
    },
    {
      element: servicesTarget,
      popover: {
        title: '4. מה שהגדרת — זה מה שאפשר להזמין',
        description: 'לקוחות רואות רק שירותים פעילים ורק שעות שפתחת. כל עדכון מחיר או משך נכנס לתוקף מיד.',
        side: menuSide,
        align: 'center',
      },
    },
    {
      element: '[data-tour="nailist-recent-reviews"]',
      popover: {
        title: '5. אחרי הטיפול — ביקורת',
        description: 'כשמסמנים תור כ״הושלם״, הלקוחה מקבלת בקשה לביקורת. האחרונות מופיעות כאן.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: settingsTarget,
      popover: {
        title: '6. הפרופיל שלך',
        description: 'ב״פרטי העסק״ מעדכנים את הפרטים, ב״העבודות שלי״ מעלים תמונות, וב״הפרופיל שלי״ רואים מה לקוחות רואות.',
        side: menuSide,
        align: 'center',
      },
    },
    {
      popover: {
        title: 'זה הכל',
        description: 'בקשה → ״התורים שלי״ → מאשרות → הלקוחה מתעדכנת. אפשר לפתוח את הסיור שוב מהתפריט בכל רגע.',
      },
    },
  ]
}

/**
 * A compact, role-specific introduction after the required onboarding has
 * finished. It deliberately explains the real booking flow instead of forcing
 * the user through a long set of cosmetic clicks.
 */
export function ProductTour() {
  const { user, role, loading, onboardingCompleted, verificationReminderActive, setProductTourActive } = useAuth()
  const pathname = usePathname()

  const activeDriverRef = useRef<Driver | null>(null)
  /** Only a deliberate finish/dismiss counts as "seen" — see stop() below. */
  const dismissedByUserRef = useRef(false)
  const builtForMobileRef = useRef(false)
  const settleTimerRef = useRef<number | undefined>(undefined)

  const onRoute = isTourRoute(role, pathname)

  const start = useCallback(
    (force = false) => {
      if (!user || !onRoute || activeDriverRef.current) return
      if (
        !force &&
        !isTourDue({
          userId: user.uid,
          role,
          pathname,
          authLoading: loading,
          onboardingCompleted,
          verificationReminderActive,
        })
      ) {
        return
      }

      const reduceMotion = prefersReducedMotion()
      builtForMobileRef.current = isMobileViewport()
      setProductTourActive(true)

      // Closes over the instance declared below rather than reading
      // activeDriverRef, which onDestroyed clears — a second exit route firing
      // after teardown would otherwise find nothing to destroy.
      function stop(userInitiated: boolean) {
        dismissedByUserRef.current = userInitiated
        instance.destroy()
      }

      /**
       * driver.js owns the popover's DOM, so the product's own language (RTL,
       * dialog semantics, a real skip affordance, a touch-sized close button)
       * has to be applied here rather than in JSX.
       */
      function decoratePopover(popover: PopoverDOM, opts: { config?: Config; index?: number }) {
        popover.wrapper.setAttribute('dir', 'rtl')
        popover.wrapper.setAttribute('lang', 'he')
        popover.wrapper.setAttribute('role', 'dialog')
        popover.wrapper.setAttribute('aria-modal', 'true')
        popover.wrapper.setAttribute('aria-label', 'סיור מודרך')
        // Focusable so onHighlighted can move focus into the dialog.
        popover.wrapper.setAttribute('tabindex', '-1')
        popover.closeButton.setAttribute('aria-label', 'סגירת הסיור')
        popover.description.setAttribute('aria-live', 'polite')

        // An X in the corner is not a discoverable way out of a tutorial. A
        // named skip control next to the progress counter is — except on the
        // last step, where "סיימתי" already is the way out.
        const stepCount = opts?.config?.steps?.length ?? 0
        if (typeof opts?.index === 'number' && opts.index === stepCount - 1) return

        const skip = document.createElement('button')
        skip.type = 'button'
        skip.className = 'driver-popover-footer-btn nailistiot-tour-skip'
        skip.textContent = 'דילוג על הסיור'
        skip.addEventListener('click', () => stop(true))
        popover.progress.insertAdjacentElement('afterend', skip)
      }

      const instance: Driver = driver({
        steps: role === 'NAILIST' ? nailistSteps(builtForMobileRef.current) : clientSteps,
        animate: !reduceMotion,
        duration: reduceMotion ? 0 : 280,
        overlayColor: '#09090B',
        overlayOpacity: 0.7,
        stagePadding: 8,
        stageRadius: 16,
        popoverOffset: 12,
        allowClose: true,
        allowKeyboardControl: true,
        smoothScroll: true,
        showProgress: true,
        progressText: 'שלב {{current}} מתוך {{total}}',
        nextBtnText: 'המשך',
        prevBtnText: 'חזרה',
        doneBtnText: 'סיימתי',
        popoverClass: 'nailistiot-tour',
        // A stray tap on the backdrop used to end the guide for good. Advancing
        // is the forgiving reading of that gesture; the X, the skip button and
        // Esc remain the deliberate ways out.
        overlayClickBehavior: 'nextStep',
        // Highlighted anchors are real navigation links. A click mid-tour would
        // leave the page and take the guide down with it.
        disableActiveInteraction: true,
        // A card that renders with its data gets a moment to appear, and is
        // skipped rather than shown as a popover floating over nothing.
        skipMissingElement: true,
        waitForElement: ANCHOR_WAIT_MS,
        onPopoverRender: decoratePopover,
        onHighlighted: (_element, _step, { driver: instance, state }) => {
          window.clearTimeout(settleTimerRef.current)
          settleTimerRef.current = window.setTimeout(() => {
            if (instance.isActive()) instance.refresh()
          }, SETTLE_REFRESH_MS)

          // Put keyboard and screen-reader users inside the dialog instead of
          // leaving focus wherever the page happened to have it. Focus goes to
          // the popover itself, not to ״המשך״: a focused button reads as
          // pressed, and the dialog's title is what should be announced first.
          const target = state.popover?.wrapper
          window.requestAnimationFrame(() => target?.focus({ preventScroll: true }))
        },
        // Defined here, so driver.js hands the close decision over and every
        // exit route (X, Esc, backdrop on the last step, Done) lands in one place.
        onDestroyStarted: () => stop(true),
        onDestroyed: () => {
          window.clearTimeout(settleTimerRef.current)
          activeDriverRef.current = null
          setProductTourActive(false)
          // React unmounting this component (a route change mid-tour) also
          // destroys the driver. That is not the user saying "I have seen
          // this", so only a deliberate finish or dismiss is remembered.
          if (dismissedByUserRef.current && user) markTourCompleted(user.uid)
          dismissedByUserRef.current = false
        },
      })

      activeDriverRef.current = instance
      instance.drive()
    },
    [user, role, pathname, onRoute, loading, onboardingCompleted, verificationReminderActive, setProductTourActive]
  )

  const due = isTourDue({
    userId: user?.uid,
    role,
    pathname,
    authLoading: loading,
    onboardingCompleted,
    verificationReminderActive,
  })

  useEffect(() => {
    if (!due) return
    const timer = window.setTimeout(() => start(), START_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [due, start])

  useEffect(() => {
    const handleRestart = () => start(true)
    window.addEventListener(TOUR_RESTART_EVENT, handleRestart)
    return () => {
      window.removeEventListener(TOUR_RESTART_EVENT, handleRestart)
      window.clearTimeout(settleTimerRef.current)
      activeDriverRef.current?.destroy()
    }
  }, [start])

  // The page is RTL, so "forward" is the left arrow — the opposite of
  // driver.js's own LTR mapping. Taking the keys in the capture phase stops
  // its window listener from also acting on them.
  useEffect(() => {
    function onKeyup(event: KeyboardEvent) {
      const instance = activeDriverRef.current
      if (!instance?.isActive()) return
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      event.stopImmediatePropagation()
      if (event.key === 'ArrowLeft') instance.moveNext()
      else instance.movePrevious()
    }
    window.addEventListener('keyup', onKeyup, true)
    return () => window.removeEventListener('keyup', onKeyup, true)
  }, [])

  // Rotating a phone, or crossing the desktop breakpoint, changes both the
  // measurements and — for a nailist — which navigation the steps point at.
  useEffect(() => {
    let frame = 0
    function onViewportChange() {
      const instance = activeDriverRef.current
      if (!instance?.isActive()) return
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        if (!instance.isActive()) return
        if (role === 'NAILIST' && isMobileViewport() !== builtForMobileRef.current) {
          builtForMobileRef.current = isMobileViewport()
          instance.setSteps(nailistSteps(builtForMobileRef.current))
          instance.drive(instance.getActiveIndex() ?? 0)
          return
        }
        instance.refresh()
      })
    }
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('orientationchange', onViewportChange)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', onViewportChange)
      window.removeEventListener('orientationchange', onViewportChange)
    }
  }, [role])

  return null
}
