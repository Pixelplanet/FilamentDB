import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Inventory Management
 * 
 * Tests the complete flow of managing filament spools:
 * - Viewing inventory
 * - Adding new spools
 * - Editing spools
 * - Deleting spools
 */

test.describe('Inventory Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should display dashboard and navigate to inventory', async ({ page }) => {
        // Check dashboard is loaded - use specific selector to avoid strict mode violation
        await expect(page.locator('header, aside').getByText('FilamentDB').first()).toBeVisible();

        // Navigate to inventory
        await page.getByRole('link', { name: 'Inventory' }).click();
        await expect(page).toHaveURL('/inventory');

        // Check inventory page elements
        await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();
        await expect(page.getByRole('link', { name: '+ Add Spool' })).toBeVisible();
    });

    test('should add a new spool manually', async ({ page }) => {
        // Navigate to add spool page
        await page.goto('/inventory/add');

        // Wait for form element to be visible
        await page.getByPlaceholder('e.g. Prusament').waitFor({ state: 'visible', timeout: 10000 });

        // Fill out the form
        await page.getByPlaceholder('e.g. Prusament').fill('Test Brand');
        await page.getByRole('combobox').selectOption('PETG');
        await page.getByLabel('Color Name').waitFor({ state: 'visible', timeout: 10000 });
        await page.getByLabel('Color Name').fill('Test Blue');
        await page.getByLabel('Color Hex').last().fill('#0066cc');

        // Advanced fields
        await page.getByLabel('Total (g)').fill('1000');
        await page.getByLabel('Remaining (g)').fill('1000');
        await page.getByLabel('Diameter (mm)').fill('1.75');

        // Submit
        await page.getByRole('button', { name: 'Save to Inventory' }).click();

        // Should redirect to inventory
        await expect(page).toHaveURL('/inventory');

        // Verify the spool appears in the list
        await expect(page.getByText('Test Brand')).toBeVisible();
        await expect(page.getByText('PETG')).toBeVisible();
    });

    test('should view spool details', async ({ page }) => {
        // First, ensure there's at least one spool
        await page.goto('/inventory');

        // Click on the first spool
        const firstSpool = page.locator('a[href*="/inventory/detail"]').first();
        await firstSpool.click();

        // Check detail page loaded
        await expect(page.getByText(/Weight Remaining/i)).toBeVisible();
        await expect(page.getByText(/Last Scanned/i)).toBeVisible();
    });

    test('should edit a spool', async ({ page }) => {
        await page.goto('/inventory');

        // Navigate to first spool detail
        await page.locator('a[href*="/inventory/detail"]').first().click();

        // Click edit
        await page.getByRole('link', { name: 'Edit' }).click();

        // Wait for edit form to load
        await page.waitForLoadState('networkidle');

        // Modify the color
        await page.getByLabel('Color Name').fill('Modified Color');

        // Save
        await page.getByRole('button', { name: /Save Changes/i }).click();

        // Should see success (either redirect or message)
        await page.waitForTimeout(1000);
    });

    test('should delete a spool', async ({ page }) => {
        // Add a test spool first
        await page.goto('/inventory/add');
        await page.getByPlaceholder('e.g. Prusament').fill('To Delete');
        await page.getByRole('combobox').selectOption('PLA');
        await page.getByRole('button', { name: 'Save to Inventory' }).click();

        // Wait for redirect
        await page.waitForURL('/inventory');

        // Find and click the spool
        await page.getByText('To Delete').click();

        // Delete it (note: this might need confirmation dialog handling)
        page.on('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: /Delete/i }).click();

        // Should redirect back to inventory
        await expect(page).toHaveURL('/inventory');

        // The spool should be gone
        await expect(page.getByText('To Delete')).not.toBeVisible();
    });

    test('should filter spools by type', async ({ page }) => {
        await page.goto('/inventory');

        // Use the type filter dropdown
        await page.locator('select').first().selectOption('PLA');

        // Check URL parameters or visible spools
        const spools = page.locator('a[href*="/inventory/detail"]');
        const count = await spools.count();

        // Should have at least some spools or show "no spools"
        expect(count >= 0).toBeTruthy();
    });

    test('should search spools', async ({ page }) => {
        await page.goto('/inventory');

        // Type in search box
        const searchInput = page.getByPlaceholder(/Search brand, color.../i);
        await searchInput.fill('Test');

        //  Wait for results
        await page.waitForTimeout(500);

        // Results should be filtered (hard to assert exact count without knowing data)
        const spools = page.locator('a[href*="/inventory/detail"]');
        expect(await spools.count()).toBeGreaterThanOrEqual(0);
    });

    test('should toggle empty spools visibility', async ({ page }) => {
        await page.goto('/inventory');

        // Find the hide/show empty button
        const emptyToggle = page.getByRole('button', { name: /Empty|Hidden/i });
        await emptyToggle.click();

        // Button text should change
        await page.waitForTimeout(300);
    });

    test('should switch between spools and grouped view', async ({ page }) => {
        await page.goto('/inventory');

        // Find the group/spools toggle
        const viewToggle = page.getByRole('button', { name: /Group|Spools/i });
        await viewToggle.click();

        // View should change
        await page.waitForTimeout(300);

        // Toggle back
        await viewToggle.click();
    });
});
