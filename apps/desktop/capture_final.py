import asyncio
from playwright.async_api import async_playwright
import os

async def capture_screens():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})
        
        url = "http://127.0.0.1:5190/"
        try:
            await page.goto(url)
            await asyncio.sleep(10)
            
            views = ["Dashboard", "Calendar", "Tasks", "Notes", "Reflections", "Chat"]
            output_dir = "final_vibe_check"
            if not os.path.exists(output_dir): os.makedirs(output_dir)
            
            for view in views:
                selector = f"button[title='{view}']"
                if await page.query_selector(selector):
                    await page.click(selector)
                    await asyncio.sleep(3)
                    await page.screenshot(path=os.path.join(output_dir, f"{view.lower()}.png"))
            print("Final check complete.")
        except Exception as e: print(f"Error: {e}")
        finally: await browser.close()

if __name__ == "__main__": asyncio.run(capture_screens())
