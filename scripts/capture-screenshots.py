#!/usr/bin/env python3
"""
Screenshot capture script for InSight 5 visual audit.
Captures all desktop views for aesthetic analysis.
"""

import asyncio
import os
from playwright.async_api import async_playwright

# Desktop app routes to capture
DESKTOP_ROUTES = [
    ("dashboard", "/"),
    ("habits", "/habits"),
    ("goals", "/goals"),
    ("timeline", "/timeline"),
    ("tiimo-day", "/tiimo-day"),
    ("focus", "/focus"),
    ("reports", "/reports"),
    ("ecosystem", "/projects"),
    ("rewards", "/rewards"),
    ("health", "/health"),
    ("life-tracker", "/life-tracker"),
    ("settings", "/settings"),
    ("people", "/people"),
    ("places", "/places"),
    ("tags", "/tags"),
    ("notes", "/notes"),
    ("assistant", "/assistant"),
    ("agenda", "/agenda"),
    ("kanban", "/kanban"),
    ("planner", "/planner"),
    ("reflections", "/reflections"),
    ("tasks", "/tasks"),
]

DESKTOP_URL = "http://127.0.0.1:5174"
OUTPUT_DIR = "/Users/dg/Desktop/Insight4/Insight5/screenshots/desktop"

async def dismiss_modal(page):
    """Try to dismiss any modal that appears."""
    try:
        # Look for "Not now" button and click it
        not_now = page.locator("text=Not now")
        if await not_now.count() > 0:
            await not_now.click()
            await asyncio.sleep(0.5)
            return True

        # Also try clicking outside any modal
        close_buttons = page.locator('[aria-label="Close"], button:has-text("Close"), button:has-text("×")')
        if await close_buttons.count() > 0:
            await close_buttons.first.click()
            await asyncio.sleep(0.5)
            return True
    except:
        pass
    return False

async def capture_desktop_screenshots():
    """Capture screenshots of all desktop views."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=2  # Retina quality
        )
        page = await context.new_page()

        results = []

        for name, route in DESKTOP_ROUTES:
            url = f"{DESKTOP_URL}{route}"
            print(f"Capturing {name}... ({url})")

            try:
                await page.goto(url, wait_until="networkidle", timeout=15000)
                await asyncio.sleep(1)  # Wait for animations

                # Dismiss any modal that appears
                await dismiss_modal(page)
                await asyncio.sleep(0.3)

                screenshot_path = f"{OUTPUT_DIR}/{name}.png"
                await page.screenshot(path=screenshot_path, full_page=True)

                results.append({
                    "name": name,
                    "route": route,
                    "status": "success",
                    "path": screenshot_path
                })
                print(f"  ✓ Saved to {screenshot_path}")

            except Exception as e:
                results.append({
                    "name": name,
                    "route": route,
                    "status": "error",
                    "error": str(e)
                })
                print(f"  ✗ Error: {e}")

        await browser.close()

        # Summary
        success = len([r for r in results if r["status"] == "success"])
        print(f"\n=== Summary ===")
        print(f"Captured: {success}/{len(DESKTOP_ROUTES)} views")

        return results

if __name__ == "__main__":
    asyncio.run(capture_desktop_screenshots())
