const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
    console.log('Starting screenshot generation...');
    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        colorScheme: 'light' // Force light mode for standard screenshots
    });
    const page = await context.newPage();

    const targetDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    try {
        // 1. Dashboard
        console.log('Taking Dashboard screenshot...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000); // Wait for animations
        await page.screenshot({ path: path.join(targetDir, 'dashboard.png') });

        // 2. NFC Scan Page
        console.log('Taking Scan screenshot...');
        await page.goto('http://localhost:3000/scan', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(targetDir, 'nfc-scan.png') });

        // 3. Spool Detail Page (showing integrated dashboard)
        console.log('Taking Detail screenshot...');
        const serial = 'TEST-mjso5miz-NF2AM';
        await page.goto(`http://localhost:3000/inventory/detail?serial=${serial}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(targetDir, 'spool-detail.png') });

        // 4. Material Settings
        console.log('Taking Material Settings screenshot...');
        await page.goto('http://localhost:3000/settings/materials', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(targetDir, 'settings-materials.png') });

        console.log('Screenshots saved to ' + targetDir);

    } catch (err) {
        console.error('Error taking screenshots:', err);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
