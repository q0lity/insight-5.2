import asyncio
from playwright.async_api import async_playwright
import os

async def audit_modernization():
    async with async_playwright() as p:
        # High-res viewport for premium feels
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1600, 'height': 1000})
        
        url = "http://127.0.0.1:5190/"
        try:
            print(f"Navigating to {url}")
            await page.goto(url)
            await asyncio.sleep(8) # Initial load wait
            
            # Audit sequence
            audits = [
                {"name": "Dashboard", "click": "button[title='Dashboard']"},
                {"name": "Calendar", "click": "button[title='Calendar']"},
                {"name": "Tasks", "click": "button[title='Tasks']"},
                {"name": "Notes", "click": "button[title='Notes']"},
                {"name": "Reflections", "click": "button[title='Reflections']"},
                {"name": "Chat", "click": "button[title='Chat']"},
                {"name": "Habits", "click": "button[title='Habits']"},
                {"name": "Goals", "click": "button[title='Goals']"},
                {"name": "Projects", "click": "button[title='Projects']"},
                {"name": "Rewards", "click": "button[title='Rewards']"},
                {"name": "Reports", "click": "button[title='Reports']"},
                {"name": "Health", "click": "button[title='Health & Fitness']"},
                {"name": "People", "click": "button[title='People']"},
                {"name": "Places", "click": "button[title='Places']"},
                {"name": "Tags", "click": "button[title='Tags']"},
                {"name": "Timeline", "click": "button[title='Timeline']"}
            ]
            
            output_dir = "audit_results"
            if not os.path.exists(output_dir): os.makedirs(output_dir)
            
            for audit in audits:
                print(f"Auditing: {audit['name']}")
                btn = await page.query_selector(audit['click'])
                if btn:
                    await btn.click()
                    await asyncio.sleep(4) # Wait for renders/animations
                    await page.screenshot(path=os.path.join(output_dir, f"{audit['name'].lower()}.png"))
                else:
                    print(f"ERROR: Could not find button for {audit['name']}")
            
            # Special audit: Capture Modal
            print("Auditing: Capture Modal")
            await page.keyboard.press("Escape") # Close any open modal
            await asyncio.sleep(1)
            capture_btn = await page.query_selector("button[title='Capture']")
            if capture_btn:
                await capture_btn.click()
                await asyncio.sleep(2)
                await page.screenshot(path=os.path.join(output_dir, "capture_modal.png"))
            
            print("Audit complete.")
            
        except Exception as e:
            print(f"Audit failed: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(audit_modernization())
