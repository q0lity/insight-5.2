const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots2');

// Views to capture based on App.tsx navigation
const VIEWS = [
  { name: 'dashboard', selector: '[aria-label="Dashboard"]', title: 'Dashboard' },
  { name: 'calendar', selector: '[aria-label="Calendar"]', title: 'Calendar' },
  { name: 'tasks', selector: '[aria-label="Tasks"]', title: 'Tasks' },
  { name: 'notes', selector: '[aria-label="Notes"]', title: 'Notes' },
  { name: 'timeline', selector: '[title="Timeline"]', title: 'Timeline' },
  { name: 'habits', selector: '[title="Habits"]', title: 'Habits' },
  { name: 'goals', selector: '[title="Goals"]', title: 'Goals' },
  { name: 'ecosystem', selector: '[title="Ecosystem"]', title: 'Ecosystem' },
  { name: 'projects', selector: '[title="Projects"]', title: 'Projects' },
  { name: 'trackers', selector: '[title="Trackers"]', title: 'Trackers' },
  { name: 'rewards', selector: '[title="Rewards"]', title: 'Rewards' },
  { name: 'health', selector: '[title="Health"]', title: 'Health' },
  { name: 'settings', selector: '[title="Settings"]', title: 'Settings' },
];

async function run() {
  // Ensure screenshot directory exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log('Navigating to app...');
  await page.goto('http://127.0.0.1:5174', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Take initial screenshot
  console.log('Taking initial screenshot...');
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '00-initial.png'),
    fullPage: false
  });

  // Try to find and click each view
  for (let i = 0; i < VIEWS.length; i++) {
    const view = VIEWS[i];
    const filename = `${String(i + 1).padStart(2, '0')}-${view.name}.png`;

    try {
      // Try multiple selector strategies
      let clicked = false;

      // Strategy 1: aria-label or title selector
      const btn = page.locator(view.selector).first();
      if (await btn.count() > 0) {
        await btn.click();
        clicked = true;
      }

      // Strategy 2: Text content
      if (!clicked) {
        const textBtn = page.locator(`button:has-text("${view.title}")`).first();
        if (await textBtn.count() > 0) {
          await textBtn.click();
          clicked = true;
        }
      }

      // Strategy 3: Rail button with matching text
      if (!clicked) {
        const railBtn = page.locator(`.railBtn:has-text("${view.title}")`).first();
        if (await railBtn.count() > 0) {
          await railBtn.click();
          clicked = true;
        }
      }

      if (clicked) {
        await page.waitForTimeout(1000);
        console.log(`Screenshot: ${view.name}`);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, filename),
          fullPage: false
        });
      } else {
        console.log(`Could not find button for: ${view.name}`);
      }
    } catch (err) {
      console.log(`Error with ${view.name}: ${err.message}`);
    }
  }

  // Also try to capture any modals/overlays
  // Try capture modal
  try {
    const captureBtn = page.locator('[aria-label="Capture"], .captureBtn, button:has-text("Capture")').first();
    if (await captureBtn.count() > 0) {
      await captureBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '20-capture-modal.png'),
        fullPage: false
      });
      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  } catch (err) {
    console.log('Could not capture modal:', err.message);
  }

  console.log('\nDone! Screenshots saved to:', SCREENSHOT_DIR);
  await browser.close();
}

run().catch(console.error);
