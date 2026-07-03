import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { hasRealCreds, loginAsRealUser } from './real-session-helper'

/**
 * E2E tests for the onboarding welcome page (/onboarding/welcome).
 *
 * This page gates on the real Firebase client-side auth state
 * (useAuth().user) and redirects to /login otherwise, so a real signed-in
 * session is required. The role/profile APIs are still mocked for
 * determinism — the real backend's actual role value doesn't matter since
 * these routes are intercepted before they'd reach it. See
 * real-session-helper.ts for why this signs in once per file (a live
 * context) rather than replaying a storageState snapshot per test.
 */
test.describe.serial('Onboarding welcome page', () => {
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
    // Simulate an authenticated user with no role yet
    await page.route('/api/me/nailist-profile', route =>
      route.fulfill({ status: 404, json: { error: 'not found' } })
    )
    await page.route('/api/me/role', route =>
      route.fulfill({ json: { role: null } })
    )
  })

  test('renders account-type heading and both role buttons', async () => {
    await page.goto('/onboarding/welcome')

    await expect(page.getByText('בחרי סוג חשבון')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('נייליסטית')).toBeVisible()
    await expect(page.getByText('לקוחה')).toBeVisible()
  })

  test('clicking נייליסטית calls set-role and redirects', async () => {
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
    await expect.poll(() => calledWith, { timeout: 10_000 }).toBe('NAILIST')

    // Should redirect to the nailist onboarding flow
    await expect(page).toHaveURL(/\/onboarding(?!\/welcome)/, { timeout: 10_000 })
  })

  test('clicking לקוחה calls set-role with CLIENT', async () => {
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

    await expect.poll(() => calledWith, { timeout: 10_000 }).toBe('CLIENT')
    await expect(page).toHaveURL(/\/onboarding\/client/, { timeout: 10_000 })
  })

  test('shows error message if set-role fails', async () => {
    await page.route('/api/me/set-role', route =>
      route.fulfill({ status: 500, json: { error: 'server error' } })
    )

    await page.goto('/onboarding/welcome')
    await page.getByText('נייליסטית').click()

    await expect(page.getByText('שגיאה — נסי שוב')).toBeVisible({ timeout: 10_000 })
  })

  test('no console errors on page load', async () => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    await page.goto('/onboarding/welcome')
    await page.waitForLoadState('networkidle')

    const critical = errors.filter(e =>
      !e.includes('favicon') && !e.includes('NEXT_PUBLIC') && !e.includes('maps.googleapis') && !e.includes('userway') && !e.includes('ERR_TUNNEL_CONNECTION_FAILED')
    )
    expect(critical, 'No console errors').toHaveLength(0)
  })
})
