import { Page } from '@playwright/test'

/**
 * Dismiss the auth overlay if present.
 * The app shows a "Sign in to sync" modal on first load.
 */
export async function dismissAuthOverlay(page: Page): Promise<void> {
  // Wait a bit for the auth overlay to potentially render
  await page.waitForTimeout(500)

  const authOverlay = page.locator('.authOverlay')

  // Try to dismiss the auth overlay with retries
  for (let i = 0; i < 3; i++) {
    if (await authOverlay.count() > 0) {
      const dismissBtn = page.locator('.authDismiss, button:has-text("Not now")')
      if (await dismissBtn.count() > 0) {
        await dismissBtn.click()
        await page.waitForTimeout(300)
        break
      }
    }
    await page.waitForTimeout(200)
  }
}

/**
 * Wait for the app to fully load and dismiss any blocking overlays.
 */
export async function waitForAppReady(page: Page): Promise<void> {
  await page.waitForSelector('.wsPaneRoot', { timeout: 30000 })
  await dismissAuthOverlay(page)
}
