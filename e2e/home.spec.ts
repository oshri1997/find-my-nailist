import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
  test('renders branding and hero', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    await page.goto('/')
    await expect(page.getByText('מצאי נייליסטית').first()).toBeVisible()
    await expect(page.locator('h1, h2').first()).toBeVisible()

    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('maps.googleapis') && !e.includes('NEXT_PUBLIC')
    )
    expect(criticalErrors, 'No console errors on home').toHaveLength(0)
  })

  test('navbar links are visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('navigation')).toBeVisible()
  })

  test('search / CTA button navigates to /search', async ({ page }) => {
    await page.goto('/')
    const cta = page.locator('a[href="/search"]').first()
    await expect(cta).toBeVisible()
    await cta.click()
    await expect(page).toHaveURL(/\/search/)
  })
})
