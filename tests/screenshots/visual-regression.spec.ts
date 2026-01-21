import { test, expect } from '@playwright/test'
import { waitForAppReady } from '../helpers'

/**
 * Visual regression tests for Insight 5.2
 *
 * Captures screenshots of each major view before/after redesign
 * to detect unintended visual changes.
 */

// Views accessible via rail buttons
const RAIL_VIEWS = [
  { name: 'calendar', label: 'Calendar' },
  { name: 'tasks', label: 'Tasks' },
  { name: 'notes', label: 'Notes' },
  { name: 'settings', label: 'Settings' },
] as const

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
  })

  for (const view of RAIL_VIEWS) {
    test(`${view.name} view screenshot`, async ({ page }) => {
      // Click rail button with aria-label or title
      await page.click(`button.railBtn[aria-label="${view.label}"], button.railBtn[title="${view.label}"]`)

      // Wait for view to load
      await page.waitForTimeout(500)

      // Take screenshot
      await expect(page).toHaveScreenshot(`${view.name}.png`, {
        fullPage: false,
        animations: 'disabled',
      })
    })
  }

  test('capture modal screenshot', async ({ page }) => {
    // Open capture modal
    await page.click('button.railBtn[aria-label="Capture"], button[title="Capture"]')
    await page.waitForTimeout(500)

    // Take screenshot of capture modal
    await expect(page).toHaveScreenshot('capture-modal.png', {
      fullPage: false,
      animations: 'disabled',
    })

    // Close the modal
    await page.keyboard.press('Escape')
  })

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForSelector('.wsPaneRoot', { timeout: 30000 })

    // Allow for React dev warnings but catch actual errors
    const realErrors = errors.filter(
      (e) =>
        !e.includes('Warning:') &&
        !e.includes('DevTools') &&
        !e.includes('Failed to load resource') // Network errors are expected in dev
    )

    expect(realErrors).toHaveLength(0)
  })
})
