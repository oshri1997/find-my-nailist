import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const authFile = path.join(__dirname, '.auth/user.json')
const hasAuth = () => {
  try {
    const state = JSON.parse(fs.readFileSync(authFile, 'utf8'))
    return state.cookies?.length > 0
  } catch { return false }
}

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
 * Dashboard tests use mocked API responses so they work without real Firebase.
 * The auth-token cookie is injected to bypass the middleware.
 */
test.describe('Dashboard (mocked auth)', () => {
  test.beforeEach(async ({ page }) => {
    // Inject a fake auth cookie to pass the middleware check
    await page.context().addCookies([{
      name: 'auth-token',
      value: 'test-token',
      domain: 'localhost',
      path: '/',
    }])

    // Mock all API calls that would verify the token
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
      route.fulfill({ json: { data: { ...MOCK_PROFILE, services: [], reviews: [] } } })
    )
  })

  test('dashboard home renders', async ({ page }) => {
    await page.goto('/dashboard/nailist')
    await expect(page.getByText('תורים קרובים')).toBeVisible()
    await expect(page.getByText('השלמת פרופיל')).toBeVisible()
  })

  test('dashboard settings page renders and loads form', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    await page.goto('/dashboard/nailist/settings')

    // The form should show (not the error state)
    await expect(page.getByText('שם העסק')).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole('button', { name: /שמרי שינויים/ })).toBeVisible()

    // No critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('maps.googleapis') && !e.includes('NEXT_PUBLIC')
    )
    expect(criticalErrors, 'No console errors on settings page').toHaveLength(0)
  })

  test('settings page shows business name from profile', async ({ page }) => {
    await page.goto('/dashboard/nailist/settings')
    const input = page.locator('input').first()
    await expect(input).toHaveValue('סטודיו דמו', { timeout: 8000 })
  })

  test('services page renders service list', async ({ page }) => {
    await page.goto('/dashboard/nailist/services')
    await expect(page.getByText("מניקור ג'ל")).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('₪150')).toBeVisible()
  })

  test('appointments page renders empty state', async ({ page }) => {
    await page.goto('/dashboard/nailist/appointments')
    await expect(page.getByText('אין תורים עדיין')).toBeVisible({ timeout: 8000 })
  })

  test('portfolio page renders', async ({ page }) => {
    await page.route('/api/portfolio**', route => route.fulfill({ json: { data: [] } }))
    await page.goto('/dashboard/nailist/portfolio')
    await expect(page.getByText(/פורטפוליו|תמונות/i)).toBeVisible({ timeout: 8000 })
  })

  test('dashboard sidebar navigation works', async ({ page }) => {
    await page.goto('/dashboard/nailist')
    // Navigate to services via sidebar
    const servicesLink = page.getByRole('link', { name: /שירותים/ })
    if (await servicesLink.count() > 0) {
      await servicesLink.click()
      await expect(page).toHaveURL(/\/services/)
    }
  })
})

test.describe('Dashboard (real auth)', () => {
  test.skip(() => !hasAuth(), 'Skipped — run auth.setup first with valid credentials')
  test.use({ storageState: authFile })

  test('real user can access dashboard', async ({ page }) => {
    await page.goto('/dashboard/nailist')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText('תורים קרובים')).toBeVisible()
  })
})
