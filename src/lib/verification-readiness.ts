export type VerificationReadinessCheckKey =
  | 'emailVerified'
  | 'onboardingCompleted'
  | 'businessName'
  | 'location'
  | 'phone'
  | 'photo'
  | 'activeService'
  | 'activeWorkingHours'
  | 'portfolio'
  | 'socialProfile'

export interface VerificationReadinessCheck {
  key: VerificationReadinessCheckKey
  label: string
  passed: boolean
  missing: string
}

export interface VerificationReadiness {
  checks: VerificationReadinessCheck[]
  passedCount: number
  totalCount: number
  isReady: boolean
}

export interface VerificationReadinessInput {
  emailVerified: boolean
  onboardingCompleted: boolean
  businessName?: unknown
  city?: unknown
  address?: unknown
  phoneNumber?: unknown
  whatsappPhone?: unknown
  photoUrl?: unknown
  coverPhotoUrl?: unknown
  instagramUrl?: unknown
  tiktokUrl?: unknown
  activeServiceCount: number
  activeWorkingHoursCount: number
  portfolioPhotoCount: number
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Checks only factual platform data. Passing this checklist never grants
 * verification; an admin still makes that manual decision.
 */
export function evaluateVerificationReadiness(input: VerificationReadinessInput): VerificationReadiness {
  const checks: VerificationReadinessCheck[] = [
    { key: 'emailVerified', label: 'כתובת אימייל מאומתת', passed: input.emailVerified, missing: 'אימות כתובת אימייל' },
    { key: 'onboardingCompleted', label: 'השלמת תהליך ההצטרפות', passed: input.onboardingCompleted, missing: 'השלמת תהליך ההצטרפות' },
    { key: 'businessName', label: 'שם עסק', passed: hasText(input.businessName), missing: 'שם עסק' },
    {
      key: 'location', label: 'עיר וכתובת',
      passed: hasText(input.city) && hasText(input.address), missing: 'עיר וכתובת עסק',
    },
    {
      key: 'phone', label: 'טלפון או וואטסאפ',
      passed: hasText(input.phoneNumber) || hasText(input.whatsappPhone), missing: 'טלפון או וואטסאפ',
    },
    {
      key: 'photo', label: 'תמונת פרופיל או קאבר',
      passed: hasText(input.photoUrl) || hasText(input.coverPhotoUrl), missing: 'תמונת פרופיל או קאבר',
    },
    {
      key: 'activeService', label: 'לפחות שירות פעיל אחד',
      passed: input.activeServiceCount >= 1, missing: 'לפחות שירות פעיל אחד',
    },
    {
      key: 'activeWorkingHours', label: 'לפחות שעת עבודה פעילה אחת',
      passed: input.activeWorkingHoursCount >= 1, missing: 'לפחות שעת עבודה פעילה אחת',
    },
    {
      key: 'portfolio', label: 'לפחות 5 תמונות בתיק העבודות',
      passed: input.portfolioPhotoCount >= 5, missing: 'לפחות 5 תמונות בתיק העבודות',
    },
    {
      key: 'socialProfile', label: 'אינסטגרם או טיקטוק',
      passed: hasText(input.instagramUrl) || hasText(input.tiktokUrl), missing: 'קישור לאינסטגרם או טיקטוק',
    },
  ]

  const passedCount = checks.filter((check) => check.passed).length
  return { checks, passedCount, totalCount: checks.length, isReady: passedCount === checks.length }
}
