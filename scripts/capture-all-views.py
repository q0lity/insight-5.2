#!/usr/bin/env python3
"""
Comprehensive screenshot capture for InSight 5 visual audit.
Clicks all navigation elements and tests all theme modes.
"""

import asyncio
import os
from playwright.async_api import async_playwright

DESKTOP_URL = "http://127.0.0.1:5174"
OUTPUT_DIR = "/Users/dg/Desktop/Insight4/Insight5/screenshots/audit"

async def dismiss_modals(page):
    """Dismiss any modals."""
    try:
        for selector in ["text=Not now", "text=Close", "[aria-label='Close']"]:
            el = page.locator(selector)
            if await el.count() > 0:
                await el.first.click()
                await asyncio.sleep(0.3)
    except:
        pass

async def capture_with_name(page, name):
    """Capture screenshot with given name."""
    path = f"{OUTPUT_DIR}/{name}.png"
    await page.screenshot(path=path, full_page=True)
    print(f"  ✓ {name}")
    return path

async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=2
        )
        page = await context.new_page()

        print("Loading app...")
        await page.goto(DESKTOP_URL, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)
        await dismiss_modals(page)

        # 1. CAPTURE DEFAULT VIEW
        print("\n=== Default View ===")
        await capture_with_name(page, "00-default-dashboard")

        # 2. LEFT RAIL ICONS (the vertical icon bar on far left)
        print("\n=== Left Rail Navigation ===")
        rail_icons = await page.locator(".rail button, .rail [role='button'], aside button").all()
        print(f"Found {len(rail_icons)} rail icons")

        for i, icon in enumerate(rail_icons[:15]):  # Limit to first 15
            try:
                await icon.click(timeout=3000)
                await asyncio.sleep(0.8)
                await dismiss_modals(page)
                await capture_with_name(page, f"rail-{i:02d}")
            except Exception as e:
                print(f"  ✗ rail-{i:02d}: {str(e)[:50]}")

        # 3. BOTTOM SHORTCUTS (Calendar, Notes, Chat, Settings)
        print("\n=== Bottom Shortcuts ===")
        shortcuts = [
            ("Calendar", "shortcut-calendar"),
            ("Notes", "shortcut-notes"),
            ("Chat", "shortcut-chat"),
            ("Settings", "shortcut-settings"),
        ]
        for text, name in shortcuts:
            try:
                btn = page.locator(f'button:has-text("{text}")').first
                if await btn.count() > 0:
                    await btn.click(timeout=5000)
                    await asyncio.sleep(0.8)
                    await dismiss_modals(page)
                    await capture_with_name(page, name)
            except Exception as e:
                print(f"  ✗ {name}: {str(e)[:50]}")

        # 4. THEME TESTING - Go to settings and try each theme
        print("\n=== Theme Testing ===")
        try:
            # Navigate to settings
            settings_btn = page.locator('button:has-text("Settings")').first
            await settings_btn.click(timeout=5000)
            await asyncio.sleep(1)

            # Find theme buttons
            themes = ["Dark", "Light", "Warm", "Olive"]
            for theme in themes:
                try:
                    theme_btn = page.locator(f'text="{theme}"').first
                    if await theme_btn.count() > 0:
                        await theme_btn.click()
                        await asyncio.sleep(0.5)

                        # Go back to dashboard to see theme effect
                        # Click first rail icon (usually dashboard)
                        first_rail = page.locator(".rail button").first
                        if await first_rail.count() > 0:
                            await first_rail.click()
                            await asyncio.sleep(0.5)

                        await capture_with_name(page, f"theme-{theme.lower()}-dashboard")

                        # Back to settings
                        await settings_btn.click()
                        await asyncio.sleep(0.5)
                except Exception as e:
                    print(f"  ✗ theme-{theme}: {str(e)[:50]}")
        except Exception as e:
            print(f"  ✗ Theme testing failed: {str(e)[:50]}")

        # 5. SIDEBAR SECTIONS (expand/collapse)
        print("\n=== Sidebar Sections ===")
        sections = ["PINNED", "TASKS", "HABITS", "TRACKERS", "SHORTCUTS", "RECENT NOTES", "POMODORO"]
        for section in sections:
            try:
                section_header = page.locator(f'text="{section}"').first
                if await section_header.count() > 0:
                    await section_header.click()
                    await asyncio.sleep(0.5)
                    await capture_with_name(page, f"section-{section.lower().replace(' ', '-')}")
            except Exception as e:
                print(f"  ✗ section-{section}: {str(e)[:50]}")

        # 6. TRY FAB BUTTON (floating action button)
        print("\n=== FAB Button ===")
        try:
            fab = page.locator('.fab, [class*="fab"], button[class*="floating"]').first
            if await fab.count() > 0:
                await fab.click()
                await asyncio.sleep(0.8)
                await capture_with_name(page, "fab-opened")
        except Exception as e:
            print(f"  ✗ FAB: {str(e)[:50]}")

        # 7. DETAILS PANEL - Try clicking an event/item to populate it
        print("\n=== Details Panel ===")
        try:
            # Look for any clickable items in main content
            items = page.locator('.event, .task, .item, [class*="card"]')
            if await items.count() > 0:
                await items.first.click()
                await asyncio.sleep(0.5)
                await capture_with_name(page, "details-panel-active")
        except Exception as e:
            print(f"  ✗ Details panel: {str(e)[:50]}")

        await browser.close()
        print("\n=== Complete ===")
        print(f"Screenshots saved to: {OUTPUT_DIR}")

if __name__ == "__main__":
    asyncio.run(main())
