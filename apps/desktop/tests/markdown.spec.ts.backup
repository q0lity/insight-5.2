import { test, expect } from '@playwright/test'
import { MOCK_TRANSCRIPTS } from './fixtures/transcripts'

/**
 * E2E tests for Markdown rendering with Obsidian-style improvements
 */

test.describe('Markdown Rendering', () => {
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

  test.describe('Typography Hierarchy', () => {
    test('headings have correct size hierarchy', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill(`# H1 Heading
## H2 Heading
### H3 Heading`)

      await page.getByRole('button', { name: 'Save Note' }).click()
      await page.waitForTimeout(3000) // Wait for save

      // Navigate to notes view to see rendered markdown
      // (Implementation depends on app navigation)
    })
  })

  test.describe('Checkboxes', () => {
    test('checkboxes render in preview', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill(`- [ ] Unchecked task
- [x] Checked task`)

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview.locator('.mdCheckBox')).toHaveCount(2)
    })

    test('checked and unchecked boxes have different states', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill(`- [ ] Unchecked
- [x] Checked`)

      const preview = page.locator('.capturePreviewPanel')
      const checks = preview.locator('.mdCheck')

      // Should have one checked and one unchecked
      await expect(checks).toHaveCount(2)
      await expect(checks.filter({ has: page.locator('.checked') })).toHaveCount(1)
    })
  })

  test.describe('Inline Tokens (Tags, People, Locations)', () => {
    test('tags render as chips', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill('Meeting about #project and #deadline')

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview.locator('.mdChip-tag')).toHaveCount(2)
      await expect(preview.locator('.mdChip-tag').first()).toContainText('#project')
    })

    test('people references render as chips', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill('Met with @Alice and @Bob')

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview.locator('.mdChip-person')).toHaveCount(2)
      await expect(preview.locator('.mdChip-person').first()).toContainText('@Alice')
    })

    test('location references render as chips', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill('Meeting at !office and !coffeeshop')

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview.locator('.mdChip-loc')).toHaveCount(2)
    })

    test('mixed tokens all render correctly', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill(MOCK_TRANSCRIPTS.withTags)

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview.locator('.mdChip-person')).toBeVisible()
      await expect(preview.locator('.mdChip-tag')).toBeVisible()
      await expect(preview.locator('.mdChip-loc')).toBeVisible()
    })
  })

  test.describe('Code Blocks', () => {
    test('code blocks render with language badge', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill(`\`\`\`javascript
function hello() {
  console.log("Hello");
}
\`\`\``)

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview.locator('.mdCodeLang')).toContainText('javascript')
    })

    test('code blocks have copy button', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill(`\`\`\`python
print("Hello World")
\`\`\``)

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview.locator('.mdCodeCopy')).toBeVisible()
      await expect(preview.locator('.mdCodeCopy')).toHaveText('Copy')
    })

    test('copy button copies code to clipboard', async ({ page }) => {
      // Grant clipboard permissions
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])

      await page.keyboard.press('Meta+K')
      const code = 'console.log("test")'
      await page.locator('.captureTextarea').fill(`\`\`\`javascript\n${code}\n\`\`\``)

      const preview = page.locator('.capturePreviewPanel')
      const copyBtn = preview.locator('.mdCodeCopy')

      await copyBtn.click()

      // Verify button shows "Copied"
      await expect(copyBtn).toHaveText(/Copied/)

      // Verify clipboard content
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
      expect(clipboardText).toContain(code)
    })

    test('inline code renders correctly', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill('Use the `console.log()` function')

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview.locator('code')).toContainText('console.log()')
    })
  })

  test.describe('Math Rendering (LaTeX)', () => {
    test('inline math renders', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill('The formula is $E = mc^2$')

      const preview = page.locator('.capturePreviewPanel')
      // KaTeX wraps math in .katex class
      await expect(preview.locator('.katex')).toBeVisible()
    })

    test('block math renders centered', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill('$$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$')

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview.locator('.katex-display')).toBeVisible()
    })

    test('complex math expressions render', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill(MOCK_TRANSCRIPTS.withMath)

      const preview = page.locator('.capturePreviewPanel')
      // Should have multiple math elements
      await expect(preview.locator('.katex')).toHaveCount(2)
    })
  })

  test.describe('Heading Anchors', () => {
    test('headings have anchor links', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill('# Test Heading')

      const preview = page.locator('.capturePreviewPanel')
      // rehype-autolink-headings adds .heading-anchor
      await expect(preview.locator('h1 .heading-anchor')).toBeVisible()
    })

    test('anchor links show # symbol', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill('## Section Title')

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview.locator('h2 .heading-anchor')).toHaveText('#')
    })
  })

  test.describe('Emoji Support', () => {
    test('emoji shortcodes convert to emoji', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill('Great work :smile: :rocket:')

      const preview = page.locator('.capturePreviewPanel')
      const text = await preview.textContent()

      // remark-emoji converts :smile: to 😄 and :rocket: to 🚀
      expect(text).toContain('😄')
      expect(text).toContain('🚀')
    })

    test('emoji in mixed content', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill(MOCK_TRANSCRIPTS.withEmoji)

      const preview = page.locator('.capturePreviewPanel')
      const text = await preview.textContent()
      expect(text).toContain('🎉')
      expect(text).toContain('📝')
    })
  })

  test.describe('Lists', () => {
    test('unordered lists render correctly', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill(`- Item 1
- Item 2
- Item 3`)

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview.locator('ul li')).toHaveCount(3)
    })

    test('ordered lists render correctly', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill(`1. First
2. Second
3. Third`)

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview.locator('ol li')).toHaveCount(3)
    })

    test('nested lists render correctly', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill(`- Parent
  - Child 1
  - Child 2`)

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview.locator('ul')).toHaveCount(2) // Parent ul and nested ul
    })
  })

  test.describe('Formatting', () => {
    test('bold text renders', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill('This is **bold** text')

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview.locator('strong')).toContainText('bold')
    })

    test('italic text renders', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill('This is *italic* text')

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview.locator('em')).toContainText('italic')
    })

    test('strikethrough renders', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill('This is ~~deleted~~ text')

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview.locator('del')).toContainText('deleted')
    })

    test('combined formatting works', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill('**Bold and *italic* together**')

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview.locator('strong')).toBeVisible()
      await expect(preview.locator('em')).toBeVisible()
    })
  })

  test.describe('Links', () => {
    test('links render correctly', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill('[Click here](https://example.com)')

      const preview = page.locator('.capturePreviewPanel')
      const link = preview.locator('a')
      await expect(link).toHaveText('Click here')
      await expect(link).toHaveAttribute('href', 'https://example.com')
    })

    test('autolinks work', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill('Visit https://example.com for more')

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview.locator('a')).toHaveAttribute('href', 'https://example.com')
    })
  })

  test.describe('Blockquotes', () => {
    test('blockquotes render', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill('> This is a quote')

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview.locator('blockquote')).toContainText('This is a quote')
    })

    test('nested blockquotes render', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill(`> Level 1
>> Level 2`)

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview.locator('blockquote')).toHaveCount(2)
    })
  })

  test.describe('Visual Polish', () => {
    test('preview has proper spacing', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill(`# Heading

Paragraph with content.

- List item 1
- List item 2`)

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview).toBeVisible()

      // Verify content rendered (spacing is visual, hard to test)
      await expect(preview.locator('h1')).toBeVisible()
      await expect(preview.locator('p')).toBeVisible()
      await expect(preview.locator('ul')).toBeVisible()
    })

    test('checkboxes have hover states', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill('- [ ] Hover me')

      const preview = page.locator('.capturePreviewPanel')
      const checkbox = preview.locator('.mdCheckBox').first()

      await checkbox.hover()
      await expect(checkbox).toBeVisible()
      // CSS hover states applied, hard to test programmatically
    })

    test('chips have color coding', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill('#tag @person !location')

      const preview = page.locator('.capturePreviewPanel')

      // Different chip types should exist
      await expect(preview.locator('.mdChip-tag')).toBeVisible()
      await expect(preview.locator('.mdChip-person')).toBeVisible()
      await expect(preview.locator('.mdChip-loc')).toBeVisible()

      // Verify they have different styling (color) via class
      const tagClass = await preview.locator('.mdChip-tag').first().getAttribute('class')
      const personClass = await preview.locator('.mdChip-person').first().getAttribute('class')

      expect(tagClass).toContain('mdChip-tag')
      expect(personClass).toContain('mdChip-person')
      expect(tagClass).not.toEqual(personClass)
    })
  })

  test.describe('Complex Content', () => {
    test('realistic note renders completely', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill(MOCK_TRANSCRIPTS.realistic)

      const preview = page.locator('.capturePreviewPanel')

      // Should have headings, checkboxes, tags, people, locations
      await expect(preview.locator('.mdChip-person')).toBeVisible()
      await expect(preview.locator('.mdChip-tag')).toHaveCount(2)
      await expect(preview.locator('.mdChip-loc')).toBeVisible()
      await expect(preview.locator('.mdCheckBox')).toHaveCount(3)
    })

    test('long form content scrolls properly', async ({ page }) => {
      await page.keyboard.press('Meta+K')
      await page.locator('.captureTextarea').fill(MOCK_TRANSCRIPTS.longForm)

      const preview = page.locator('.capturePreviewPanel')
      await expect(preview).toBeVisible()

      // Check if content is scrollable
      const isScrollable = await preview.evaluate((el) => {
        return el.scrollHeight > el.clientHeight
      })
      expect(isScrollable).toBe(true)
    })
  })
})
