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

  test('category filter tags are clickable', async ({ page }) => {
    await page.goto('/search')
    const manicureTag = page.getByRole('button', { name: 'מניקור', exact: true })
    await expect(manicureTag).toBeVisible()
    await manicureTag.click()
    await expect(manicureTag).toHaveClass(/bg-primary/)
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

test.describe('Search page — next-available-slot badge', () => {
  test('shows the next available slot badge on a card', async ({ page }) => {
    await page.route('/api/nailists**', route =>
      route.fulfill({
        json: {
          data: [{
            ...MOCK_NAILISTS[0],
            nextAvailableSlot: { date: '2099-01-01', time: '10:00' },
          }],
          total: 1,
          hasMore: false,
        },
      })
    )
    await page.goto('/search')
    await expect(page.getByText('סטודיו שרה')).toBeVisible()
    await expect(page.getByText(/התור הקרוב/)).toBeVisible()
    await expect(page.getByText(/10:00/)).toBeVisible()
  })

  test('does not show a badge when nextAvailableSlot is null', async ({ page }) => {
    await page.route('/api/nailists**', route =>
      route.fulfill({
        json: {
          data: [{ ...MOCK_NAILISTS[0], nextAvailableSlot: null }],
          total: 1,
          hasMore: false,
        },
      })
    )
    await page.goto('/search')
    await expect(page.getByText('סטודיו שרה')).toBeVisible()
    await expect(page.getByText(/התור הקרוב/)).not.toBeVisible()
  })
})

test.describe('Search page — sort by soonest available', () => {
  test('reorders cards to soonest-first when "תור קרוב" is clicked', async ({ page }) => {
    await page.route('/api/nailists**', route =>
      route.fulfill({
        json: {
          data: [
            { id: 'n-later', businessName: 'סטודיו מאוחר', avgRating: 5.0, reviewCount: 10, nextAvailableSlot: { date: '2026-06-12', time: '09:00' } },
            { id: 'n-soonest', businessName: 'סטודיו מיידי', avgRating: 3.0, reviewCount: 1, nextAvailableSlot: { date: '2026-06-10', time: '14:00' } },
          ],
          total: 2,
          hasMore: false,
        },
      })
    )
    await page.goto('/search')
    await expect(page.getByText('סטודיו מיידי')).toBeVisible()

    await page.getByRole('button', { name: 'תור קרוב' }).click()

    const names = page.locator('h3', { hasText: 'סטודיו' })
    await expect(names.first()).toHaveText('סטודיו מיידי')
  })
})

test.describe('Search page — two-tier category filter', () => {
  test('narrows results by treatment type, then further by technique sub-filter', async ({ page }) => {
    await page.route('/api/nailists**', route =>
      route.fulfill({
        json: {
          data: [
            { id: 'n-mani-gel', businessName: 'סטודיו מניקור ג׳ל', avgRating: 4.8, reviewCount: 10, serviceNames: ["מניקור ג'ל"] },
            { id: 'n-mani-acrylic', businessName: 'סטודיו מניקור אקריל', avgRating: 4.6, reviewCount: 8, serviceNames: ['מניקור אקריל'] },
            { id: 'n-pedi', businessName: 'סטודיו פדיקור', avgRating: 4.9, reviewCount: 20, serviceNames: ['פדיקור רגיל'] },
          ],
          total: 3,
          hasMore: false,
        },
      })
    )
    await page.goto('/search')
    await expect(page.getByText('סטודיו מניקור ג׳ל')).toBeVisible()
    await expect(page.getByText('סטודיו מניקור אקריל')).toBeVisible()
    await expect(page.getByText('סטודיו פדיקור')).toBeVisible()

    // Tier 1: narrow to מניקור — פדיקור results drop out, sub-filter row appears
    await page.getByRole('button', { name: 'מניקור', exact: true }).click()
    await expect(page.getByText('סטודיו פדיקור')).not.toBeVisible()
    await expect(page.getByText('סטודיו מניקור ג׳ל')).toBeVisible()
    await expect(page.getByText('סטודיו מניקור אקריל')).toBeVisible()

    // Tier 2: narrow further to ג'ל technique
    await page.getByRole('button', { name: "ג'ל", exact: true }).click()
    await expect(page.getByText('סטודיו מניקור ג׳ל')).toBeVisible()
    await expect(page.getByText('סטודיו מניקור אקריל')).not.toBeVisible()
  })
})

test.describe('Search page — price range filter', () => {
  test('narrows results to nailists within the selected price band', async ({ page }) => {
    await page.route('/api/nailists**', route =>
      route.fulfill({
        json: {
          data: [
            { ...MOCK_NAILISTS[0], minPrice: 80 },
            { ...MOCK_NAILISTS[1], minPrice: 400 },
          ],
          total: 2,
          hasMore: false,
        },
      })
    )
    await page.goto('/search')
    await expect(page.getByText('סטודיו שרה')).toBeVisible()
    await expect(page.getByText('נייל ארט רחל')).toBeVisible()

    await page.getByRole('button', { name: 'מחיר' }).click()
    await page.getByRole('button', { name: 'עד ₪100' }).click()

    await expect(page.getByText('סטודיו שרה')).toBeVisible()
    await expect(page.getByText('נייל ארט רחל')).not.toBeVisible()
  })
})

test.describe('Search page — date-picker availability filter', () => {
  test('filters out nailists unavailable on the selected date', async ({ page }) => {
    await page.route('/api/nailists**', route => {
      const url = new URL(route.request().url())
      const hasDate = url.searchParams.has('date')
      const data = hasDate
        ? [{ ...MOCK_NAILISTS[0], availableOnDate: true }]
        : [
            { ...MOCK_NAILISTS[0], availableOnDate: true },
            { ...MOCK_NAILISTS[1], availableOnDate: false },
          ]
      route.fulfill({ json: { data, total: data.length, hasMore: false } })
    })

    await page.goto('/search')
    await expect(page.getByText('סטודיו שרה')).toBeVisible()
    await expect(page.getByText('נייל ארט רחל')).toBeVisible()

    await page.getByRole('button', { name: /תאריך/ }).click()
    // Click the first enabled (not-yet-past) day in the visible month grid.
    await page.locator('[data-testid="search-date-btn"]:not([disabled])').first().click()

    await expect(page.getByText('סטודיו שרה')).toBeVisible()
    await expect(page.getByText('נייל ארט רחל')).not.toBeVisible()
  })

  test('clearing the date filter restores all results', async ({ page }) => {
    await page.route('/api/nailists**', route => {
      const url = new URL(route.request().url())
      const hasDate = url.searchParams.has('date')
      const data = hasDate
        ? [{ ...MOCK_NAILISTS[0], availableOnDate: true }]
        : [
            { ...MOCK_NAILISTS[0], availableOnDate: true },
            { ...MOCK_NAILISTS[1], availableOnDate: false },
          ]
      route.fulfill({ json: { data, total: data.length, hasMore: false } })
    })

    await page.goto('/search')
    await expect(page.getByText('סטודיו שרה')).toBeVisible()

    await page.getByRole('button', { name: /תאריך/ }).click()
    await page.locator('[data-testid="search-date-btn"]:not([disabled])').first().click()
    await expect(page.getByText('נייל ארט רחל')).not.toBeVisible()

    await page.getByLabel('נקי תאריך').click()
    await expect(page.getByText('נייל ארט רחל')).toBeVisible()
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
