import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for Insight Desktop E2E tests
 * Targets web version at http://127.0.0.1:5174
 */
export default defineConfig({
  testDir: './tests',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: 'html',

  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://127.0.0.1:5174',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on retry
    video: 'retain-on-failure',

    // Timeout for each action
    actionTimeout: 30000,
  },

  // Timeout for each test
  timeout: 60000,

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Note: We mock the Web Speech API, so we don't actually need microphone permissions
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev:web',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
