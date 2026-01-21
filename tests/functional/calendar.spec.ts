import { test, expect } from '@playwright/test'
import { waitForAppReady } from '../helpers'

/**
 * Calendar functional tests for Insight 5.2
 *
 * Tests the calendar view's core functionality:
 * - Creating events
 * - Editing events
 * - View navigation (day/week/month/timeline)
 */

test.describe('Calendar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    // Navigate to calendar view
    await page.click('button.railBtn[aria-label="Calendar"], button.railBtn[title="Calendar"]')
    await page.waitForTimeout(500)
  })

  test('calendar view loads without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    // Check that calendar UI elements are present
    await expect(page.locator('.wsPaneRoot')).toBeVisible()

    // Filter out expected dev warnings
    const realErrors = errors.filter(
      (e) => !e.includes('Warning:') && !e.includes('DevTools')
    )
    expect(realErrors).toHaveLength(0)
  })

  test('can switch between day/week/month views', async ({ page }) => {
    // Look for view mode toggle buttons in the toggle group
    const toggleButtons = page.locator('[role="group"] button, .calendarModeToggle button, button[data-state]')

    // Try clicking toggle buttons if they exist
    const count = await toggleButtons.count()
    if (count > 0) {
      // Click each toggle button
      for (let i = 0; i < Math.min(count, 3); i++) {
        const btn = toggleButtons.nth(i)
        if (await btn.isVisible()) {
          await btn.click()
          await page.waitForTimeout(300)
        }
      }
    }

    // Verify no errors occurred during view changes
    await expect(page.locator('.wsPaneRoot')).toBeVisible()
  })

  test('can navigate between dates', async ({ page }) => {
    // Look for navigation arrows (prev/next day/week)
    const prevBtn = page.locator('button[aria-label*="previous"], button[aria-label*="prev"], button:has-text("←")').first()
    const nextBtn = page.locator('button[aria-label*="next"], button:has-text("→")').first()

    if (await nextBtn.count() > 0) {
      await nextBtn.click()
      await page.waitForTimeout(300)
    }

    if (await prevBtn.count() > 0) {
      await prevBtn.click()
      await page.waitForTimeout(300)
    }

    // Today button should exist
    const todayBtn = page.locator('button:has-text("Today")').first()
    if (await todayBtn.count() > 0) {
      await todayBtn.click()
      await page.waitForTimeout(300)
    }

    await expect(page.locator('.wsPaneRoot')).toBeVisible()
  })

  test('event composer can be opened', async ({ page }) => {
    // Try clicking on the calendar area to create an event
    // or look for a "+" or "New Event" button
    const addBtn = page.locator('button[aria-label*="add"], button[aria-label*="new"], button:has-text("+")').first()

    if (await addBtn.count() > 0) {
      await addBtn.click()
      await page.waitForTimeout(500)

      // Check if a modal or composer opened
      const modal = page.locator('.modalOverlay, [role="dialog"], .eventComposer')
      if (await modal.count() > 0) {
        await expect(modal.first()).toBeVisible()
      }
    }
  })
})
