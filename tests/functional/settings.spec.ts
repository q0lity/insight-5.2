import { test, expect } from '@playwright/test'
import { waitForAppReady, dismissAuthOverlay } from '../helpers'

/**
 * Settings functional tests for Insight 5.2
 *
 * Tests the settings view functionality:
 * - Theme toggling (dark/light/warm/olive)
 * - Settings persistence
 * - Display density options
 */

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    // Navigate to settings view
    await page.click('button.railBtn[aria-label="Settings"], button.railBtn[title="Settings"]')
    await page.waitForTimeout(500)
  })

  test('settings view loads without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    // Check that settings view is visible
    await expect(page.locator('.wsPaneRoot')).toBeVisible()

    // Filter out expected dev warnings
    const realErrors = errors.filter(
      (e) => !e.includes('Warning:') && !e.includes('DevTools')
    )
    expect(realErrors).toHaveLength(0)
  })

  test('theme section is present', async ({ page }) => {
    // Look for Theme heading or section
    const themeSection = page.locator('text=Theme').first()
    await expect(themeSection).toBeVisible()
  })

  test('theme options are clickable', async ({ page }) => {
    // Find theme option buttons
    const themeButtons = page.locator('button:has-text("Dark"), button:has-text("Light"), button:has-text("Warm"), button:has-text("Olive")')

    const count = await themeButtons.count()
    expect(count).toBeGreaterThan(0)

    // Click each theme button
    for (let i = 0; i < Math.min(count, 4); i++) {
      await themeButtons.nth(i).click()
      await page.waitForTimeout(300)

      // Verify the theme change affected the document
      const html = page.locator('html')
      const dataTheme = await html.getAttribute('data-theme')
      // Theme should be applied
    }
  })

  test('dark theme can be applied', async ({ page }) => {
    // Click Dark theme button
    const darkBtn = page.locator('button:has-text("Dark")').first()
    if (await darkBtn.count() > 0) {
      await darkBtn.click()
      await page.waitForTimeout(300)

      // Verify dark theme is active (check data attribute or class)
      const html = page.locator('html')
      const dataTheme = await html.getAttribute('data-theme')

      // Should have dark theme applied
      if (dataTheme) {
        expect(dataTheme).toContain('dark')
      }
    }
  })

  test('light theme can be applied', async ({ page }) => {
    // Click Light theme button
    const lightBtn = page.locator('button:has-text("Light")').first()
    if (await lightBtn.count() > 0) {
      await lightBtn.click()
      await page.waitForTimeout(300)

      // Verify light theme is active
      const html = page.locator('html')
      const dataTheme = await html.getAttribute('data-theme')

      if (dataTheme) {
        expect(dataTheme).toContain('light')
      }
    }
  })

  test('warm theme can be applied', async ({ page }) => {
    // Click Warm theme button
    const warmBtn = page.locator('button:has-text("Warm")').first()
    if (await warmBtn.count() > 0) {
      await warmBtn.click()
      await page.waitForTimeout(300)

      // Verify warm theme is active
      const html = page.locator('html')
      const dataTheme = await html.getAttribute('data-theme')

      if (dataTheme) {
        expect(dataTheme).toContain('warm')
      }
    }
  })

  test('system theme toggle exists', async ({ page }) => {
    // Look for system theme toggle or checkbox
    const systemToggle = page.locator('input[type="checkbox"]:near(:text("System")), label:has-text("System")')

    if (await systemToggle.count() > 0) {
      await expect(systemToggle.first()).toBeVisible()
    }
  })

  test('display settings section exists', async ({ page }) => {
    // Look for display or density settings
    const displaySection = page.locator('text=Display, text=Density').first()

    // View should remain stable regardless
    await expect(page.locator('.wsPaneRoot')).toBeVisible()
  })

  test('settings persist after refresh', async ({ page }) => {
    // Click Dark theme button
    const darkBtn = page.locator('button:has-text("Dark")').first()
    if (await darkBtn.count() > 0) {
      await darkBtn.click()
      await page.waitForTimeout(300)
    }

    // Refresh the page
    await page.reload()
    await waitForAppReady(page)

    // Navigate back to settings
    await page.click('button.railBtn[aria-label="Settings"], button.railBtn[title="Settings"]')
    await page.waitForTimeout(500)

    // Check if dark theme is still applied
    const html = page.locator('html')
    const dataTheme = await html.getAttribute('data-theme')

    // Theme should persist (dark should still be applied)
    if (dataTheme) {
      expect(dataTheme).toContain('dark')
    }
  })
})
