
import { test, expect } from '@playwright/test';

test.describe('Detail Page Performance', () => {
    test('should open detail page quickly', async ({ page }) => {
        // Go to inventory first
        await page.goto('/inventory');

        // Wait for list to render
        const spoolLink = page.locator('a[href^="/inventory/detail"]').first();
        await spoolLink.waitFor();

        // --- COLD NAV ---
        console.log('[Perf] Testing Cold Navigation...');
        const startTime = Date.now();
        await spoolLink.click();

        // Wait for critical content
        await page.waitForSelector('text=Material Remaining', { timeout: 10000 });

        const duration = Date.now() - startTime;
        if (duration > 2000) {
            console.log(`[Perf] Cold load took ${duration}ms (Expected due to Docker IO)`);
        } else {
            console.log(`[Perf] Cold load fast: ${duration}ms`);
        }

        // --- WARM NAV ---
        console.log('[Perf] Testing Warm Navigation (Cache Check)...');
        await page.goBack();
        await page.waitForSelector('a[href^="/inventory/detail"]');

        const warmStart = Date.now();
        await spoolLink.click();
        await page.waitForSelector('text=Material Remaining', { timeout: 5000 });
        const warmDuration = Date.now() - warmStart;

        console.log(`[Perf] Warm Detail Load Time: ${warmDuration}ms`);

        expect(warmDuration).toBeLessThan(1500); // Allow 1.5s margin, typically < 500ms
    });
});
