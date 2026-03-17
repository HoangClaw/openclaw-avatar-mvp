const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);
  
  console.log("Looking for Settings button...");
  
  // Try locating the button precisely by its inner SVG class or text
  const settingsBtn = await page.locator('button:has(svg.lucide-more-vertical)');
  
  const isVisible = await settingsBtn.isVisible();
  console.log("Settings Button Visible:", isVisible);
  
  if (isVisible) {
      await settingsBtn.click();
      console.log("Clicked Settings Button.");
      
      // Wait for the modal text to appear
      await page.waitForTimeout(1000);
      
      const modalText = await page.getByText('Gateway URL').isVisible();
      console.log("Modal Gateway URL text visible:", modalText);
  } else {
      console.log("Could not find Settings button.");
  }
  
  await page.screenshot({ path: '/home/leduchoang011/.openclaw/workspace/screenshot_debug.png' });
  await browser.close();
})();
