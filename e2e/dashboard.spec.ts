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
 * Dashboard business data is mocked via page.route() for determinism, but
 * the session itself must be real: these pages gate on the Firebase
 * client-side auth state (useAuth().user), which only a real signed-in
 * session (from auth.setup.ts) populates — a spoofed cookie leaves
 * useAuth().user null and the layout redirects to /login.
 */
test.describe('Dashboard (mocked data, real session)', () => {
  test.skip(() => !hasAuth(), 'Skipped — run auth.setup first with valid TEST_USER_EMAIL/TEST_USER_PASSWORD credentials')
  test.use({ storageState: authFile })
  test.setTimeout(60_000)

  // Real-session tests hit real network for Firebase Auth rehydration plus
  // the app's own /api/auth/session + /api/me/role calls before the page
  // renders anything (a full-page loader blocks until useAuth() resolves) —
  // mock what's mockable and give the first content check a generous
  // timeout so real CI network latency doesn't flake these.
  test.beforeEach(async ({ page }) => {
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

  test('dashboard home renders', async ({ page }) => {
    await page.goto('/dashboard/nailist')
    await expect(page.getByText('תורים קרובים')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('השלמת פרופיל')).toBeVisible()
  })

  test('dashboard settings page renders and loads form', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    await page.goto('/dashboard/nailist/settings')

    // The form should show (not the error state)
    await expect(page.getByText('שם העסק')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /שמרי שינויים/ })).toBeVisible()

    // No critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('maps.googleapis') && !e.includes('userway') && !e.includes('ERR_TUNNEL_CONNECTION_FAILED') && !e.includes('NEXT_PUBLIC')
    )
    expect(criticalErrors, 'No console errors on settings page').toHaveLength(0)
  })

  test('settings page shows business name from profile', async ({ page }) => {
    await page.goto('/dashboard/nailist/settings')
    const input = page.locator('input').first()
    await expect(input).toHaveValue('סטודיו דמו', { timeout: 15_000 })
  })

  test('services page renders service list', async ({ page }) => {
    await page.goto('/dashboard/nailist/services')
    await expect(page.getByText("מניקור ג'ל")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('₪150')).toBeVisible()
  })

  test('appointments page renders empty state', async ({ page }) => {
    await page.goto('/dashboard/nailist/appointments')
    await expect(page.getByText('אין תורים עדיין')).toBeVisible({ timeout: 15_000 })
  })

  test('portfolio page renders', async ({ page }) => {
    await page.route('/api/portfolio**', route => route.fulfill({ json: { data: [] } }))
    await page.goto('/dashboard/nailist/portfolio')
    await expect(page.getByText(/פורטפוליו|תמונות/i)).toBeVisible({ timeout: 15_000 })
  })

  test('dashboard sidebar navigation works', async ({ page }) => {
    await page.goto('/dashboard/nailist')
    // Navigate to services via sidebar
    const servicesLink = page.getByRole('link', { name: /שירותים/ })
    await expect(servicesLink).toBeVisible({ timeout: 15_000 })
    await servicesLink.click()
    await expect(page).toHaveURL(/\/services/)
  })
})

test.describe('Dashboard (real auth, real data)', () => {
  test.skip(() => !hasAuth(), 'Skipped — run auth.setup first with valid credentials')
  test.use({ storageState: authFile })
  test.setTimeout(60_000)

  test('real user can access dashboard', async ({ page }) => {
    await page.goto('/dashboard/nailist')
    await expect(page).not.toHaveURL(/\/login/)
    // No mocks here — hits the real backend. "תורים קרובים" is a static
    // section heading (unconditional, unlike the empty-state message inside
    // it), so this holds regardless of whether the account has appointments.
    await expect(page.getByText('תורים קרובים')).toBeVisible({ timeout: 15_000 })
  })
})
