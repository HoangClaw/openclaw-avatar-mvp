const { chromium } = require('playwright');
(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const WORKSPACE = '/home/leduchoang011/.openclaw/workspace/openclaw-avatar-mvp/public/screenshots';
  const TARGET_URL = 'http://localhost:3001';

  await page.setViewportSize({ width: 1280, height: 800 });
  
  try {
    // 1. Main Dark
    console.log(`Navigating to ${TARGET_URL}...`);
    await page.goto(TARGET_URL, { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(5000);
    console.log("Taking screenshot_main_dark.png...");
    await page.screenshot({ path: `${WORKSPACE}/screenshot_main_dark.png` });

    // 2. Chat Experience
    console.log("Opening Chat...");
    // Look for keyboard icon button
    const chatBtn = page.locator('button:has(svg.lucide-keyboard)');
    await chatBtn.click();
    await page.waitForTimeout(1000);
    console.log("Taking screenshot_chat.png...");
    await page.screenshot({ path: `${WORKSPACE}/screenshot_chat.png` });

    // 3. Settings (Refresh to reset state)
    console.log("Resetting for Settings...");
    await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const settingsBtn = page.locator('button:has(svg.lucide-more-vertical)');
    await settingsBtn.click();
    await page.waitForTimeout(1000);
    console.log("Taking screenshot_settings.png...");
    await page.screenshot({ path: `${WORKSPACE}/screenshot_settings.png` });

    // 4. Light Mode
    console.log("Switching to Light Mode...");
    await page.getByText('Appearance').click();
    await page.waitForTimeout(1000);
    // Close settings to see main in light mode
    await page.locator('button:has(svg.lucide-x)').click();
    await page.waitForTimeout(1000);
    console.log("Taking screenshot_lightmode.png...");
    await page.screenshot({ path: `${WORKSPACE}/screenshot_lightmode.png` });

    console.log("All screenshots captured successfully.");
  } catch (err) {
    console.error("Error during snapshot:", err);
  } finally {
    await browser.close();
  }
})();
