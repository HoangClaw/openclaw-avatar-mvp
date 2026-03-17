const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = '/home/leduchoang011/.openclaw/workspace/openclaw-avatar-mvp/public/screenshots';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000); // Wait for animations/loading

  // 1. Main View
  console.log('Taking screenshot_main_light.png...');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'screenshot_main_light.png') });

  // 2. Settings View
  console.log('Opening Settings...');
  const settingsBtn = page.locator('button:has(svg.lucide-more-vertical), button:has(svg.lucide-settings)');
  if (await settingsBtn.isVisible()) {
    await settingsBtn.click();
    await page.waitForTimeout(1000);
    console.log('Taking screenshot_settings.png...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'screenshot_settings.png') });
    // Close settings if it's a modal by clicking escape or backdrop
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // 3. Chat View
  console.log('Opening Chat...');
  const chatBtn = page.getByRole('button', { name: /chat/i }).first();
  if (await chatBtn.isVisible()) {
    await chatBtn.click();
    await page.waitForTimeout(1000);
    console.log('Taking screenshot_chat.png...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'screenshot_chat.png') });
  }

  // 4. Fullscreen (maybe just hide UI or toggle)
  console.log('Taking screenshot_fullscreen.png...');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'screenshot_fullscreen.png'), fullPage: true });

  await browser.close();
  console.log('All screenshots retaken.');
})();
