#!/usr/bin/env python3
"""
Interactive screenshot capture for InSight 5.
Clicks sidebar navigation items to capture each view.
"""

import asyncio
import os
from playwright.async_api import async_playwright

DESKTOP_URL = "http://127.0.0.1:5174"
OUTPUT_DIR = "/Users/dg/Desktop/Insight4/Insight5/screenshots/desktop"

# Navigation items to click (based on sidebar structure)
# These are the text labels visible in the sidebar
NAV_ITEMS = [
    # Main shortcuts at bottom of sidebar
    ("calendar", "Calendar"),
    ("notes", "Notes"),
    ("chat", "Chat"),
    ("settings", "Settings"),
]

# Additional views accessible via other means
SIDEBAR_SECTIONS = [
    # Clicking on section headers or items
    ("dashboard", None),  # Default view
    ("tasks", "TASKS"),
    ("habits", "HABITS"),
    ("trackers", "TRACKERS"),
]

async def dismiss_modals(page):
    """Dismiss any modals that appear."""
    try:
        not_now = page.locator("text=Not now")
        if await not_now.count() > 0:
            await not_now.first.click()
            await asyncio.sleep(0.5)
    except:
        pass

async def capture_desktop_interactive():
    """Capture screenshots by clicking sidebar navigation."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # Visible for debugging
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=2
        )
        page = await context.new_page()

        print("Loading app...")
        await page.goto(DESKTOP_URL, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)
        await dismiss_modals(page)

        # Capture initial dashboard view
        print("Capturing dashboard (initial view)...")
        await page.screenshot(path=f"{OUTPUT_DIR}/01-dashboard.png", full_page=True)

        # Try clicking on various navigation elements
        nav_attempts = [
            # Bottom nav shortcuts
            ("02-calendar", 'button:has-text("Calendar"), [role="button"]:has-text("Calendar")'),
            ("03-notes", 'button:has-text("Notes"), [role="button"]:has-text("Notes")'),
            ("04-chat", 'button:has-text("Chat"), [role="button"]:has-text("Chat")'),
            ("05-settings", 'button:has-text("Settings"), [role="button"]:has-text("Settings")'),

            # Sidebar section headers
            ("06-tasks", 'text=TASKS'),
            ("07-habits", 'text=HABITS'),
            ("08-trackers", 'text=TRACKERS'),
            ("09-shortcuts", 'text=SHORTCUTS'),

            # Individual tracker items
            ("10-mood", 'text=Mood'),
            ("11-energy", 'text=Energy'),

            # Reflections tab
            ("12-reflections", 'text=REFLECTIONS'),
            ("13-archive", 'text=ARCHIVE'),

            # Try clicking Reflect Now button
            ("14-reflect-now", 'button:has-text("REFLECT NOW")'),
        ]

        for name, selector in nav_attempts:
            try:
                print(f"Trying to click: {selector}")
                element = page.locator(selector).first
                if await element.count() > 0:
                    await element.click()
                    await asyncio.sleep(1)
                    await dismiss_modals(page)
                    await page.screenshot(path=f"{OUTPUT_DIR}/{name}.png", full_page=True)
                    print(f"  ✓ Captured {name}")
                else:
                    print(f"  ✗ Not found: {selector}")
            except Exception as e:
                print(f"  ✗ Error clicking {selector}: {e}")

        # Now let's explore by looking at all clickable elements
        print("\nFinding all buttons and clickable elements...")
        buttons = await page.locator('button, [role="button"], [onclick]').all()
        print(f"Found {len(buttons)} clickable elements")

        # Get the page HTML structure for analysis
        sidebar = page.locator('.sidebar, [class*="sidebar"], [class*="Sidebar"], nav')
        if await sidebar.count() > 0:
            print("\nSidebar structure found")

        await browser.close()
        print("\n=== Done ===")

async def main():
    await capture_desktop_interactive()

if __name__ == "__main__":
    asyncio.run(main())
