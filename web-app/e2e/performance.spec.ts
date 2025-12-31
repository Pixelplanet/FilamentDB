
import { test, expect } from '@playwright/test';

test.describe('Frontend Performance Test', () => {
    test('should load inventory with pagination efficiently', async ({ page }) => {
        test.setTimeout(30000);

        const startTime = Date.now();

        // Listen for API response
        const apiResponsePromise = page.waitForResponse(response =>
            response.url().includes('/api/spools') && response.status() === 200
        );

        await page.goto('/inventory');

        // 2. Measure API Response Time
        const response = await apiResponsePromise;
        const apiTime = Date.now() - startTime;
        const buffer = await response.body();
        const responseSize = buffer.byteLength;

        console.log(`[Perf] API Response Time: ${apiTime}ms`);
        console.log(`[Perf] API Response Size: ${(responseSize / 1024).toFixed(2)} KB`);

        // 3. Measure Render Start (First spool card visible)
        // We target the anchor tag from the Link component
        const cardSelector = 'a[href^="/inventory/detail"]';

        await page.waitForSelector(cardSelector, { timeout: 10000 });
        const renderTime = Date.now() - startTime;
        console.log(`[Perf] Time to First Spool Render: ${renderTime}ms`);

        // 4. Measure Total Load (Pagination Check)
        // With pagination, we expect ~48 items, not 3000
        await page.waitForTimeout(1000);

        const cardCount = await page.locator(cardSelector).count();
        console.log(`[Perf] Page 1 Items Rendered: ${cardCount}`);

        expect(cardCount).toBeGreaterThan(0);
        expect(cardCount).toBeLessThan(100); // Should be paginated (48)

        // Optional: Test navigation to page 2
        const nextButton = page.locator('button[aria-label="Next Page"]');
        if (await nextButton.isVisible()) {
            const navStart = Date.now();
            await nextButton.click();
            await page.waitForTimeout(500); // Animations
            const navTime = Date.now() - navStart;
            console.log(`[Perf] Page 2 Navigation Time: ${navTime}ms`);
            const countP2 = await page.locator(cardSelector).count();
            expect(countP2).toBeGreaterThan(0);
        }
    });
});
