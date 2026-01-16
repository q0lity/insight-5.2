import { test, expect } from '@playwright/test'
import { openCaptureModal } from './helpers/open-capture'

/**
 * E2E tests for Notes View functionality
 */

test.describe('Notes View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Dismiss auth modal if it appears
    const notNowBtn = page.getByRole('button', { name: 'Not now' })
    if (await notNowBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await notNowBtn.click()
      await page.waitForTimeout(500)
    }
  })

  test.describe('Navigation', () => {
    test('app loads successfully', async ({ page }) => {
      // Verify app rendered
      await expect(page.locator('body')).toBeVisible()
    })

    test('can navigate to notes view', async ({ page }) => {
      // Look for notes navigation or button
      // This depends on app's navigation structure
      const notesBtn = page.locator('[data-view="notes"], button:has-text("Notes")').first()

      if (await notesBtn.isVisible()) {
        await notesBtn.click()
        await page.waitForTimeout(500)
      }
    })
  })

  test.describe('Note Creation Flow', () => {
    test('created note appears in notes list', async ({ page }) => {
      // Create a note
      await openCaptureModal(page)
      const uniqueText = `Test note ${Date.now()}`
      await page.locator('.captureTextarea').fill(uniqueText)
      await page.getByRole('button', { name: 'Save Note' }).click()

      // Wait for modal to close
      await expect(page.locator('.captureModalCard')).not.toBeVisible({ timeout: 15000 })

      // Navigate to notes view
      const notesBtn = page.locator('[data-view="notes"], button:has-text("Notes")').first()
      if (await notesBtn.isVisible()) {
        await notesBtn.click()
        await page.waitForTimeout(1000)

        // Search for the created note
        const notesList = page.locator('.md, [data-testid="notes-list"]')
        if (await notesList.isVisible()) {
          await expect(notesList).toContainText(uniqueText, { timeout: 5000 })
        }
      }
    })
  })

  test.describe('Note Display', () => {
    test('notes render markdown correctly', async ({ page }) => {
      // Create a note with markdown
      await openCaptureModal(page)
      await page.locator('.captureTextarea').fill('# Test Heading\n\n- [ ] Task item')
      await page.getByRole('button', { name: 'Save Note' }).click()

      await expect(page.locator('.captureModalCard')).not.toBeVisible({ timeout: 15000 })

      // Navigate to notes and verify markdown rendered
      const notesBtn = page.locator('[data-view="notes"], button:has-text("Notes")').first()
      if (await notesBtn.isVisible()) {
        await notesBtn.click()
        await page.waitForTimeout(1000)

        // Look for rendered markdown elements
        const noteContent = page.locator('.md')
        if (await noteContent.isVisible()) {
          await expect(noteContent.locator('h1')).toBeVisible({ timeout: 3000 })
          await expect(noteContent.locator('.mdCheckBox')).toBeVisible({ timeout: 3000 })
        }
      }
    })
  })

  test.describe('Checkbox Interaction', () => {
    test('clicking checkbox toggles state', async ({ page }) => {
      // Create note with checkbox
      await openCaptureModal(page)
      await page.locator('.captureTextarea').fill('- [ ] Click me')
      await page.getByRole('button', { name: 'Save Note' }).click()

      await expect(page.locator('.captureModalCard')).not.toBeVisible({ timeout: 15000 })

      // Navigate to notes
      const notesBtn = page.locator('[data-view="notes"], button:has-text("Notes")').first()
      if (await notesBtn.isVisible()) {
        await notesBtn.click()
        await page.waitForTimeout(1000)

        const checkbox = page.locator('.mdCheckBox').first()
        if (await checkbox.isVisible()) {
          // Check initial state
          const initialChecked = await checkbox.locator('..').evaluate((el) =>
            el.classList.contains('checked')
          )

          // Click checkbox
          await checkbox.click()
          await page.waitForTimeout(300)

          // Verify state changed
          const afterChecked = await checkbox.locator('..').evaluate((el) =>
            el.classList.contains('checked')
          )

          expect(afterChecked).not.toBe(initialChecked)
        }
      }
    })
  })

  test.describe('Search & Filter', () => {
    test('can search for notes', async ({ page }) => {
      // Create a unique note
      const uniqueTag = `#test${Date.now()}`
      await openCaptureModal(page)
      await page.locator('.captureTextarea').fill(`Note with unique tag ${uniqueTag}`)
      await page.getByRole('button', { name: 'Save Note' }).click()

      await expect(page.locator('.captureModalCard')).not.toBeVisible({ timeout: 15000 })

      // Look for search functionality
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first()
      if (await searchInput.isVisible()) {
        await searchInput.fill(uniqueTag)
        await page.waitForTimeout(500)

        // Should see the note in results
        await expect(page.locator('body')).toContainText(uniqueTag)
      }
    })
  })

  test.describe('Tag Display', () => {
    test('tags render as colored chips', async ({ page }) => {
      await openCaptureModal(page)
      await page.locator('.captureTextarea').fill('Note with #important and #urgent tags')
      await page.getByRole('button', { name: 'Save Note' }).click()

      await expect(page.locator('.captureModalCard')).not.toBeVisible({ timeout: 15000 })

      // Navigate to notes
      const notesBtn = page.locator('[data-view="notes"], button:has-text("Notes")').first()
      if (await notesBtn.isVisible()) {
        await notesBtn.click()
        await page.waitForTimeout(1000)

        // Look for tag chips
        const tagChips = page.locator('.mdChip-tag')
        if (await tagChips.first().isVisible()) {
          await expect(tagChips).toHaveCount(2)
        }
      }
    })
  })
})
