const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const WORKSPACE = '/home/leduchoang011/.openclaw/workspace/openclaw-avatar-mvp/public/screenshots';
  const TARGET_URL = 'http://localhost:3001';
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(TARGET_URL);
  await page.waitForTimeout(5000);

  // Open settings
  await page.locator('button').nth(0).click(); 
  await page.waitForTimeout(1000);

  // Toggle theme
  console.log("Clicking theme toggle row...");
  await page.locator('div').filter({ hasText: 'Appearance' }).nth(3).click();
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: `${WORKSPACE}/screenshot_lightmode.png` });

  await browser.close();
})();
