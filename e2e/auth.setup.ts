import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const authFile = path.join(__dirname, '.auth/user.json')

/**
 * Auth setup — signs in with a demo NAILIST user through the real login UI
 * and saves the resulting browser storage state (cookies + the Firebase
 * client SDK's IndexedDB session).
 *
 * Driving the actual form (rather than only setting the server session
 * cookie) matters: the app's dashboard/onboarding pages gate on
 * useAuth().user, which comes from the Firebase client SDK's own
 * onIdTokenChanged listener — a spoofed cookie alone never populates that,
 * only a real signed-in browser session does.
 *
 * Requires these env vars to be set:
 *   NEXT_PUBLIC_FIREBASE_API_KEY  — Firebase web API key
 *   TEST_USER_EMAIL               — test account email
 *   TEST_USER_PASSWORD            — test account password
 *
 * If the credentials are missing the file is written as empty so
 * authenticated tests will be skipped gracefully.
 */
setup('authenticate demo user', async ({ page }) => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD

  if (!apiKey || !email || !password) {
    console.warn('⚠️  TEST_USER_EMAIL / TEST_USER_PASSWORD / NEXT_PUBLIC_FIREBASE_API_KEY not set — saving empty auth state')
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }))
    return
  }

  await page.goto('/login')
  await page.getByLabel('אימייל').fill(email)
  await page.getByLabel('סיסמה').fill(password)
  await page.getByRole('button', { name: 'התחברי' }).click()

  const loggedIn = await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 10_000 }).then(() => true).catch(() => false)

  if (!loggedIn) {
    // Account doesn't exist yet — register it as a NAILIST through the real form.
    await page.goto('/login?tab=register')
    await page.getByRole('button', { name: 'נייליסטית', exact: true }).click()
    await page.locator('#name').fill('Demo Nailist')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: /הצטרפי כנייליסטית|יוצרת חשבון/ }).click()

    const registered = await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 }).then(() => true).catch(() => false)
    if (!registered) {
      console.error('❌ Could not sign in or register the e2e test account. Saving empty auth state.')
      fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }))
      return
    }
  }

  await expect.poll(async () => {
    return page.evaluate(() => document.cookie.includes('auth-token'))
  }, { timeout: 10_000 }).toBe(true)

  await page.context().storageState({ path: authFile })
  console.log('✅ Auth state saved to', authFile)
})
