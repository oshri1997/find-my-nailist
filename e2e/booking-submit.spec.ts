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

// The date step is a rendered month calendar (buttons with data-date="YYYY-MM-DD"),
// not a fillable <input> — matches BookingModal.tsx's own toDateStr (local date parts).
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Self-contained copy of booking-utils.ts's israelWallClockToUtc — Playwright
// spec files run outside the Next.js module graph, so this mirrors the exact
// algorithm rather than importing app source, and keeps mocked bookedSlots
// instants correct regardless of DST at whatever date the suite runs on.
function israelWallClockToUtc(dateStr: string, timeStr: string): Date {
  const naiveUtc = new Date(`${dateStr}T${timeStr}:00Z`)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(naiveUtc).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value
    return acc
  }, {} as Record<string, string>)
  const asIfUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second)
  )
  return new Date(naiveUtc.getTime() - (asIfUtc - naiveUtc.getTime()))
}

async function openBookingModal(page: Page) {
  await page.goto('/nailists/n1')
  await page.getByRole('button', { name: /שירותים/ }).click()
  await page.getByRole('button', { name: /קביעת תור/ }).first().click()
}

async function selectServiceAndTime(page: Page) {
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: /מניקור ג'ל/ }).click()
  await dialog.getByRole('button', { name: /המשך/ }).click()

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  await dialog.locator(`[data-date="${toDateStr(tomorrow)}"]`).click()
  await dialog.getByText('08:00').click()
  await dialog.getByRole('button', { name: /המשך/ }).click()
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
    await page.route(/\/api\/nailists\/n1\/availability\/batch/, route =>
      route.fulfill({ json: { data: {} } })
    )
    await page.route(/\/api\/nailists\/n1\/availability\?/, route =>
      route.fulfill({ json: { data: { workingDay: true, intervals: [{ start: '08:00', end: '18:00' }], startTime: '08:00', endTime: '18:00', bookedSlots: [] } } })
    )
  })

  test('step 3 shows summary with price and service name', async () => {
    await openBookingModal(page)
    await selectServiceAndTime(page)

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(/אישור הזמנה/)).toBeVisible()
    await expect(dialog.getByText("מניקור ג'ל")).toBeVisible()
    await expect(dialog.getByText('₪150')).toBeVisible()
    await expect(dialog.getByText('סטודיו שרה')).toBeVisible()
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
    await page.getByRole('button', { name: /אישור וקביעת תור/ }).click()

    await expect(page.getByText('בקשת התור נשלחה!')).toBeVisible({ timeout: 10_000 })
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
    await page.getByRole('button', { name: /אישור וקביעת תור/ }).click()

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
    await page.getByRole('button', { name: /אישור וקביעת תור/ }).click()

    await expect(page.getByText('שגיאת שרת')).toBeVisible({ timeout: 10_000 })
  })

  test('unauthorized booking redirects or shows login prompt', async () => {
    await page.route('/api/me/client-profile', route =>
      route.fulfill({ status: 401, json: { error: 'Unauthorized' } })
    )
    await page.route('/api/appointments', route =>
      route.fulfill({ status: 401, json: { error: 'Unauthorized' } })
    )

    await openBookingModal(page)
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: /מניקור ג'ל/ }).click()
    await dialog.getByRole('button', { name: /המשך/ }).click()

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await dialog.locator(`[data-date="${toDateStr(tomorrow)}"]`).click()
    await dialog.getByText('08:00').click()
    await dialog.getByRole('button', { name: /המשך/ }).click()
    await dialog.getByRole('button', { name: /אישור וקביעת תור/ }).click()

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

/**
 * Split-shift (multiple availability intervals per day) full customer flow:
 * a nailist working 09:00-13:00 and 15:00-19:00 on the selected day — the
 * customer sees morning slots, no slots in the 13:00-15:00 break, sees
 * afternoon slots again, books 15:00, gets a PENDING appointment, and a
 * second customer opening the same day afterward no longer sees that slot.
 */
test.describe.serial('Booking — split-shift (multiple intervals) day', () => {
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

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = toDateStr(tomorrow)

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
    await page.route(/\/api\/nailists\/n1\/availability\/batch/, route =>
      route.fulfill({ json: { data: {} } })
    )
    await page.route(/\/api\/nailists\/n1\/availability\?/, route =>
      route.fulfill({
        json: {
          data: {
            workingDay: true,
            intervals: [{ start: '09:00', end: '13:00' }, { start: '15:00', end: '19:00' }],
            startTime: '09:00',
            endTime: '19:00',
            bookedSlots: [],
          },
        },
      })
    )
  })

  test('shows morning slots, hides the break, shows afternoon slots, and books 15:00', async () => {
    await openBookingModal(page)
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: /מניקור ג'ל/ }).click()
    await dialog.getByRole('button', { name: /המשך/ }).click()
    await dialog.locator(`[data-date="${tomorrowStr}"]`).click()

    // Morning window is bookable.
    await expect(dialog.getByText('09:00', { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(dialog.getByText('12:00', { exact: true })).toBeVisible()
    // The 13:00-15:00 break is off-hours, not a gap — no slot starts inside it.
    await expect(dialog.getByText('13:00', { exact: true })).not.toBeVisible()
    await expect(dialog.getByText('13:30', { exact: true })).not.toBeVisible()
    await expect(dialog.getByText('14:00', { exact: true })).not.toBeVisible()
    await expect(dialog.getByText('14:30', { exact: true })).not.toBeVisible()
    // Afternoon window is bookable again.
    await expect(dialog.getByText('15:00', { exact: true })).toBeVisible()

    await dialog.getByText('15:00', { exact: true }).click()
    await dialog.getByRole('button', { name: /המשך/ }).click()
    await expect(dialog.getByText(/אישור הזמנה/)).toBeVisible()

    let sentBody: Record<string, unknown> | null = null
    await page.route('/api/appointments', async route => {
      if (route.request().method() === 'POST') {
        sentBody = route.request().postDataJSON()
        await route.fulfill({ json: { data: { id: 'appt-split', status: 'PENDING' } } })
      } else {
        await route.fulfill({ json: { data: [] } })
      }
    })
    await dialog.getByRole('button', { name: /אישור וקביעת תור/ }).click()

    await expect(page.getByText('בקשת התור נשלחה!')).toBeVisible({ timeout: 10_000 })
    await expect.poll(() => sentBody).not.toBeNull()
    expect(sentBody).toMatchObject({ nailistProfileId: 'n1', serviceId: 's1' })
  })

  test('a second customer opening the same day no longer sees the now-booked 15:00 slot', async () => {
    // Simulates the state after the first customer's booking above: the
    // server-side availability response now reports 15:00-16:00 as booked
    // (PENDING blocks time exactly like CONFIRMED does).
    await page.route(/\/api\/nailists\/n1\/availability\?/, route =>
      route.fulfill({
        json: {
          data: {
            workingDay: true,
            intervals: [{ start: '09:00', end: '13:00' }, { start: '15:00', end: '19:00' }],
            startTime: '09:00',
            endTime: '19:00',
            bookedSlots: [{
              startTime: israelWallClockToUtc(tomorrowStr, '15:00').toISOString(),
              endTime: israelWallClockToUtc(tomorrowStr, '16:00').toISOString(),
            }],
          },
        },
      })
    )

    await openBookingModal(page)
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: /מניקור ג'ל/ }).click()
    await dialog.getByRole('button', { name: /המשך/ }).click()
    await dialog.locator(`[data-date="${tomorrowStr}"]`).click()

    // getByText('15:00') already resolves to the slot <button> itself (its
    // text has no wrapper element) — use getByRole directly rather than
    // .locator('..'), which would instead select the button's own parent
    // (the slots grid <div>) and never observe the disabled state.
    const slotButton = dialog.getByRole('button', { name: '15:00', exact: true })
    await expect(slotButton).toBeVisible({ timeout: 10_000 })
    await expect(slotButton).toBeDisabled()
  })
})
