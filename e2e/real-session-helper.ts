import { Browser, BrowserContext, Page } from '@playwright/test'

/**
 * Real-session tests (dashboard/booking/onboarding/appointments-nailist) need
 * a genuine, live Firebase client-SDK session — useAuth().user only ever
 * populates from a real signed-in browser session, never from a spoofed
 * cookie. Playwright's `storageState` can snapshot cookies + IndexedDB from
 * one login and replay them into many fresh contexts, but that replay proved
 * unreliable for Firebase Auth's IndexedDB-backed persistence in CI — it
 * silently landed back on /login on some fresh contexts and not others.
 *
 * Signing in once per file and reusing the SAME live browser context for
 * every test in that file sidesteps the replay path entirely: the session
 * simply stays alive in memory for as long as the context lives.
 */

export function hasRealCreds() {
  return !!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD && process.env.NEXT_PUBLIC_FIREBASE_API_KEY)
}

export async function loginAsRealUser(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const email = process.env.TEST_USER_EMAIL!
  const password = process.env.TEST_USER_PASSWORD!

  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('/login')
  await page.getByLabel('אימייל').fill(email)
  await page.getByLabel('סיסמה').fill(password)
  await page.getByRole('button', { name: 'התחברי' }).click()

  const loggedIn = await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 }).then(() => true).catch(() => false)

  if (!loggedIn) {
    // Account doesn't exist yet — register it as a NAILIST through the real form.
    await page.goto('/login?tab=register')
    await page.getByRole('button', { name: 'נייליסטית', exact: true }).click()
    await page.locator('#name').fill('Demo Nailist')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: /הצטרפי כנייליסטית|יוצרת חשבון/ }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 })
  }

  return { context, page }
}
