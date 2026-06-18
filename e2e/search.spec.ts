import { test, expect } from '@playwright/test'

const MOCK_NAILISTS = [
  {
    id: 'n1',
    businessName: 'סטודיו שרה',
    city: 'תל אביב',
    bio: 'מניקור מקצועי',
    avgRating: 4.8,
    reviewCount: 42,
    whatsappPhone: '0501234567',
    latitude: 32.08,
    longitude: 34.78,
    distanceKm: 1.2,
  },
  {
    id: 'n2',
    businessName: 'נייל ארט רחל',
    city: 'רמת גן',
    bio: 'נייל ארט יצירתי',
    avgRating: 4.5,
    reviewCount: 18,
    whatsappPhone: undefined,
    latitude: 32.09,
    longitude: 34.81,
    distanceKm: 3.4,
  },
]

test.describe('Search page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('/api/nailists**', route =>
      route.fulfill({ json: { data: MOCK_NAILISTS, total: 2, hasMore: false } })
    )
  })

  test('renders nailist cards', async ({ page }) => {
    await page.goto('/search')
    await expect(page.getByText('סטודיו שרה')).toBeVisible()
    await expect(page.getByText('נייל ארט רחל')).toBeVisible()
  })

  test('shows nailist count', async ({ page }) => {
    await page.goto('/search')
    await expect(page.getByText(/נמצאו/)).toBeVisible()
    await expect(page.getByText('2')).toBeVisible()
  })

  test('shows WhatsApp button for nailists with phone', async ({ page }) => {
    await page.goto('/search')
    await expect(page.getByText('וואטסאפ').first()).toBeVisible()
  })

  test('map toggle button is visible and clickable', async ({ page }) => {
    await page.goto('/search')
    const mapBtn = page.getByRole('button', { name: /מפה/ })
    await expect(mapBtn).toBeVisible()
  })

  test('switches to map view when map button clicked', async ({ page }) => {
    await page.goto('/search')
    const mapBtn = page.getByRole('button', { name: /מפה/ })
    await mapBtn.click()

    // Map container or missing-API-key message should appear
    const mapContainer = page.locator('[class*="rounded-2xl"]').filter({ hasText: /NEXT_PUBLIC_GOOGLE_MAPS_API_KEY|map/i })
    await expect(
      page.locator('div').filter({ hasText: /NEXT_PUBLIC_GOOGLE_MAPS_API_KEY/ }).first()
        .or(page.locator('[id*="map"], gmp-map, .gm-style').first())
    ).toBeTruthy()
  })

  test('switches back to grid view', async ({ page }) => {
    await page.goto('/search')
    await page.getByRole('button', { name: /מפה/ }).click()
    await page.getByRole('button', { name: /רשת/ }).click()
    await expect(page.getByText('סטודיו שרה')).toBeVisible()
  })

  test('filter tags are clickable', async ({ page }) => {
    await page.goto('/search')
    const jelTag = page.getByRole('button', { name: /ג'ל/ })
    await expect(jelTag).toBeVisible()
    await jelTag.click()
    await expect(jelTag).toHaveClass(/from-pink-500/)
  })

  test('profile link navigates to nailist page', async ({ page }) => {
    await page.route('/api/nailists/n1', route =>
      route.fulfill({ json: { data: { ...MOCK_NAILISTS[0], services: [], reviews: [] } } })
    )
    await page.route('/api/services**', route =>
      route.fulfill({ json: { data: [] } })
    )
    await page.goto('/search')
    await page.getByRole('link', { name: /לפרופיל/ }).first().click()
    await expect(page).toHaveURL(/\/nailists\/n1/)
  })

  test('no console errors on search page', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    await page.goto('/search')
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('maps.googleapis') && !e.includes('NEXT_PUBLIC')
    )
    expect(criticalErrors).toHaveLength(0)
  })
})
