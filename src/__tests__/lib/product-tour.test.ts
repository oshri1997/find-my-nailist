import { isTourDue, isTourRoute, markTourCompleted, tourStorageKey } from '@/lib/product-tour'

const base = {
  userId: 'user-1',
  role: 'CLIENT' as const,
  pathname: '/search',
  authLoading: false,
  onboardingCompleted: true,
  verificationReminderActive: false,
}

beforeEach(() => window.localStorage.clear())

describe('product tour rules', () => {
  it('anchors each role to its own route', () => {
    expect(isTourRoute('CLIENT', '/search')).toBe(true)
    expect(isTourRoute('NAILIST', '/dashboard/nailist')).toBe(true)
    expect(isTourRoute('CLIENT', '/dashboard/nailist')).toBe(false)
    expect(isTourRoute('NAILIST', '/dashboard/nailist/services')).toBe(false)
    expect(isTourRoute('ADMIN', '/search')).toBe(false)
    expect(isTourRoute(null, '/search')).toBe(false)
  })

  it('is due for a signed-in account that has not seen it', () => {
    expect(isTourDue(base)).toBe(true)
  })

  it('is not due once it has been completed', () => {
    markTourCompleted('user-1')
    expect(window.localStorage.getItem(tourStorageKey('user-1'))).toBe('completed')
    expect(isTourDue(base)).toBe(false)
  })

  it('waits for auth, onboarding, and any action-required reminder', () => {
    expect(isTourDue({ ...base, authLoading: true })).toBe(false)
    expect(isTourDue({ ...base, userId: null })).toBe(false)
    expect(isTourDue({ ...base, onboardingCompleted: false })).toBe(false)
    expect(isTourDue({ ...base, verificationReminderActive: true })).toBe(false)
  })

  it('answers per account, so one user finishing it does not silence another', () => {
    markTourCompleted('user-1')
    expect(isTourDue(base)).toBe(false)
    expect(isTourDue({ ...base, userId: 'user-2' })).toBe(true)
  })
})
