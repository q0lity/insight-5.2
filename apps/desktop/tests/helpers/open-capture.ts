import { Page } from '@playwright/test'

/**
 * Opens the capture modal by dispatching a keyboard event directly to window
 * This works around Playwright's keyboard.press() not reliably triggering
 * window event listeners in the test environment.
 */
export async function openCaptureModal(page: Page) {
  await page.evaluate(() => {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      code: 'KeyK',
      keyCode: 75,
      which: 75,
      metaKey: true,
      ctrlKey: false,
      bubbles: true,
      cancelable: true,
      composed: true
    })
    window.dispatchEvent(event)
  })

  // Wait a moment for React state to update
  await page.waitForTimeout(100)
}

/**
 * Alternative: Opens capture modal via Ctrl+K (Windows/Linux)
 */
export async function openCaptureModalCtrl(page: Page) {
  await page.evaluate(() => {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      code: 'KeyK',
      keyCode: 75,
      which: 75,
      metaKey: false,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
      composed: true
    })
    window.dispatchEvent(event)
  })

  await page.waitForTimeout(100)
}

/**
 * Closes capture modal via Escape key
 */
export async function closeCaptureModal(page: Page) {
  await page.evaluate(() => {
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true,
      composed: true
    })
    window.dispatchEvent(event)
  })

  await page.waitForTimeout(100)
}
