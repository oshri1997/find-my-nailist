import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

/**
 * E2E tests for the onboarding welcome page (/onboarding/welcome).
 *
 * This page gates on the real Firebase client-side auth state
 * (useAuth().user) and redirects to /login otherwise, so a real signed-in
 * session (from auth.setup.ts) is required. The role/profile APIs are still
 * mocked for determinism — the real backend's actual role value doesn't
 * matter since these routes are intercepted before they'd reach it.
 */
const authFile = path.join(__dirname, '.auth/user.json')
const hasAuth = () => {
  try {
    const state = JSON.parse(fs.readFileSync(authFile, 'utf8'))
    return state.cookies?.length > 0
  } catch { return false }
}

test.describe('Onboarding welcome page', () => {
  test.skip(() => !hasAuth(), 'Skipped — run auth.setup first with valid TEST_USER_EMAIL/TEST_USER_PASSWORD credentials')
  test.use({ storageState: authFile })
  test.setTimeout(60_000)

  test.beforeEach(async ({ page }) => {
    // Simulate an authenticated user with no role yet
    await page.route('/api/me/nailist-profile', route =>
      route.fulfill({ status: 404, json: { error: 'not found' } })
    )
    await page.route('/api/me/role', route =>
      route.fulfill({ json: { role: null } })
    )
  })

  test('renders account-type heading and both role buttons', async ({ page }) => {
    await page.goto('/onboarding/welcome')

    await expect(page.getByText('בחרי סוג חשבון')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('נייליסטית')).toBeVisible()
    await expect(page.getByText('לקוחה')).toBeVisible()
  })

  test('clicking נייליסטית calls set-role and redirects', async ({ page }) => {
    let calledWith: string | undefined

    await page.route('/api/me/set-role', async route => {
      const body = route.request().postDataJSON()
      calledWith = body?.role
      await route.fulfill({ json: { ok: true } })
    })

    // After set-role the component calls /api/me/role again to refresh
    await page.route('/api/me/role', route =>
      route.fulfill({ json: { role: 'NAILIST' } })
    )

    await page.goto('/onboarding/welcome')
    await page.getByText('נייליסטית').click()

    // Should have POSTed the correct role
    await expect.poll(() => calledWith, { timeout: 15_000 }).toBe('NAILIST')

    // Should redirect to the nailist onboarding flow
    await expect(page).toHaveURL(/\/onboarding(?!\/welcome)/, { timeout: 15_000 })
  })

  test('clicking לקוחה calls set-role with CLIENT', async ({ page }) => {
    let calledWith: string | undefined

    await page.route('/api/me/set-role', async route => {
      const body = route.request().postDataJSON()
      calledWith = body?.role
      await route.fulfill({ json: { ok: true } })
    })

    await page.route('/api/me/role', route =>
      route.fulfill({ json: { role: 'CLIENT' } })
    )

    await page.goto('/onboarding/welcome')
    await page.getByText('לקוחה').click()

    await expect.poll(() => calledWith, { timeout: 15_000 }).toBe('CLIENT')
    await expect(page).toHaveURL(/\/onboarding\/client/, { timeout: 15_000 })
  })

  test('shows error message if set-role fails', async ({ page }) => {
    await page.route('/api/me/set-role', route =>
      route.fulfill({ status: 500, json: { error: 'server error' } })
    )

    await page.goto('/onboarding/welcome')
    await page.getByText('נייליסטית').click()

    await expect(page.getByText('שגיאה — נסי שוב')).toBeVisible({ timeout: 15_000 })
  })

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    await page.goto('/onboarding/welcome')

    const critical = errors.filter(e =>
      !e.includes('favicon') && !e.includes('NEXT_PUBLIC') && !e.includes('maps.googleapis') && !e.includes('userway') && !e.includes('ERR_TUNNEL_CONNECTION_FAILED')
    )
    expect(critical, 'No console errors').toHaveLength(0)
  })
})
