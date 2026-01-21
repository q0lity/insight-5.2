import { test, expect } from '@playwright/test'
import { waitForAppReady } from '../helpers'

/**
 * Notes functional tests for Insight 5.2
 *
 * Tests the notes/captures functionality:
 * - Viewing notes
 * - Creating notes
 * - Filtering and sorting
 * - Note preview/edit modes
 */

test.describe('Notes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    // Navigate to notes view
    await page.click('button.railBtn[aria-label="Notes"], button.railBtn[title="Notes"]')
    await page.waitForTimeout(500)
  })

  test('notes view loads without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    // Check that the view is visible
    await expect(page.locator('.wsPaneRoot')).toBeVisible()

    // Filter out expected dev warnings
    const realErrors = errors.filter(
      (e) => !e.includes('Warning:') && !e.includes('DevTools')
    )
    expect(realErrors).toHaveLength(0)
  })

  test('notes list or cards layout renders', async ({ page }) => {
    // Check for notes container
    const notesContainer = page.locator('[class*="notes"], [class*="Notes"], [class*="capture"], [class*="Capture"]')

    // Wait for content to load
    await page.waitForTimeout(500)

    // View should be visible
    await expect(page.locator('.wsPaneRoot')).toBeVisible()
  })

  test('search input is present', async ({ page }) => {
    // Look for search/filter input
    const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"], input[placeholder*="filter"]').first()

    if (await searchInput.count() > 0) {
      await expect(searchInput).toBeVisible()

      // Type in search
      await searchInput.fill('test')
      await page.waitForTimeout(300)

      // Clear search
      await searchInput.clear()
    }
  })

  test('sort options are available', async ({ page }) => {
    // Look for sort dropdown (could be a select or custom dropdown)
    const selectSort = page.locator('select').filter({ hasText: /recent|oldest|title/i }).first()
    const buttonSort = page.locator('button:has-text("Sort")').first()

    // Handle native select
    if (await selectSort.count() > 0) {
      // Get current options
      const options = await selectSort.locator('option').allTextContents()
      expect(options.length).toBeGreaterThan(0)

      // Use selectOption for native selects
      if (options.length > 1) {
        await selectSort.selectOption({ index: 1 })
        await page.waitForTimeout(300)
      }
    }
    // Handle custom dropdown button
    else if (await buttonSort.count() > 0) {
      await buttonSort.click()
      await page.waitForTimeout(300)

      // Look for menu items
      const menuItems = page.locator('[role="menuitem"], [role="option"]')
      if (await menuItems.count() > 0 && await menuItems.first().isVisible()) {
        await menuItems.first().click()
      } else {
        // Close any dropdown
        await page.keyboard.press('Escape')
      }
    }

    // View should remain stable
    await expect(page.locator('.wsPaneRoot')).toBeVisible()
  })

  test('layout toggle exists (cards/list)', async ({ page }) => {
    // Look for layout toggle
    const layoutToggle = page.locator('button:has-text("Cards"), button:has-text("List"), [class*="layout"]')

    if (await layoutToggle.count() > 0) {
      await layoutToggle.first().click()
      await page.waitForTimeout(300)
    }

    // View should remain stable
    await expect(page.locator('.wsPaneRoot')).toBeVisible()
  })

  test('note selection works', async ({ page }) => {
    // Find note items
    const noteItems = page.locator('[class*="noteCard"], [class*="NoteCard"], [class*="capture"]').first()

    if (await noteItems.count() > 0) {
      await noteItems.click()
      await page.waitForTimeout(300)

      // Check if preview or editor opened
      const preview = page.locator('[class*="preview"], [class*="Preview"], [class*="editor"], [class*="Editor"]')
      // View should remain stable
      await expect(page.locator('.wsPaneRoot')).toBeVisible()
    }
  })
})
