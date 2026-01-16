import { test, expect } from '@playwright/test'
import { openCaptureModal } from './helpers/open-capture'

/**
 * Quick test to verify openCaptureModal helper works
 */

test.describe('Capture Modal - Quick Verification', () => {
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

  test('opens capture modal with dispatch helper', async ({ page }) => {
    // Use the custom helper that dispatches event to window
    await openCaptureModal(page)

    // Verify modal opened
    await expect(page.locator('.captureModalCard')).toBeVisible({ timeout: 2000 })
    await expect(page.locator('h2:has-text("Capture")')).toBeVisible()
  })

  test('can type text into textarea', async ({ page }) => {
    await openCaptureModal(page)

    const textarea = page.locator('.captureTextarea')
    await expect(textarea).toBeVisible()
    await expect(textarea).toBeFocused() // Should auto-focus

    await textarea.fill('Test note content')
    await expect(textarea).toHaveValue('Test note content')
  })

  test('save button disabled when empty', async ({ page }) => {
    await openCaptureModal(page)

    const saveBtn = page.getByRole('button', { name: /Save Note/ })
    await expect(saveBtn).toBeDisabled()
  })

  test('save button enabled when text exists', async ({ page }) => {
    await openCaptureModal(page)

    await page.locator('.captureTextarea').fill('My test note')

    const saveBtn = page.getByRole('button', { name: 'Save Note' })
    await expect(saveBtn).toBeEnabled()
  })
})
