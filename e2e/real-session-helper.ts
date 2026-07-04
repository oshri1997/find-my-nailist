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

// e2e-cleanup-test-data.mjs resets this account's Firestore docs after every
// run (see that script), so a login here can land on a brand-new,
// not-yet-onboarded nailist profile — OnboardingGuard would then redirect
// any "real backend, no mocks" dashboard/booking test away from the page
// it's trying to check. Most specs sidestep this by mocking
// /api/me/role + /api/me/nailist-profile, but the ones that deliberately
// don't (e.g. dashboard.spec.ts's "real auth, real data" block) need the
// account to actually be onboarded, so every login ensures that directly via
// the same endpoint the onboarding wizard's last step calls.
async function ensureNailistOnboarded(page: Page) {
  const profile = await page.evaluate(async () => {
    const res = await fetch('/api/me/nailist-profile')
    if (!res.ok) return null
    const { data } = await res.json()
    return data
  })
  if (!profile || profile.onboardingCompleted === true) return

  await page.evaluate(async (id: string) => {
    await fetch(`/api/nailists/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboardingCompleted: true, isActive: true }),
    })
  }, profile.id)
}

export async function loginAsRealUser(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const email = process.env.TEST_USER_EMAIL!
  const password = process.env.TEST_USER_PASSWORD!

  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('/login')
  await page.getByLabel('אימייל').fill(email)
  // exact: true — the password field's show/hide toggle button has an
  // aria-label containing "סיסמה" too ("הציגי סיסמה"), so a substring match
  // would resolve to both elements.
  await page.getByLabel('סיסמה', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'התחברי' }).click()

  const loggedIn = await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 }).then(() => true).catch(() => false)

  if (!loggedIn) {
    // Account doesn't exist yet — register through the real form (no role
    // picker there anymore) and pick NAILIST on the /onboarding/welcome
    // screen that follows, same flow every fresh signup goes through now.
    await page.goto('/login?tab=register')
    await page.locator('#firstName').fill('Demo')
    await page.locator('#lastName').fill('Nailist')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: /צרי חשבון|יוצרת חשבון/ }).click()
    await page.waitForURL(/\/onboarding\/welcome/, { timeout: 20_000 })
    await page.getByText('נייליסטית', { exact: true }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/onboarding/welcome'), { timeout: 20_000 })
  }

  await ensureNailistOnboarded(page)

  return { context, page }
}
