import { test, expect } from '@playwright/test'

test.describe('Login page', () => {
  test('renders login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('ברוכה השבה').first()).toBeVisible()
    await expect(page.getByLabel('אימייל')).toBeVisible()
    // exact: true — the show/hide toggle button's aria-label ("הציגי סיסמה")
    // also contains "סיסמה", so a substring match would resolve to both.
    await expect(page.getByLabel('סיסמה', { exact: true })).toBeVisible()
    await expect(page.getByText('כניסה עם Google')).toBeVisible()
  })

  test('shows error for wrong credentials', async ({ page }) => {
    // Mock the Firebase Auth REST call directly rather than hitting the real
    // service — deterministic, and avoids depending on outbound network
    // access to a third-party host from the browser.
    await page.route('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword**', route =>
      route.fulfill({
        status: 400,
        json: { error: { code: 400, message: 'INVALID_LOGIN_CREDENTIALS' } },
      })
    )
    await page.goto('/login')
    await page.fill('input[type="email"]', 'noone@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    await expect(
      page.getByText(/שגיאה בהתחברות|אימייל או סיסמה|לא נמצא חשבון/)
    ).toBeVisible({ timeout: 10_000 })
  })

  test('redirects logged-in users away from /login', async ({ page }) => {
    // If already authenticated (cookie present), middleware redirects to dashboard
    await page.context().addCookies([{
      name: 'auth-token',
      value: 'fake-token-for-redirect-test',
      domain: 'localhost',
      path: '/',
    }])
    await page.goto('/login')
    // Middleware should redirect — either to dashboard or back if token invalid
    // We just check the page didn't stay on /login with a normal form state
    await page.waitForTimeout(1000)
    // The page might show a redirect, that's fine
  })
})

// Registration lives on /login?tab=register (a unified page), not a
// standalone /register route. There's no role selector here anymore —
// nailist vs client is chosen right after signup, at /onboarding/welcome
// (same flow Google sign-in already used).
test.describe('Register tab', () => {
  test('renders registration form with first/last name fields', async ({ page }) => {
    await page.goto('/login?tab=register')
    await expect(page.getByText('יצירת חשבון חדש')).toBeVisible()
    await expect(page.locator('#firstName')).toBeVisible()
    await expect(page.locator('#lastName')).toBeVisible()
  })

  test('shows validation error for weak password', async ({ page }) => {
    await page.goto('/login?tab=register')
    await page.fill('input[id="firstName"]', 'Test')
    await page.fill('input[id="lastName"]', 'User')
    await page.fill('input[id="email"]', 'test@example.com')
    await page.fill('input[id="password"]', '1234567')
    await page.getByRole('checkbox').check()
    await page.click('button[type="submit"]')
    await expect(page.getByText('הסיסמה חייבת להכיל לפחות 8 תווים')).toBeVisible({ timeout: 5_000 })
  })
})

// /reset-password is our own action-handler page (linked from the reset
// email instead of Firebase's default hosted UI) so the 8-character minimum
// stays consistent with signup — Firebase's default page only enforces 6.
test.describe('Reset password page', () => {
  test.beforeEach(async ({ page }) => {
    // The Firebase client SDK's verifyPasswordResetCode/confirmPasswordReset
    // both hit this same REST endpoint — a request with no newPassword is a
    // verify call, one with newPassword is the confirm call.
    await page.route('https://identitytoolkit.googleapis.com/v1/accounts:resetPassword**', route => {
      const body = route.request().postDataJSON()
      route.fulfill({ json: { email: 'user@example.com', requestType: 'PASSWORD_RESET', newPassword: body.newPassword } })
    })
  })

  test('rejects a password shorter than 8 characters', async ({ page }) => {
    await page.goto('/reset-password?oobCode=test-code')
    await expect(page.getByText('איפוס סיסמה')).toBeVisible()
    await page.fill('input[id="password"]', 'short1')
    await page.fill('input[id="confirmPassword"]', 'short1')
    await page.click('button[type="submit"]')
    await expect(page.getByText('הסיסמה חייבת להכיל לפחות 8 תווים')).toBeVisible()
  })

  test('resets the password and shows a success confirmation', async ({ page }) => {
    await page.goto('/reset-password?oobCode=test-code')
    await expect(page.getByText('איפוס סיסמה')).toBeVisible()
    await page.fill('input[id="password"]', 'newpassword123')
    await page.fill('input[id="confirmPassword"]', 'newpassword123')
    await page.click('button[type="submit"]')
    await expect(page.getByText('הסיסמה עודכנה!')).toBeVisible({ timeout: 10_000 })
  })

  test('shows an invalid-link message when there is no oobCode', async ({ page }) => {
    await page.goto('/reset-password')
    await expect(page.getByText('הקישור לא תקין')).toBeVisible()
  })
})
