/**
 * Shared rules for the first-use guided tour.
 *
 * Both the tour itself and the global announcement modal decide from these
 * functions whether a tour is due. Deriving it from the same inputs — instead
 * of from a flag one component sets in an effect and the other reads in its
 * own — is what keeps an announcement from opening on top of the guide: React
 * gives no ordering guarantee between two components' effects, but a pure
 * function of the same state gives the same answer in both.
 */

export const TOUR_VERSION = 'v3'
export const TOUR_RESTART_EVENT = 'nailistiot:restart-product-tour'

export type TourRole = 'NAILIST' | 'CLIENT' | 'ADMIN' | null

/** Where each role's guide is anchored. Nothing starts anywhere else. */
const TOUR_ROUTES: Record<string, string> = {
  CLIENT: '/search',
  NAILIST: '/dashboard/nailist',
}

export function tourStorageKey(userId: string) {
  return `nailistiot:product-tour:${TOUR_VERSION}:${userId}`
}

export function wasTourCompleted(userId: string) {
  try {
    return window.localStorage.getItem(tourStorageKey(userId)) === 'completed'
  } catch {
    // A private browser session must never stop a user from using the app.
    return false
  }
}

export function markTourCompleted(userId: string) {
  try {
    window.localStorage.setItem(tourStorageKey(userId), 'completed')
  } catch {
    // Same as above — storage being unavailable is not worth an error.
  }
}

export function isTourRoute(role: TourRole, pathname: string | null) {
  return !!role && !!pathname && TOUR_ROUTES[role] === pathname
}

interface TourEligibility {
  userId: string | null | undefined
  role: TourRole
  pathname: string | null
  authLoading: boolean
  onboardingCompleted: boolean
  /** The verification reminder is a concrete action item and always wins. */
  verificationReminderActive: boolean
}

/** True while the account is on its guide's route and has not seen it yet. */
export function isTourDue({
  userId,
  role,
  pathname,
  authLoading,
  onboardingCompleted,
  verificationReminderActive,
}: TourEligibility) {
  if (authLoading || !userId || !onboardingCompleted || verificationReminderActive) return false
  if (!isTourRoute(role, pathname)) return false
  return !wasTourCompleted(userId)
}
