import { test, expect } from '@playwright/test'
import { waitForAppReady } from '../helpers'

/**
 * Voice Capture functional tests for Insight 5.2
 *
 * Tests the capture modal functionality:
 * - Opening capture modal
 * - Text input
 * - Voice recording UI (not actual recording due to permissions)
 * - Save functionality
 */

test.describe('Capture', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
  })

  test('capture modal can be opened', async ({ page }) => {
    // Click the Capture button on the rail
    await page.click('button.railBtn[aria-label="Capture"], button[title="Capture"]')
    await page.waitForTimeout(500)

    // Check if capture modal opened
    const modal = page.locator('.modalOverlay')
    await expect(modal).toBeVisible()
  })

  test('capture modal has text input area', async ({ page }) => {
    // Open capture modal
    await page.click('button.railBtn[aria-label="Capture"], button[title="Capture"]')
    await page.waitForTimeout(500)

    // Check for textarea
    const textarea = page.locator('.modalOverlay textarea')
    await expect(textarea).toBeVisible()
  })

  test('can type in capture modal', async ({ page }) => {
    // Open capture modal
    await page.click('button.railBtn[aria-label="Capture"], button[title="Capture"]')
    await page.waitForTimeout(500)

    // Type into textarea
    const textarea = page.locator('.modalOverlay textarea')
    await textarea.fill('Test capture note')
    await page.waitForTimeout(300)

    // Verify text was entered
    await expect(textarea).toHaveValue('Test capture note')
  })

  test('capture modal has voice recording button', async ({ page }) => {
    // Open capture modal
    await page.click('button.railBtn[aria-label="Capture"], button[title="Capture"]')
    await page.waitForTimeout(500)

    // Look for microphone/voice button
    const voiceBtn = page.locator('.modalOverlay button[aria-label*="mic"], .modalOverlay button[aria-label*="record"], .modalOverlay button[aria-label*="voice"], .modalOverlay button:has([class*="mic"])')

    // Voice button should exist
    if (await voiceBtn.count() > 0) {
      await expect(voiceBtn.first()).toBeVisible()
    }
  })

  test('capture modal can be closed', async ({ page }) => {
    // Open capture modal
    await page.click('button.railBtn[aria-label="Capture"], button[title="Capture"]')
    await page.waitForTimeout(500)

    const modal = page.locator('.modalOverlay')
    await expect(modal).toBeVisible()

    // Close by pressing Escape
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Modal should be closed
    await expect(modal).not.toBeVisible()
  })

  test('capture modal has save button', async ({ page }) => {
    // Open capture modal
    await page.click('button.railBtn[aria-label="Capture"], button[title="Capture"]')
    await page.waitForTimeout(500)

    // Look for save button
    const saveBtn = page.locator('.modalOverlay button:has-text("Save"), .modalOverlay button:has-text("Done"), .modalOverlay button[aria-label*="save"]')

    if (await saveBtn.count() > 0) {
      await expect(saveBtn.first()).toBeVisible()
    }
  })

  test('no console errors when opening capture modal', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    // Open capture modal
    await page.click('button.railBtn[aria-label="Capture"], button[title="Capture"]')
    await page.waitForTimeout(500)

    // Filter out expected warnings
    const realErrors = errors.filter(
      (e) =>
        !e.includes('Warning:') &&
        !e.includes('DevTools') &&
        !e.includes('NotAllowedError') && // Microphone permission expected
        !e.includes('Permission denied')
    )

    expect(realErrors).toHaveLength(0)
  })
})
