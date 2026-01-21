import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for Insight 5.2 regression testing.
 *
 * Tests verify:
 * - Visual regression via screenshots
 * - Functional flows (calendar, tasks, notes, settings)
 * - No console errors after redesign
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run the desktop dev server before tests */
  webServer: {
    command: 'npm run dev:web --prefix apps/desktop',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Screenshot comparison settings */
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
    },
  },
})
