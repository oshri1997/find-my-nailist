import { test, expect } from '@playwright/test'

/**
 * Client "my appointments" flow:
 * - View appointment list with status badges
 * - Write a review (3-step modal: stars → comment → done)
 * - Skip review comment
 * - Already-reviewed badge
 * - Empty state
 */

const past = new Date()
past.setDate(past.getDate() - 2)
past.setHours(10, 0, 0, 0)
const pastEnd = new Date(past)
pastEnd.setHours(11, 0, 0, 0)

const future = new Date()
future.setDate(future.getDate() + 1)
future.setHours(10, 0, 0, 0)
const futureEnd = new Date(future)
futureEnd.setHours(11, 0, 0, 0)

const BASE_APPT = {
  id: 'a1',
  nailistProfileId: 'n1',
  clientProfileId: 'c1',
  nailistBusinessName: 'סטודיו שרה',
  serviceName: "מניקור ג'ל",
  startTime: past.toISOString(),
  endTime: pastEnd.toISOString(),
  price: 150,
  currency: 'ILS',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const COMPLETED_NO_REVIEW = { ...BASE_APPT, id: 'a1', status: 'COMPLETED', hasReview: false }
const COMPLETED_WITH_REVIEW = { ...BASE_APPT, id: 'a2', status: 'COMPLETED', hasReview: true }
const PENDING_APPT = { ...BASE_APPT, id: 'a3', status: 'PENDING', startTime: future.toISOString(), endTime: futureEnd.toISOString() }
const CONFIRMED_APPT = { ...BASE_APPT, id: 'a4', status: 'CONFIRMED', startTime: future.toISOString(), endTime: futureEnd.toISOString() }
const CANCELLED_APPT = { ...BASE_APPT, id: 'a5', status: 'CANCELLED' }

test.describe('Client — My Appointments page', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([{
      name: 'auth-token', value: 'test-token', domain: 'localhost', path: '/',
    }])
    await page.route('/api/me/role', route =>
      route.fulfill({ json: { role: 'CLIENT' } })
    )
    await page.route('/api/me/client-profile', route =>
      route.fulfill({ json: { data: { id: 'c1', displayName: 'שרה כ.', email: 'sarah@example.com' } } })
    )
  })

  // ─── Page basics ─────────────────────────────────────────────────────────────

  test('renders page heading', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [] } })
    )
    await page.goto('/my-appointments')
    await expect(page.getByText('ההזמנות שלי')).toBeVisible({ timeout: 8_000 })
  })

  test('empty state shows search CTA', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [] } })
    )
    await page.goto('/my-appointments')
    await expect(page.getByText('עדיין אין תורים')).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText('חפשי נייליסטית')).toBeVisible()
  })

  test('empty state search button links to /search', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [] } })
    )
    await page.goto('/my-appointments')
    await page.getByText('חפשי נייליסטית').click()
    await expect(page).toHaveURL(/\/search/)
  })

  // ─── Status badges ────────────────────────────────────────────────────────────

  test('shows correct status badge for each status', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [PENDING_APPT, CONFIRMED_APPT, CANCELLED_APPT, COMPLETED_NO_REVIEW] } })
    )
    await page.goto('/my-appointments')
    await expect(page.getByText('ממתין לאישור').first()).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText('מאושר').first()).toBeVisible()
    await expect(page.getByText('בוטל').first()).toBeVisible()
    await expect(page.getByText('הושלם').first()).toBeVisible()
  })

  test('shows business name and service name for each appointment', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [PENDING_APPT] } })
    )
    await page.goto('/my-appointments')
    await expect(page.getByText('סטודיו שרה').first()).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText("מניקור ג'ל").first()).toBeVisible()
  })

  // ─── Review button ────────────────────────────────────────────────────────────

  test('completed without review shows "כתבי ביקורת 💅"', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [COMPLETED_NO_REVIEW] } })
    )
    await page.goto('/my-appointments')
    await expect(page.getByText('כתבי ביקורת 💅')).toBeVisible({ timeout: 8_000 })
  })

  test('completed with review shows "✓ ביקורת נשלחה"', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [COMPLETED_WITH_REVIEW] } })
    )
    await page.goto('/my-appointments')
    await expect(page.getByText(/ביקורת נשלחה/)).toBeVisible({ timeout: 8_000 })
  })

  test('pending/confirmed appointments have no review button', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [PENDING_APPT, CONFIRMED_APPT] } })
    )
    await page.goto('/my-appointments')
    await expect(page.getByText('כתבי ביקורת 💅')).not.toBeVisible()
  })

  // ─── Review modal — step 1 (stars) ───────────────────────────────────────────

  test('clicking review button opens modal with stars', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [COMPLETED_NO_REVIEW] } })
    )
    await page.goto('/my-appointments')
    await page.getByText('כתבי ביקורת 💅').click()

    await expect(page.getByText('כמה כוכבים?')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole('button', { name: /המשך/ })).toBeDisabled()
  })

  test('selecting a star enables the continue button', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [COMPLETED_NO_REVIEW] } })
    )
    await page.goto('/my-appointments')
    await page.getByText('כתבי ביקורת 💅').click()

    await page.getByRole('button', { name: '5 כוכבים' }).click()
    await expect(page.getByRole('button', { name: /המשך/ })).toBeEnabled({ timeout: 3_000 })
  })

  // ─── Review modal — step 2 (comment) ─────────────────────────────────────────

  test('after rating, step 2 shows comment textarea', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [COMPLETED_NO_REVIEW] } })
    )
    await page.goto('/my-appointments')
    await page.getByText('כתבי ביקורת 💅').click()
    await page.getByRole('button', { name: '5 כוכבים' }).click()
    await page.getByRole('button', { name: /המשך/ }).click()

    await expect(page.getByPlaceholder(/שתפי את החוויה/)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole('button', { name: 'דלגי' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'שלחי' })).toBeVisible()
  })

  test('typing a comment enables submit', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [COMPLETED_NO_REVIEW] } })
    )
    await page.goto('/my-appointments')
    await page.getByText('כתבי ביקורת 💅').click()
    await page.getByRole('button', { name: '5 כוכבים' }).click()
    await page.getByRole('button', { name: /המשך/ }).click()
    await page.getByPlaceholder(/שתפי את החוויה/).fill('מאוד מקצועית ומהנה!')
    await expect(page.getByRole('button', { name: 'שלחי' })).toBeEnabled()
  })

  // ─── Review modal — submit ────────────────────────────────────────────────────

  test('submitting review calls POST /api/reviews and shows done step', async ({ page }) => {
    let reviewPayload: Record<string, unknown> | null = null

    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [COMPLETED_NO_REVIEW] } })
    )
    await page.route('/api/reviews', async route => {
      reviewPayload = route.request().postDataJSON()
      await route.fulfill({ json: { data: { id: 'r1' } } })
    })

    await page.goto('/my-appointments')
    await page.getByText('כתבי ביקורת 💅').click()
    await page.getByRole('button', { name: '5 כוכבים' }).click()
    await page.getByRole('button', { name: /המשך/ }).click()
    await page.getByPlaceholder(/שתפי את החוויה/).fill('מעולה!')
    await page.getByRole('button', { name: 'שלחי' }).click()

    await expect(page.getByText('הביקורת נשלחה!')).toBeVisible({ timeout: 8_000 })
    expect(reviewPayload).toMatchObject({ rating: 5, comment: 'מעולה!', appointmentId: 'a1' })
  })

  test('skipping comment still submits review and shows done step', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [COMPLETED_NO_REVIEW] } })
    )
    await page.route('/api/reviews', route =>
      route.fulfill({ json: { data: { id: 'r1' } } })
    )

    await page.goto('/my-appointments')
    await page.getByText('כתבי ביקורת 💅').click()
    await page.getByRole('button', { name: '4 כוכבים' }).click()
    await page.getByRole('button', { name: /המשך/ }).click()
    await page.getByRole('button', { name: 'דלגי' }).click()

    await expect(page.getByText('הביקורת נשלחה!')).toBeVisible({ timeout: 8_000 })
  })

  test('done step shows business name and close button', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [COMPLETED_NO_REVIEW] } })
    )
    await page.route('/api/reviews', route =>
      route.fulfill({ json: { data: { id: 'r1' } } })
    )

    await page.goto('/my-appointments')
    await page.getByText('כתבי ביקורת 💅').click()
    await page.getByRole('button', { name: '5 כוכבים' }).click()
    await page.getByRole('button', { name: /המשך/ }).click()
    await page.getByRole('button', { name: 'דלגי' }).click()

    await expect(page.getByText(/סטודיו שרה/)).toBeVisible({ timeout: 8_000 })
    await expect(page.getByRole('button', { name: 'סגור' })).toBeVisible()
  })

  test('closing done modal hides it', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [COMPLETED_NO_REVIEW] } })
    )
    await page.route('/api/reviews', route =>
      route.fulfill({ json: { data: { id: 'r1' } } })
    )

    await page.goto('/my-appointments')
    await page.getByText('כתבי ביקורת 💅').click()
    await page.getByRole('button', { name: '5 כוכבים' }).click()
    await page.getByRole('button', { name: /המשך/ }).click()
    await page.getByRole('button', { name: 'דלגי' }).click()
    await page.getByRole('button', { name: 'סגור' }).click()

    await expect(page.getByText('הביקורת נשלחה!')).not.toBeVisible({ timeout: 3_000 })
  })

  // ─── Review error handling ────────────────────────────────────────────────────

  test('review API error shows error message', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [COMPLETED_NO_REVIEW] } })
    )
    await page.route('/api/reviews', route =>
      route.fulfill({ status: 500, json: { error: 'שגיאת שרת' } })
    )

    await page.goto('/my-appointments')
    await page.getByText('כתבי ביקורת 💅').click()
    await page.getByRole('button', { name: '5 כוכבים' }).click()
    await page.getByRole('button', { name: /המשך/ }).click()
    await page.getByRole('button', { name: 'דלגי' }).click()

    await expect(page.getByText(/שגיאה בשליחת הביקורת|שגיאת רשת/)).toBeVisible({ timeout: 8_000 })
  })

  test('duplicate review (409) shows appropriate error', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [COMPLETED_NO_REVIEW] } })
    )
    await page.route('/api/reviews', route =>
      route.fulfill({ status: 409, json: { error: 'Review already exists' } })
    )

    await page.goto('/my-appointments')
    await page.getByText('כתבי ביקורת 💅').click()
    await page.getByRole('button', { name: '3 כוכבים' }).click()
    await page.getByRole('button', { name: /המשך/ }).click()
    await page.getByRole('button', { name: 'דלגי' }).click()

    await expect(page.getByText(/שגיאה/)).toBeVisible({ timeout: 8_000 })
  })

  // ─── Auto-open review modal via ?review= URL param ────────────────────────────

  test('?review=<id> auto-opens review modal', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [COMPLETED_NO_REVIEW] } })
    )

    await page.goto('/my-appointments?review=a1')
    await expect(page.getByText('כמה כוכבים?')).toBeVisible({ timeout: 8_000 })
  })

  // ─── No console errors ────────────────────────────────────────────────────────

  test('no console errors on my-appointments page', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [PENDING_APPT, COMPLETED_WITH_REVIEW] } })
    )

    await page.goto('/my-appointments')
    await page.waitForLoadState('networkidle')

    const critical = errors.filter(e =>
      !e.includes('favicon') && !e.includes('NEXT_PUBLIC') && !e.includes('maps.googleapis')
    )
    expect(critical).toHaveLength(0)
  })
})
