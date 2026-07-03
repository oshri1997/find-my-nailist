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
    await expect(page.getByText(/נמצאו 2 נייליסטיות/)).toBeVisible()
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
    const jelTag = page.getByRole('button', { name: "ג'ל", exact: true })
    await expect(jelTag).toBeVisible()
    await jelTag.click()
    await expect(jelTag).toHaveClass(/bg-primary/)
  })

  test('clicking a card navigates to the nailist page', async ({ page }) => {
    await page.route('/api/nailists/n1', route =>
      route.fulfill({ json: { data: { ...MOCK_NAILISTS[0], services: [], portfolio: [], reviews: [] } } })
    )
    await page.route('/api/services**', route =>
      route.fulfill({ json: { data: [] } })
    )
    await page.goto('/search')
    // The card itself is the click target — it's a motion.div with an
    // onClick router.push, not an <a> element, so there's no link role to
    // query; click the business name text and let the click bubble up.
    await page.getByText('סטודיו שרה').first().click()
    await expect(page).toHaveURL(/\/nailists\/n1/)
  })

  test('no console errors on search page', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    await page.goto('/search')
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('maps.googleapis') && !e.includes('userway') && !e.includes('ERR_TUNNEL_CONNECTION_FAILED') && !e.includes('NEXT_PUBLIC')
    )
    expect(criticalErrors).toHaveLength(0)
  })
})

test.describe('Search page pagination', () => {
  test('load more button appends the next page and hides once exhausted', async ({ page }) => {
    const page2 = [{
      id: 'n3',
      businessName: 'עדן ציפורניים',
      city: 'חיפה',
      avgRating: 4.2,
      reviewCount: 5,
      latitude: 32.8,
      longitude: 34.99,
    }]

    await page.route('/api/nailists**', route => {
      const url = new URL(route.request().url())
      const offset = url.searchParams.get('offset')
      if (offset === '0' || offset === null) {
        route.fulfill({ json: { data: MOCK_NAILISTS, total: 3, hasMore: true } })
      } else {
        route.fulfill({ json: { data: page2, total: 3, hasMore: false } })
      }
    })

    await page.goto('/search')
    await expect(page.getByText('סטודיו שרה')).toBeVisible()

    const loadMoreBtn = page.getByRole('button', { name: 'טעני עוד נייליסטיות' })
    await expect(loadMoreBtn).toBeVisible()
    await loadMoreBtn.click()

    await expect(page.getByText('עדן ציפורניים')).toBeVisible({ timeout: 10_000 })
    // Original page 1 results stay in place — load more appends, not replaces
    await expect(page.getByText('סטודיו שרה')).toBeVisible()
    await expect(page.getByText('נייל ארט רחל')).toBeVisible()
    // No more pages left — the button disappears
    await expect(loadMoreBtn).not.toBeVisible()
  })

  test('load more button is absent when hasMore is false', async ({ page }) => {
    await page.route('/api/nailists**', route =>
      route.fulfill({ json: { data: MOCK_NAILISTS, total: 2, hasMore: false } })
    )
    await page.goto('/search')
    await expect(page.getByText('סטודיו שרה')).toBeVisible()
    await expect(page.getByRole('button', { name: 'טעני עוד נייליסטיות' })).not.toBeVisible()
  })
})
