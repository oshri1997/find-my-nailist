import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { hasRealCreds, loginAsRealUser } from './real-session-helper'

const MOCK_PROFILE = {
  id: 'n1',
  businessName: 'סטודיו שרה',
  city: 'תל אביב',
  bio: 'מניקור מקצועי',
  avgRating: 4.8,
  reviewCount: 10,
  latitude: 32.08,
  longitude: 34.78,
  instagramHandle: null,
  whatsappPhone: '0501234567',
}

const MOCK_SERVICES = [
  { id: 's1', name: "מניקור ג'ל", durationMinutes: 60, price: 150, currency: 'ILS', isActive: true },
  { id: 's2', name: 'פדיקור', durationMinutes: 45, price: 120, currency: 'ILS', isActive: true, description: 'טיפול מלא' },
]

test.describe('Nailist public profile page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('/api/nailists/n1', route =>
      route.fulfill({ json: { data: { ...MOCK_PROFILE, services: MOCK_SERVICES, portfolio: [], reviews: [] } } })
    )
    await page.route('/api/services**', route =>
      route.fulfill({ json: { data: MOCK_SERVICES } })
    )
  })

  test('renders business name and city', async ({ page }) => {
    await page.goto('/nailists/n1')
    await expect(page.getByText('סטודיו שרה').first()).toBeVisible()
    await expect(page.getByText('תל אביב')).toBeVisible()
  })

  test('services tab shows service list', async ({ page }) => {
    await page.goto('/nailists/n1')
    const servicesTab = page.getByRole('button', { name: /שירותים/ })
    await expect(servicesTab).toBeVisible()
    await servicesTab.click()
    await expect(page.getByText("מניקור ג'ל")).toBeVisible()
    await expect(page.getByText('₪150')).toBeVisible()
  })

  // Booking is gated up front now: clicking "קביעת תור" while signed out
  // sends the visitor straight to /login?redirect=... instead of opening
  // the modal — it no longer lets an anonymous visitor walk through the
  // whole flow before hitting a wall at submission.
  test('clicking book while signed out redirects to login', async ({ page }) => {
    await page.goto('/nailists/n1')
    await page.getByRole('button', { name: /שירותים/ }).click()
    await page.getByRole('button', { name: /קביעת תור/ }).first().click()
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })

  test('no console errors on nailist profile page', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    await page.goto('/nailists/n1')
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('maps.googleapis') && !e.includes('NEXT_PUBLIC') && !e.includes('userway') && !e.includes('ERR_TUNNEL_CONNECTION_FAILED')
    )
    expect(criticalErrors).toHaveLength(0)
  })
})

// Opening the booking modal requires a real signed-in user (openBooking()
// checks useAuth().user, which only a real Firebase client session
// populates). See real-session-helper.ts for why this signs in once per
// file (a live context) rather than replaying a storageState snapshot.
test.describe.serial('Booking modal (real session)', () => {
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
    await page.route('/api/nailists/n1', route =>
      route.fulfill({ json: { data: { ...MOCK_PROFILE, services: MOCK_SERVICES, portfolio: [], reviews: [] } } })
    )
    await page.route('/api/services**', route =>
      route.fulfill({ json: { data: MOCK_SERVICES } })
    )
  })

  test('clicking book opens booking modal', async () => {
    await page.goto('/nailists/n1')
    const servicesTab = page.getByRole('button', { name: /שירותים/ })
    await servicesTab.click()
    const bookBtn = page.getByRole('button', { name: /קביעת תור/ }).first()
    await bookBtn.click()
    await expect(page.getByText('בחרי שירות', { exact: true })).toBeVisible({ timeout: 10_000 })
  })

  test('step 1 shows services', async () => {
    await page.goto('/nailists/n1')
    await page.getByRole('button', { name: /שירותים/ }).click()
    await page.getByRole('button', { name: /קביעת תור/ }).first().click()

    // The underlying services tab is already open in the background (from
    // the click above), so it also renders these same service names — .last()
    // targets the modal's own copy, which is appended later in DOM order.
    await expect(page.getByText("מניקור ג'ל").last()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('פדיקור').last()).toBeVisible()
    await expect(page.getByRole('button', { name: /המשך/ })).toBeDisabled()
  })

  test('selecting service enables continue', async () => {
    await page.goto('/nailists/n1')
    await page.getByRole('button', { name: /שירותים/ }).click()
    await page.getByRole('button', { name: /קביעת תור/ }).first().click()

    await page.getByText("מניקור ג'ל").last().click()
    await expect(page.getByRole('button', { name: /המשך/ })).toBeEnabled({ timeout: 10_000 })
  })

  test('step 2 shows date picker', async () => {
    await page.goto('/nailists/n1')
    await page.getByRole('button', { name: /שירותים/ }).click()
    await page.getByRole('button', { name: /קביעת תור/ }).first().click()
    await page.getByText("מניקור ג'ל").last().click()
    await page.getByRole('button', { name: /המשך/ }).click()

    await expect(page.getByText(/בחרי תאריך ושעה/)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByLabel('תאריך')).toBeVisible()
  })

  test('selecting date shows time slots', async () => {
    await page.goto('/nailists/n1')
    await page.getByRole('button', { name: /שירותים/ }).click()
    await page.getByRole('button', { name: /קביעת תור/ }).first().click()
    await page.getByText("מניקור ג'ל").last().click()
    await page.getByRole('button', { name: /המשך/ }).click()

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]
    await page.getByLabel('תאריך').fill(dateStr)

    await expect(page.getByText('08:00')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('09:00')).toBeVisible()
  })

  test('step 3 shows confirmation summary', async () => {
    await page.goto('/nailists/n1')
    await page.getByRole('button', { name: /שירותים/ }).click()
    await page.getByRole('button', { name: /קביעת תור/ }).first().click()
    await page.getByText("מניקור ג'ל").last().click()
    await page.getByRole('button', { name: /המשך/ }).click()

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await page.getByLabel('תאריך').fill(tomorrow.toISOString().split('T')[0])
    await page.getByText('08:00').click()
    await page.getByRole('button', { name: /המשך/ }).click()

    await expect(page.getByText('אישור הזמנה')).toBeVisible()
    await expect(page.getByText('₪150').last()).toBeVisible()
  })
})
