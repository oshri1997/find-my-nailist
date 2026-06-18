import { test, expect } from '@playwright/test'

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
      route.fulfill({ json: { data: { ...MOCK_PROFILE, reviews: [] } } })
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

  test('clicking book opens booking modal', async ({ page }) => {
    await page.goto('/nailists/n1')
    const servicesTab = page.getByRole('button', { name: /שירותים/ })
    await servicesTab.click()
    const bookBtn = page.getByRole('button', { name: /קביעת תור/ }).first()
    await bookBtn.click()
    await expect(page.getByText('הזמנת תור')).toBeVisible()
  })

  test('booking modal — step 1 shows services', async ({ page }) => {
    await page.goto('/nailists/n1')
    await page.getByRole('button', { name: /שירותים/ }).click()
    await page.getByRole('button', { name: /קביעת תור/ }).first().click()

    await expect(page.getByText("מניקור ג'ל")).toBeVisible()
    await expect(page.getByText('פדיקור')).toBeVisible()
    await expect(page.getByRole('button', { name: /המשך/ })).toBeDisabled()
  })

  test('booking modal — selecting service enables continue', async ({ page }) => {
    await page.goto('/nailists/n1')
    await page.getByRole('button', { name: /שירותים/ }).click()
    await page.getByRole('button', { name: /קביעת תור/ }).first().click()

    await page.getByText("מניקור ג'ל").click()
    await expect(page.getByRole('button', { name: /המשך/ })).toBeEnabled()
  })

  test('booking modal — step 2 shows date picker', async ({ page }) => {
    await page.goto('/nailists/n1')
    await page.getByRole('button', { name: /שירותים/ }).click()
    await page.getByRole('button', { name: /קביעת תור/ }).first().click()
    await page.getByText("מניקור ג'ל").click()
    await page.getByRole('button', { name: /המשך/ }).click()

    await expect(page.getByText(/בחרי תאריך ושעה/)).toBeVisible()
    await expect(page.getByLabel('תאריך')).toBeVisible()
  })

  test('booking modal — selecting date shows time slots', async ({ page }) => {
    await page.goto('/nailists/n1')
    await page.getByRole('button', { name: /שירותים/ }).click()
    await page.getByRole('button', { name: /קביעת תור/ }).first().click()
    await page.getByText("מניקור ג'ל").click()
    await page.getByRole('button', { name: /המשך/ }).click()

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]
    await page.getByLabel('תאריך').fill(dateStr)

    await expect(page.getByText('08:00')).toBeVisible()
    await expect(page.getByText('09:00')).toBeVisible()
  })

  test('booking modal — step 3 shows confirmation summary', async ({ page }) => {
    await page.goto('/nailists/n1')
    await page.getByRole('button', { name: /שירותים/ }).click()
    await page.getByRole('button', { name: /קביעת תור/ }).first().click()
    await page.getByText("מניקור ג'ל").click()
    await page.getByRole('button', { name: /המשך/ }).click()

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await page.getByLabel('תאריך').fill(tomorrow.toISOString().split('T')[0])
    await page.getByText('08:00').click()
    await page.getByRole('button', { name: /המשך/ }).click()

    await expect(page.getByText('אישור הזמנה')).toBeVisible()
    await expect(page.getByText('₪150')).toBeVisible()
  })

  test('booking modal — shows auth error when not logged in', async ({ page }) => {
    await page.route('/api/me/client-profile', route =>
      route.fulfill({ status: 401, json: { error: 'Unauthorized' } })
    )

    await page.goto('/nailists/n1')
    await page.getByRole('button', { name: /שירותים/ }).click()
    await page.getByRole('button', { name: /קביעת תור/ }).first().click()
    await page.getByText("מניקור ג'ל").click()
    await page.getByRole('button', { name: /המשך/ }).click()

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await page.getByLabel('תאריך').fill(tomorrow.toISOString().split('T')[0])
    await page.getByText('08:00').click()
    await page.getByRole('button', { name: /המשך/ }).click()
    await page.getByRole('button', { name: /אישור הזמנה/ }).click()

    await expect(page.getByText(/יש להתחבר לחשבון/)).toBeVisible()
  })

  test('no console errors on nailist profile page', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    await page.goto('/nailists/n1')
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('maps.googleapis') && !e.includes('NEXT_PUBLIC')
    )
    expect(criticalErrors).toHaveLength(0)
  })
})
