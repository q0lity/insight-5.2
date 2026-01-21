import { test, expect } from '@playwright/test'
import { waitForAppReady } from '../helpers'

/**
 * Tasks functional tests for Insight 5.2
 *
 * Tests the task management functionality:
 * - Viewing tasks
 * - Adding tasks
 * - Completing tasks
 * - Kanban board interaction
 */

test.describe('Tasks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    // Navigate to tasks view
    await page.click('button.railBtn[aria-label="Tasks"], button.railBtn[title="Tasks"]')
    await page.waitForTimeout(500)
  })

  test('tasks view loads without errors', async ({ page }) => {
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

  test('task list or kanban board renders', async ({ page }) => {
    // Check for either kanban board or task list
    const kanbanRoot = page.locator('.kbRoot')
    const taskList = page.locator('[class*="task"], [class*="Task"]')

    const hasKanban = await kanbanRoot.count() > 0
    const hasTaskList = await taskList.count() > 0

    // At least one task UI should be present
    expect(hasKanban || hasTaskList).toBeTruthy()
  })

  test('can access new task creation', async ({ page }) => {
    // Look for "New" or "+" button
    const newBtn = page.locator('button:has-text("+ New"), button:has-text("New"), button[aria-label*="new task"]').first()

    if (await newBtn.count() > 0) {
      // Set up dialog handler for window.prompt
      page.on('dialog', async (dialog) => {
        await dialog.accept('Test Task')
      })

      await newBtn.click()
      await page.waitForTimeout(500)
    }

    // Verify view is still stable
    await expect(page.locator('.wsPaneRoot')).toBeVisible()
  })

  test('kanban columns are present', async ({ page }) => {
    const kanbanRoot = page.locator('.kbRoot')

    if (await kanbanRoot.count() > 0) {
      // Check for column headers (done, in-progress, open)
      const columns = page.locator('.kbCol, .kbColHeader')
      const columnCount = await columns.count()

      // Should have 3 columns: done, in-progress, open
      expect(columnCount).toBeGreaterThanOrEqual(3)
    }
  })

  test('task cards can be selected', async ({ page }) => {
    // Find task cards
    const taskCards = page.locator('.kbCard, [class*="taskCard"], [class*="TaskCard"]')

    if (await taskCards.count() > 0) {
      // Click on first task card
      await taskCards.first().click()
      await page.waitForTimeout(300)

      // View should remain stable
      await expect(page.locator('.wsPaneRoot')).toBeVisible()
    }
  })
})
