import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { hasRealCreds, loginAsRealUser } from './real-session-helper'

const MOCK_PROFILE = {
  id: 'profile1',
  userId: 'user1',
  businessName: 'סטודיו דמו',
  email: 'demo@test.com',
  city: 'תל אביב',
  bio: 'נייליסטית מקצועית',
  isActive: true,
  avgRating: 0,
  reviewCount: 0,
}

const MOCK_SERVICES = [
  { id: 's1', name: "מניקור ג'ל", durationMinutes: 60, price: 150, currency: 'ILS', isActive: true },
  { id: 's2', name: 'פדיקור', durationMinutes: 45, price: 120, currency: 'ILS', isActive: true },
]

/**
 * Dashboard business data is mocked via page.route() for determinism, but
 * the session itself must be real: these pages gate on the Firebase
 * client-side auth state (useAuth().user), which only a real signed-in
 * session populates — a spoofed cookie leaves useAuth().user null and the
 * layout redirects to /login. See real-session-helper.ts for why this signs
 * in once per file (a live context) rather than replaying a storageState
 * snapshot into a fresh context per test.
 */
test.describe.serial('Dashboard (mocked data, real session)', () => {
  test.skip(() => !hasRealCreds(), 'Skipped — run with valid TEST_USER_EMAIL/TEST_USER_PASSWORD credentials')
  test.setTimeout(30_000)

  let context: BrowserContext
  let page: Page

  test.beforeAll(async ({ browser }) => {
    if (!hasRealCreds()) return
    ;({ context, page } = await loginAsRealUser(browser))
  })

  test.afterAll(async () => {
    if (context) await context.close()
  })

  test.beforeEach(async () => {
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await page.route('/api/me/role', route =>
      route.fulfill({ json: { role: 'NAILIST', isAdmin: false } })
    )
    await page.route('/api/me/nailist-profile', route =>
      route.fulfill({ json: { data: MOCK_PROFILE } })
    )
    await page.route('/api/services**', route =>
      route.fulfill({ json: { data: MOCK_SERVICES } })
    )
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [] } })
    )
    await page.route('/api/nailists/profile1', route =>
      route.fulfill({ json: { data: { ...MOCK_PROFILE, services: [], portfolio: [], reviews: [] } } })
    )
  })

  test('dashboard home renders', async () => {
    await page.goto('/dashboard/nailist')
    await expect(page.getByRole('heading', { name: 'תורים קרובים' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('השלמת פרופיל')).toBeVisible()
  })

  test('dashboard settings page renders and loads form', async () => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    await page.goto('/dashboard/nailist/settings')

    // The form should show (not the error state)
    await expect(page.getByText('שם העסק')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /שמרי שינויים/ })).toBeVisible()

    // No critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('maps.googleapis') && !e.includes('userway') && !e.includes('ERR_TUNNEL_CONNECTION_FAILED') && !e.includes('NEXT_PUBLIC')
    )
    expect(criticalErrors, 'No console errors on settings page').toHaveLength(0)
  })

  test('settings page shows business name from profile', async () => {
    await page.goto('/dashboard/nailist/settings')
    const input = page.locator('input').first()
    await expect(input).toHaveValue('סטודיו דמו', { timeout: 10_000 })
  })

  test('services page renders service list', async () => {
    await page.goto('/dashboard/nailist/services')
    await expect(page.getByText("מניקור ג'ל")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('₪150')).toBeVisible()
  })

  test('appointments page renders empty state', async () => {
    await page.goto('/dashboard/nailist/appointments')
    await expect(page.getByText('אין תורים עדיין')).toBeVisible({ timeout: 10_000 })
  })

  test('portfolio page renders', async () => {
    await page.route('/api/portfolio**', route => route.fulfill({ json: { data: [] } }))
    await page.goto('/dashboard/nailist/portfolio')
    await expect(page.getByText(/פורטפוליו|תמונות/i)).toBeVisible({ timeout: 10_000 })
  })

  test('dashboard sidebar navigation works', async () => {
    await page.goto('/dashboard/nailist')
    // Navigate to services via sidebar
    const servicesLink = page.getByRole('link', { name: /שירותים/ })
    await expect(servicesLink).toBeVisible({ timeout: 10_000 })
    await servicesLink.click()
    await expect(page).toHaveURL(/\/services/)
  })
})

test.describe.serial('Dashboard (real auth, real data)', () => {
  test.skip(() => !hasRealCreds(), 'Skipped — run with valid TEST_USER_EMAIL/TEST_USER_PASSWORD credentials')
  test.setTimeout(30_000)

  let context: BrowserContext
  let page: Page

  test.beforeAll(async ({ browser }) => {
    if (!hasRealCreds()) return
    ;({ context, page } = await loginAsRealUser(browser))
  })

  test.afterAll(async () => {
    if (context) await context.close()
  })

  test('real user can access dashboard', async () => {
    await page.goto('/dashboard/nailist')
    await expect(page).not.toHaveURL(/\/login/)
    // No mocks here — hits the real backend. "תורים קרובים" is a static
    // section heading (unconditional, unlike the empty-state message inside
    // it), so this holds regardless of whether the account has appointments.
    await expect(page.getByRole('heading', { name: 'תורים קרובים' })).toBeVisible({ timeout: 10_000 })
  })
})
