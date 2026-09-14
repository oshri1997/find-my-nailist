// Firestore collection names — single source of truth
export const COLLECTIONS = {
  USERS: 'users',
  NAILIST_PROFILES: 'nailistProfiles',
  CLIENT_PROFILES: 'clientProfiles',
  SERVICES: 'services',
  PORTFOLIO_PHOTOS: 'portfolioPhotos',
  WORKING_HOURS: 'workingHours',
  AVAILABILITY_OVERRIDES: 'availabilityOverrides',
  APPOINTMENTS: 'appointments',
  REVIEWS: 'reviews',
  FAVORITES: 'favorites',
  SEARCH_EVENTS: 'searchEvents',
  VISIT_EVENTS: 'visitEvents',
  AUDIT_LOGS: 'auditLogs',
  FEEDBACK: 'feedback',
  FEEDBACK_RATE_LIMITS: 'feedbackRateLimits',
  ADMIN_EMAIL_CHALLENGES: 'adminEmailChallenges',
} as const
