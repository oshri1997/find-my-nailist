import { defineConfig, devices } from '@playwright/test'

const remoteBaseUrl = process.env.PLAYWRIGHT_BASE_URL

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: remoteBaseUrl || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // A supplied base URL means the suite is validating a deployed environment.
  // Do not also boot a local server: it could use a different Firebase project.
  webServer: remoteBaseUrl ? undefined : {
    // In CI, run against a production build instead of the dev server:
    // dev mode compiles each route on-demand on its first request, and a
    // cold compile of a route no test has hit yet can exceed a test's
    // content-visibility timeout. A production build has every route
    // pre-compiled, so there's no per-route latency for any test to race.
    //
    // next.config has output: 'standalone', so `next start` doesn't work
    // (it warns and serves the app without static assets) — this mirrors
    // the Dockerfile's real production start: build, copy public/ and
    // .next/static next to the standalone server, then run that server
    // directly.
    command: process.env.CI
      ? 'npm run build && cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/ && node .next/standalone/server.js'
      : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
