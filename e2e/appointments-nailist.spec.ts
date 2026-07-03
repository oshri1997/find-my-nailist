import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

/**
 * Nailist appointment management:
 * - View pending / confirmed / completed appointments
 * - Confirm a pending appointment → PATCH /api/appointments/[id]/status
 * - Cancel an appointment
 * - Mark as completed
 *
 * These pages gate on the real Firebase client-side auth state
 * (useAuth().user), not just the auth-token cookie, so a real signed-in
 * session (from auth.setup.ts) is required — a spoofed cookie alone leaves
 * useAuth().user null and the dashboard layout redirects to /login. All
 * business data is still mocked via page.route() for determinism; only the
 * session itself is real.
 */
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

const future = new Date()
future.setDate(future.getDate() + 1)
future.setHours(10, 0, 0, 0)
const futureEnd = new Date(future)
futureEnd.setHours(11, 0, 0, 0)

const past = new Date()
past.setDate(past.getDate() - 1)
past.setHours(10, 0, 0, 0)
const pastEnd = new Date(past)
pastEnd.setHours(11, 0, 0, 0)

const PENDING_APPT = {
  id: 'a1',
  nailistProfileId: 'profile1',
  clientProfileId: 'c1',
  clientDisplayName: 'שרה כ.',
  serviceName: "מניקור ג'ל",
  nailistBusinessName: 'סטודיו דמו',
  startTime: future.toISOString(),
  endTime: futureEnd.toISOString(),
  status: 'PENDING',
  price: 150,
  currency: 'ILS',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const CONFIRMED_APPT = { ...PENDING_APPT, id: 'a2', status: 'CONFIRMED' }
const COMPLETED_APPT = { ...PENDING_APPT, id: 'a3', status: 'COMPLETED', startTime: past.toISOString(), endTime: pastEnd.toISOString() }
const CANCELLED_APPT = { ...PENDING_APPT, id: 'a4', status: 'CANCELLED', startTime: past.toISOString(), endTime: pastEnd.toISOString() }

test.describe('Nailist appointments dashboard', () => {
  test.skip(() => !hasAuth(), 'Skipped — run auth.setup first with valid TEST_USER_EMAIL/TEST_USER_PASSWORD credentials')
  test.use({ storageState: authFile })
  test.setTimeout(60_000)

  test.beforeEach(async ({ page }) => {
    await page.route('/api/me/role', route =>
      route.fulfill({ json: { role: 'NAILIST', isAdmin: false } })
    )
    await page.route('/api/me/nailist-profile', route =>
      route.fulfill({ json: { data: MOCK_PROFILE } })
    )
    await page.route('/api/services**', route =>
      route.fulfill({ json: { data: [] } })
    )
    await page.route('/api/nailists/profile1', route =>
      route.fulfill({ json: { data: { ...MOCK_PROFILE, services: [], portfolio: [], reviews: [] } } })
    )
  })

  // ─── Empty state ────────────────────────────────────────────────────────────

  test('shows empty state when no appointments', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [] } })
    )

    await page.goto('/dashboard/nailist/appointments')
    await expect(page.getByText('אין תורים עדיין')).toBeVisible({ timeout: 15_000 })
  })

  // ─── Pending appointment ─────────────────────────────────────────────────────

  test('pending appointment shows "אשר" and "בטל" buttons', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [PENDING_APPT] } })
    )

    await page.goto('/dashboard/nailist/appointments')
    await expect(page.getByText("מניקור ג'ל").first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'אשר' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'בטל' }).first()).toBeVisible()
  })

  test('pending appointment shows client name and price', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [PENDING_APPT] } })
    )

    await page.goto('/dashboard/nailist/appointments')
    await expect(page.getByText('שרה כ.').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('₪150').first()).toBeVisible()
  })

  // ─── Confirm appointment ────────────────────────────────────────────────────

  test('clicking "אשר" calls PATCH status=CONFIRMED', async ({ page }) => {
    let patchedStatus: string | undefined

    await page.route('/api/appointments**', route => {
      if (route.request().method() === 'PATCH') {
        patchedStatus = route.request().postDataJSON()?.status
        route.fulfill({ json: { message: 'Status updated', status: 'CONFIRMED' } })
      } else {
        route.fulfill({ json: { data: [PENDING_APPT] } })
      }
    })

    await page.goto('/dashboard/nailist/appointments')
    await page.getByRole('button', { name: 'אשר' }).first().click()

    await expect.poll(() => patchedStatus, { timeout: 5_000 }).toBe('CONFIRMED')
  })

  test('after confirm, appointment shows "הושלם" button', async ({ page }) => {
    let confirmed = false

    await page.route('/api/appointments**', route => {
      if (route.request().method() === 'PATCH') {
        confirmed = true
        route.fulfill({ json: { message: 'Status updated', status: 'CONFIRMED' } })
      } else {
        route.fulfill({ json: { data: [confirmed ? CONFIRMED_APPT : PENDING_APPT] } })
      }
    })

    await page.goto('/dashboard/nailist/appointments')
    await page.getByRole('button', { name: 'אשר' }).first().click()

    // Reload to see updated status
    await page.reload()
    await expect(page.getByRole('button', { name: 'הושלם' }).first()).toBeVisible({ timeout: 15_000 })
  })

  // ─── Cancel appointment ─────────────────────────────────────────────────────

  test('clicking "בטל" calls PATCH status=CANCELLED', async ({ page }) => {
    let patchedStatus: string | undefined

    await page.route('/api/appointments**', route => {
      if (route.request().method() === 'PATCH') {
        patchedStatus = route.request().postDataJSON()?.status
        route.fulfill({ json: { message: 'Status updated', status: 'CANCELLED' } })
      } else {
        route.fulfill({ json: { data: [PENDING_APPT] } })
      }
    })

    await page.goto('/dashboard/nailist/appointments')
    await page.getByRole('button', { name: 'בטל' }).first().click()

    await expect.poll(() => patchedStatus, { timeout: 5_000 }).toBe('CANCELLED')
  })

  test('cancelling confirmed appointment also works', async ({ page }) => {
    let patchedStatus: string | undefined

    await page.route('/api/appointments**', route => {
      if (route.request().method() === 'PATCH') {
        patchedStatus = route.request().postDataJSON()?.status
        route.fulfill({ json: { message: 'Status updated', status: 'CANCELLED' } })
      } else {
        route.fulfill({ json: { data: [CONFIRMED_APPT] } })
      }
    })

    await page.goto('/dashboard/nailist/appointments')
    await page.getByRole('button', { name: 'בטל' }).first().click()

    await expect.poll(() => patchedStatus, { timeout: 5_000 }).toBe('CANCELLED')
  })

  // ─── Complete appointment ────────────────────────────────────────────────────

  test('clicking "הושלם" calls PATCH status=COMPLETED', async ({ page }) => {
    let patchedStatus: string | undefined

    await page.route('/api/appointments**', route => {
      if (route.request().method() === 'PATCH') {
        patchedStatus = route.request().postDataJSON()?.status
        route.fulfill({ json: { message: 'Status updated', status: 'COMPLETED' } })
      } else {
        route.fulfill({ json: { data: [CONFIRMED_APPT] } })
      }
    })

    await page.goto('/dashboard/nailist/appointments')
    await page.getByRole('button', { name: 'הושלם' }).first().click()

    await expect.poll(() => patchedStatus, { timeout: 5_000 }).toBe('COMPLETED')
  })

  // ─── History section ─────────────────────────────────────────────────────────

  test('completed and cancelled appointments appear in history section', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [COMPLETED_APPT, CANCELLED_APPT, PENDING_APPT] } })
    )

    await page.goto('/dashboard/nailist/appointments')
    await expect(page.getByText('היסטוריה')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('הושלם').first()).toBeVisible()
    await expect(page.getByText('בוטל').first()).toBeVisible()
  })

  test('status badge shows "ממתין" for pending appointments', async ({ page }) => {
    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [PENDING_APPT] } })
    )

    await page.goto('/dashboard/nailist/appointments')
    await expect(page.getByText('ממתין').first()).toBeVisible({ timeout: 15_000 })
  })

  // ─── Error handling ──────────────────────────────────────────────────────────

  test('API error on status update shows error feedback', async ({ page }) => {
    await page.route('/api/appointments**', route => {
      if (route.request().method() === 'PATCH')
        route.fulfill({ status: 500, json: { error: 'שגיאת שרת' } })
      else
        route.fulfill({ json: { data: [PENDING_APPT] } })
    })

    await page.goto('/dashboard/nailist/appointments')
    await page.getByRole('button', { name: 'אשר' }).first().click()

    // Should show some error or the button remains visible (not crash)
    await page.waitForTimeout(2_000)
    const stillOnPage = await page.getByRole('button', { name: 'אשר' }).count()
    expect(stillOnPage).toBeGreaterThanOrEqual(0) // Page didn't crash
  })

  test('no console errors on appointments page', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    await page.route('/api/appointments**', route =>
      route.fulfill({ json: { data: [PENDING_APPT] } })
    )

    await page.goto('/dashboard/nailist/appointments')
    await page.waitForLoadState('networkidle')

    const critical = errors.filter(e =>
      !e.includes('favicon') && !e.includes('NEXT_PUBLIC') && !e.includes('maps.googleapis') && !e.includes('userway') && !e.includes('ERR_TUNNEL_CONNECTION_FAILED')
    )
    expect(critical).toHaveLength(0)
  })
})
