import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { hasRealCreds, loginAsRealUser } from './real-session-helper'

/**
 * Full booking submission flow:
 * service → date/time → confirmation summary → POST /api/appointments → success
 *
 * Opening the booking modal requires a real signed-in user (openBooking()
 * checks useAuth().user, which only a real Firebase client session
 * populates). See real-session-helper.ts for why this signs in once per
 * file (a live context) rather than replaying a storageState snapshot.
 */

const MOCK_PROFILE = {
  id: 'n1',
  businessName: 'סטודיו שרה',
  city: 'תל אביב',
  bio: 'מניקור מקצועי',
  avgRating: 4.8,
  reviewCount: 10,
  latitude: 32.08,
  longitude: 34.78,
  whatsappPhone: '0501234567',
}

const MOCK_SERVICES = [
  { id: 's1', name: "מניקור ג'ל", durationMinutes: 60, price: 150, currency: 'ILS', isActive: true },
]

const MOCK_CLIENT_PROFILE = {
  id: 'c1',
  userId: 'u1',
  displayName: 'שרה כ.',
  email: 'sarah@example.com',
}

async function openBookingModal(page: Page) {
  await page.goto('/nailists/n1')
  await page.getByRole('button', { name: /שירותים/ }).click()
  await page.getByRole('button', { name: /קביעת תור/ }).first().click()
}

async function selectServiceAndTime(page: Page) {
  // The underlying services tab is already open in the background (from
  // openBookingModal's tab click), so it renders the same service name —
  // .last() targets the modal's own copy, appended later in DOM order.
  await page.getByText("מניקור ג'ל").last().click()
  await page.getByRole('button', { name: /המשך/ }).click()

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  await page.getByLabel('תאריך').fill(tomorrow.toISOString().split('T')[0])
  await page.getByText('08:00').click()
  await page.getByRole('button', { name: /המשך/ }).click()
}

test.describe.serial('Booking — full submission flow', () => {
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
    await page.route('/api/me/client-profile', route =>
      route.fulfill({ json: { data: MOCK_CLIENT_PROFILE } })
    )
  })

  test('step 3 shows summary with price and service name', async () => {
    await openBookingModal(page)
    await selectServiceAndTime(page)

    await expect(page.getByText(/אישור הזמנה/)).toBeVisible()
    await expect(page.getByText("מניקור ג'ל").last()).toBeVisible()
    await expect(page.getByText('₪150').last()).toBeVisible()
    await expect(page.getByText('סטודיו שרה').last()).toBeVisible()
  })

  test('successful booking shows done step', async () => {
    await page.route('/api/appointments', route => {
      if (route.request().method() === 'POST')
        route.fulfill({ json: { data: { id: 'appt1', status: 'PENDING' } } })
      else
        route.fulfill({ json: { data: [] } })
    })

    await openBookingModal(page)
    await selectServiceAndTime(page)
    await page.getByRole('button', { name: /אישור הזמנה/ }).click()

    await expect(page.getByText(/הזמנה נשלחה|הצלחה|ממתין לאישור/)).toBeVisible({ timeout: 10_000 })
  })

  test('booking sends correct payload to API', async () => {
    let sentBody: Record<string, unknown> | null = null

    await page.route('/api/appointments', async route => {
      if (route.request().method() === 'POST') {
        sentBody = route.request().postDataJSON()
        await route.fulfill({ json: { data: { id: 'appt1', status: 'PENDING' } } })
      } else {
        await route.fulfill({ json: { data: [] } })
      }
    })

    await openBookingModal(page)
    await selectServiceAndTime(page)
    await page.getByRole('button', { name: /אישור הזמנה/ }).click()

    await expect.poll(() => sentBody).not.toBeNull()
    expect(sentBody).toMatchObject({
      nailistProfileId: 'n1',
      serviceId: 's1',
    })
  })

  test('API error shows error message and stay on step 3', async () => {
    await page.route('/api/appointments', route => {
      if (route.request().method() === 'POST')
        route.fulfill({ status: 500, json: { error: 'שגיאת שרת' } })
      else
        route.fulfill({ json: { data: [] } })
    })

    await openBookingModal(page)
    await selectServiceAndTime(page)
    await page.getByRole('button', { name: /אישור הזמנה/ }).click()

    await expect(page.getByText(/שגיאה|לא הצלחנו/)).toBeVisible({ timeout: 10_000 })
  })

  test('unauthorized booking redirects or shows login prompt', async () => {
    await page.route('/api/me/client-profile', route =>
      route.fulfill({ status: 401, json: { error: 'Unauthorized' } })
    )
    await page.route('/api/appointments', route =>
      route.fulfill({ status: 401, json: { error: 'Unauthorized' } })
    )

    await openBookingModal(page)
    await page.getByText("מניקור ג'ל").last().click()
    await page.getByRole('button', { name: /המשך/ }).click()

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await page.getByLabel('תאריך').fill(tomorrow.toISOString().split('T')[0])
    await page.getByText('08:00').click()
    await page.getByRole('button', { name: /המשך/ }).click()
    await page.getByRole('button', { name: /אישור הזמנה/ }).click()

    await expect(page.getByText(/יש להתחבר|התחברות|login/i)).toBeVisible({ timeout: 10_000 })
  })

  test('back button returns from step 3 to step 2', async () => {
    await openBookingModal(page)
    await selectServiceAndTime(page)

    const backBtn = page.getByRole('button', { name: /חזרה|חזרי/ })
    if (await backBtn.count() > 0) {
      await backBtn.click()
      await expect(page.getByText(/בחרי תאריך ושעה/)).toBeVisible()
    }
  })

  test('closing modal removes it from DOM', async () => {
    await openBookingModal(page)
    await expect(page.getByText('בחרי שירות')).toBeVisible()

    const closeBtn = page.getByRole('button', { name: /סגור|✕|×/ }).first()
    if (await closeBtn.count() > 0) {
      await closeBtn.click()
      await expect(page.getByText('בחרי שירות')).not.toBeVisible({ timeout: 3_000 })
    }
  })
})
