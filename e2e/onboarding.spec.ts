import { test, expect } from '@playwright/test'

/**
 * E2E tests for the onboarding welcome page (/onboarding/welcome).
 *
 * Strategy: mock the auth + role APIs so the page renders without a real
 * Firebase session, then assert on visible UI and user interactions.
 */

test.describe('Onboarding welcome page', () => {
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

    await expect(page.getByText('בחרי סוג חשבון ✨')).toBeVisible()
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
    await expect.poll(() => calledWith).toBe('NAILIST')

    // Should redirect to the nailist onboarding flow
    await expect(page).toHaveURL(/\/onboarding(?!\/welcome)/, { timeout: 8_000 })
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

    await expect.poll(() => calledWith).toBe('CLIENT')
    await expect(page).toHaveURL(/\/onboarding\/client/, { timeout: 8_000 })
  })

  test('shows error message if set-role fails', async ({ page }) => {
    await page.route('/api/me/set-role', route =>
      route.fulfill({ status: 500, json: { error: 'server error' } })
    )

    await page.goto('/onboarding/welcome')
    await page.getByText('נייליסטית').click()

    await expect(page.getByText('שגיאה — נסי שוב')).toBeVisible({ timeout: 8_000 })
  })

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    await page.goto('/onboarding/welcome')

    const critical = errors.filter(e =>
      !e.includes('favicon') && !e.includes('NEXT_PUBLIC') && !e.includes('maps.googleapis')
    )
    expect(critical, 'No console errors').toHaveLength(0)
  })
})
