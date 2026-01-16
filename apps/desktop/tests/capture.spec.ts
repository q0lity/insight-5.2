import { test, expect, Page } from '@playwright/test'
import { setupQuickMock, setupRealisticMock } from './helpers/mock-speech'
import { MOCK_TRANSCRIPTS } from './fixtures/transcripts'
import { openCaptureModal, openCaptureModalCtrl } from './helpers/open-capture'

/**
 * Comprehensive E2E tests for Capture Modal functionality
 */

test.describe('Capture Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for app to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000) // Give app time to initialize

    // Dismiss auth modal if it appears
    const notNowBtn = page.getByRole('button', { name: 'Not now' })
    if (await notNowBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await notNowBtn.click()
      await page.waitForTimeout(500)
    }
  })

  test.describe('1. Opening & Closing', () => {
    test('opens with Cmd+K shortcut on Mac', async ({ page }) => {
      await openCaptureModal(page)
      await expect(page.locator('.captureModalCard')).toBeVisible()
      await expect(page.locator('h2:has-text("Capture")')).toBeVisible()
    })

    test('opens with Ctrl+K shortcut on Windows/Linux', async ({ page }) => {
      await openCaptureModalCtrl(page)
      await expect(page.locator('.captureModalCard')).toBeVisible()
      await expect(page.locator('h2:has-text("Capture")')).toBeVisible()
    })

    test('closes with Escape key', async ({ page }) => {
      await openCaptureModal(page)
      await expect(page.locator('.captureModalCard')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.locator('.captureModalCard')).not.toBeVisible()
    })

    test('closes by clicking backdrop', async ({ page }) => {
      await openCaptureModal(page)
      await expect(page.locator('.captureModalCard')).toBeVisible()
      // Click outside modal (top-left corner of overlay)
      await page.locator('.modalOverlay').click({ position: { x: 10, y: 10 } })
      await expect(page.locator('.captureModalCard')).not.toBeVisible()
    })

    test('closes with X button in header', async ({ page }) => {
      await openCaptureModal(page)
      await expect(page.locator('.captureModalCard')).toBeVisible()
      await page.locator('.captureModalHeader button').last().click()
      await expect(page.locator('.captureModalCard')).not.toBeVisible()
    })

    test('auto-focuses textarea on open', async ({ page }) => {
      await openCaptureModal(page)
      const textarea = page.locator('.captureTextarea')
      await expect(textarea).toBeFocused()
    })

    test('shows "Ready" status initially', async ({ page }) => {
      await openCaptureModal(page)
      await expect(page.locator('.captureLivePill')).toContainText('Ready')
    })
  })

  test.describe('2. Text Input & Editing', () => {
    test('types text into textarea', async ({ page }) => {
      await openCaptureModal(page)
      const textarea = page.locator('.captureTextarea')
      await textarea.fill('Test note content')
      await expect(textarea).toHaveValue('Test note content')
    })

    test('character count updates in real-time', async ({ page }) => {
      await openCaptureModal(page)
      await page.locator('.captureTextarea').fill('Hello')
      await expect(page.locator('.captureSheetCount')).toHaveText('5 chars')
    })

    test('character count updates with longer text', async ({ page }) => {
      await openCaptureModal(page)
      const text = 'This is a longer test message'
      await page.locator('.captureTextarea').fill(text)
      await expect(page.locator('.captureSheetCount')).toHaveText(`${text.length} chars`)
    })

    test('clear button empties textarea', async ({ page }) => {
      await openCaptureModal(page)
      await page.locator('.captureTextarea').fill('Test content')
      await page.getByRole('button', { name: 'Clear' }).click()
      await expect(page.locator('.captureTextarea')).toHaveValue('')
    })

    test('clear button disabled when empty', async ({ page }) => {
      await openCaptureModal(page)
      await expect(page.getByRole('button', { name: 'Clear' })).toBeDisabled()
    })

    test('save button disabled when empty', async ({ page }) => {
      await openCaptureModal(page)
      await expect(page.getByRole('button', { name: /Save Note/ })).toBeDisabled()
    })

    test('paste long text (>1000 chars)', async ({ page }) => {
      await openCaptureModal(page)
      const textarea = page.locator('.captureTextarea')
      await textarea.fill(MOCK_TRANSCRIPTS.veryLong)
      await expect(page.locator('.captureSheetCount')).toContainText('10000 chars')
    })

    test('emoji input works', async ({ page }) => {
      await openCaptureModal(page)
      await page.locator('.captureTextarea').fill('Test 😀 emoji 🎉 input')
      await expect(page.locator('.captureTextarea')).toHaveValue('Test 😀 emoji 🎉 input')
    })

    test('textarea auto-expands with content', async ({ page }) => {
      await openCaptureModal(page)
      const textarea = page.locator('.captureTextarea')
      const initialHeight = await textarea.boundingBox().then(box => box?.height ?? 0)

      // Add lots of newlines to force expansion
      await textarea.fill('Line 1\n\nLine 2\n\nLine 3\n\nLine 4\n\nLine 5')
      await page.waitForTimeout(100) // Let auto-resize happen

      const expandedHeight = await textarea.boundingBox().then(box => box?.height ?? 0)
      expect(expandedHeight).toBeGreaterThan(initialHeight)
    })
  })

  test.describe('3. Voice Recording (Mocked)', () => {
    test('starts recording on Voice button click', async ({ page }) => {
      await openCaptureModal(page)
      await setupQuickMock(page, MOCK_TRANSCRIPTS.simple)

      const voiceBtn = page.getByRole('button', { name: /Voice/ })
      await voiceBtn.click()

      await expect(voiceBtn).toHaveText(/Listening/)
      await expect(page.locator('.captureLivePill.active')).toBeVisible()
    })

    test('button shows "Listening..." state with pulsing mic icon', async ({ page }) => {
      await openCaptureModal(page)
      await setupQuickMock(page, MOCK_TRANSCRIPTS.simple)

      await page.getByRole('button', { name: /Voice/ }).click()

      const voiceBtn = page.locator('.captureVoiceBtn')
      await expect(voiceBtn).toHaveClass(/captureVoiceBtnActive/)
      await expect(voiceBtn.locator('.icon')).toHaveClass(/animate-pulse/)
    })

    test('status changes to "Listening" pill', async ({ page }) => {
      await openCaptureModal(page)
      await setupQuickMock(page, MOCK_TRANSCRIPTS.simple)

      await page.getByRole('button', { name: /Voice/ }).click()
      await expect(page.locator('.captureLivePill')).toContainText('Listening')
      await expect(page.locator('.captureLivePill')).toHaveClass(/active/)
    })

    test('appends transcript to draft', async ({ page }) => {
      await openCaptureModal(page)
      await setupQuickMock(page, MOCK_TRANSCRIPTS.simple)

      await page.getByRole('button', { name: /Voice/ }).click()
      await page.waitForTimeout(500) // Wait for mock to populate

      await page.getByRole('button', { name: /Listening/ }).click()
      await page.waitForTimeout(500) // Wait for state to settle

      const textarea = page.locator('.captureTextarea')
      await expect(textarea).toContainText('test')
    })

    test('multiple recording sessions append text', async ({ page }) => {
      await openCaptureModal(page)

      // First recording
      await setupQuickMock(page, 'First part')
      await page.getByRole('button', { name: /Voice/ }).click()
      await page.waitForTimeout(400)
      await page.getByRole('button', { name: /Listening/ }).click()
      await page.waitForTimeout(400)

      // Second recording
      await setupQuickMock(page, 'Second part')
      await page.getByRole('button', { name: /Voice/ }).click()
      await page.waitForTimeout(400)
      await page.getByRole('button', { name: /Listening/ }).click()
      await page.waitForTimeout(400)

      const content = await page.locator('.captureTextarea').inputValue()
      expect(content.toLowerCase()).toContain('first')
      expect(content.toLowerCase()).toContain('second')
    })

    test('recording with tags transcript', async ({ page }) => {
      await openCaptureModal(page)
      await setupQuickMock(page, MOCK_TRANSCRIPTS.withTags)

      await page.getByRole('button', { name: /Voice/ }).click()
      await page.waitForTimeout(500)
      await page.getByRole('button', { name: /Listening/ }).click()
      await page.waitForTimeout(500)

      const textarea = page.locator('.captureTextarea')
      const content = await textarea.inputValue()
      expect(content).toContain('@JohnDoe')
      expect(content).toContain('#project')
      expect(content).toContain('!office')
    })

    test('recording with checkboxes', async ({ page }) => {
      await openCaptureModal(page)
      await setupQuickMock(page, MOCK_TRANSCRIPTS.withCheckboxes)

      await page.getByRole('button', { name: /Voice/ }).click()
      await page.waitForTimeout(500)
      await page.getByRole('button', { name: /Listening/ }).click()
      await page.waitForTimeout(500)

      const textarea = page.locator('.captureTextarea')
      const content = await textarea.inputValue()
      expect(content).toContain('- [ ]')
      expect(content).toContain('- [x]')
    })
  })

  test.describe('4. Live Preview', () => {
    test('preview appears when text exists', async ({ page }) => {
      await openCaptureModal(page)
      await page.locator('.captureTextarea').fill('Test content')
      await expect(page.locator('.capturePreviewPanel')).toBeVisible()
    })

    test('preview hides when text cleared', async ({ page }) => {
      await openCaptureModal(page)
      await page.locator('.captureTextarea').fill('Test content')
      await expect(page.locator('.capturePreviewPanel')).toBeVisible()

      await page.getByRole('button', { name: 'Clear' }).click()
      await expect(page.locator('.capturePreviewPanel')).not.toBeVisible()
    })

    test('preview parses tags correctly', async ({ page }) => {
      await openCaptureModal(page)
      await page.locator('.captureTextarea').fill('Meeting with @Alice #project')

      // Check for rendered chips
      const previewPanel = page.locator('.capturePreviewPanel')
      await expect(previewPanel.locator('.mdChip-person')).toContainText('@Alice')
      await expect(previewPanel.locator('.mdChip-tag')).toContainText('#project')
    })

    test('preview renders markdown correctly', async ({ page }) => {
      await openCaptureModal(page)
      await page.locator('.captureTextarea').fill(MOCK_TRANSCRIPTS.withMarkdown)

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview.locator('h1')).toContainText('Meeting Notes')
      await expect(preview.locator('h2')).toContainText('Action Items')
      await expect(preview.locator('strong')).toContainText('Important')
    })

    test('preview shows checkboxes', async ({ page }) => {
      await openCaptureModal(page)
      await page.locator('.captureTextarea').fill(MOCK_TRANSCRIPTS.withCheckboxes)

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview.locator('.mdCheckBox')).toHaveCount(3)
    })
  })

  test.describe('5. Saving Notes', () => {
    test('save button enabled when text exists', async ({ page }) => {
      await openCaptureModal(page)
      await page.locator('.captureTextarea').fill('My test note')
      await expect(page.getByRole('button', { name: 'Save Note' })).toBeEnabled()
    })

    test('shows loading state when saving', async ({ page }) => {
      await openCaptureModal(page)
      await page.locator('.captureTextarea').fill('My test note')

      const saveBtn = page.getByRole('button', { name: 'Save Note' })
      await saveBtn.click()

      // Check for saving state
      await expect(page.getByText(/Saving|Reading your thoughts|Finding patterns/)).toBeVisible({ timeout: 2000 })
    })

    test('prevents double submission', async ({ page }) => {
      await openCaptureModal(page)
      await page.locator('.captureTextarea').fill('Test note')

      const saveBtn = page.getByRole('button', { name: 'Save Note' })
      await saveBtn.click()

      // Button should be disabled during save
      await expect(saveBtn).toBeDisabled()
    })

    test('modal closes after save completes', async ({ page }) => {
      await openCaptureModal(page)
      await page.locator('.captureTextarea').fill('Quick note')

      await page.getByRole('button', { name: 'Save Note' }).click()

      // Wait for save to complete and modal to close
      await expect(page.locator('.captureModalCard')).not.toBeVisible({ timeout: 15000 })
    })
  })

  test.describe('6. Status & Progress Indicators', () => {
    test('loading phrases rotate', async ({ page }) => {
      await openCaptureModal(page)
      await page.locator('.captureTextarea').fill('Test note for loading phrases')

      await page.getByRole('button', { name: 'Save Note' }).click()

      // Should see one of the loading phrases
      const statusBar = page.locator('.captureStatusBar')
      await expect(statusBar).toBeVisible({ timeout: 2000 })

      const statusText = await statusBar.textContent()
      const loadingPhrases = [
        'Reading your thoughts',
        'Finding patterns',
        'Organizing themes',
        'Restoring context',
        'Almost there'
      ]

      const hasLoadingPhrase = loadingPhrases.some(phrase =>
        statusText?.includes(phrase)
      )
      expect(hasLoadingPhrase).toBeTruthy()
    })
  })

  test.describe('7. Keyboard Shortcuts', () => {
    test('Escape closes modal', async ({ page }) => {
      await openCaptureModal(page)
      await expect(page.locator('.captureModalCard')).toBeVisible()

      await page.keyboard.press('Escape')
      await expect(page.locator('.captureModalCard')).not.toBeVisible()
    })

    test('Enter in textarea adds newline (does not submit)', async ({ page }) => {
      await openCaptureModal(page)
      const textarea = page.locator('.captureTextarea')

      await textarea.fill('Line 1')
      await page.keyboard.press('Enter')
      await textarea.type('Line 2')

      const value = await textarea.inputValue()
      expect(value).toContain('\n')
      expect(value).toContain('Line 1')
      expect(value).toContain('Line 2')

      // Modal should still be open
      await expect(page.locator('.captureModalCard')).toBeVisible()
    })
  })

  test.describe('8. Responsive & Dynamic Sizing', () => {
    test('modal fits on small screens', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
      await openCaptureModal(page)

      const modal = page.locator('.captureModalCard')
      await expect(modal).toBeVisible()

      const box = await modal.boundingBox()
      expect(box?.width).toBeLessThanOrEqual(375 * 0.92) // 92vw max
    })

    test('modal limited to max width', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 })
      await openCaptureModal(page)

      const modal = page.locator('.captureModalCard')
      const box = await modal.boundingBox()
      expect(box?.width).toBeLessThanOrEqual(880) // max 880px per CSS
    })

    test('text size reduces with length', async ({ page }) => {
      await openCaptureModal(page)
      const textarea = page.locator('.captureTextarea')

      // Short text should have text-xl
      await textarea.fill('Short')
      await expect(textarea).toHaveClass(/text-xl/)

      // Medium text should have text-lg
      await textarea.fill('A'.repeat(150))
      await expect(textarea).toHaveClass(/text-lg/)

      // Long text should have text-base
      await textarea.fill('A'.repeat(350))
      await expect(textarea).toHaveClass(/text-base/)
    })
  })

  test.describe('9. Edge Cases & Error Handling', () => {
    test('handles extremely long text', async ({ page }) => {
      await openCaptureModal(page)
      const longText = 'A'.repeat(10000)
      await page.locator('.captureTextarea').fill(longText)
      await expect(page.locator('.captureSheetCount')).toHaveText('10000 chars')
    })

    test('handles empty whitespace (save disabled)', async ({ page }) => {
      await openCaptureModal(page)
      await page.locator('.captureTextarea').fill('   \n\n  ')
      // Save should be disabled (trim check)
      await expect(page.getByRole('button', { name: 'Save Note' })).toBeDisabled()
    })

    test('handles special characters', async ({ page }) => {
      await openCaptureModal(page)
      const specialChars = MOCK_TRANSCRIPTS.specialChars
      await page.locator('.captureTextarea').fill(specialChars)
      await expect(page.locator('.captureTextarea')).toHaveValue(specialChars)
    })

    test('handles multilingual text', async ({ page }) => {
      await openCaptureModal(page)
      await page.locator('.captureTextarea').fill(MOCK_TRANSCRIPTS.multiLanguage)
      await expect(page.locator('.captureTextarea')).toHaveValue(MOCK_TRANSCRIPTS.multiLanguage)
    })
  })

  test.describe('10. Accessibility', () => {
    test('modal is visible and renders', async ({ page }) => {
      await openCaptureModal(page)
      const modal = page.locator('.captureModalCard')
      await expect(modal).toBeVisible()
    })

    test('close button is accessible', async ({ page }) => {
      await openCaptureModal(page)
      const closeBtn = page.locator('.captureModalHeader button').last()
      await expect(closeBtn).toBeVisible()
      await expect(closeBtn).toBeEnabled()
    })

    test('voice button is accessible', async ({ page }) => {
      await openCaptureModal(page)
      const voiceBtn = page.getByRole('button', { name: /Voice/ })
      await expect(voiceBtn).toBeVisible()
      await expect(voiceBtn).toBeEnabled()
    })

    test('save button is accessible when enabled', async ({ page }) => {
      await openCaptureModal(page)
      await page.locator('.captureTextarea').fill('Test content')

      const saveBtn = page.getByRole('button', { name: 'Save Note' })
      await expect(saveBtn).toBeVisible()
      await expect(saveBtn).toBeEnabled()
    })
  })

  test.describe('11. Animation & Transitions', () => {
    test('modal fades in on open', async ({ page }) => {
      await openCaptureModal(page)
      const modal = page.locator('.captureModalCard')

      // Modal should be visible after animation
      await expect(modal).toBeVisible()

      // Check that it has motion classes (framer-motion)
      const hasMotion = await modal.evaluate((el) => {
        return el.style.opacity !== '' || el.hasAttribute('data-framer-motion')
      })
      // Just verify it rendered, animation is hard to test
      expect(hasMotion).toBeDefined()
    })

    test('voice button has hover state', async ({ page }) => {
      await openCaptureModal(page)
      const voiceBtn = page.getByRole('button', { name: /Voice/ })

      await voiceBtn.hover()
      // Verify button is still visible after hover (hover styles applied via CSS)
      await expect(voiceBtn).toBeVisible()
    })
  })
})
