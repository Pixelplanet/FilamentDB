import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Testing Configuration
 * 
 * Tests the FilamentDB application including:
 * - File storage operations
 * - Inventory management
 * - API endpoints
 * - Scanner functionality
 * 
 * Note: If Docker containers are available, tests use port 3001 (user management disabled).
 * Otherwise, Playwright starts a local dev server.
 */
export default defineConfig({
    testDir: './e2e',

    /* Run tests in files in parallel */
    fullyParallel: true,

    /* Fail the build on CI if you accidentally left test.only in the source code */
    forbidOnly: !!process.env.CI,

    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,

    /* Opt out of parallel tests on CI */
    workers: process.env.CI ? 1 : undefined,

    /* Reporter to use */
    reporter: 'html',

    /* Test timeout - increased for file system operations */
    timeout: 60000, // 60 seconds per test

    /* Shared settings for all the projects below */
    use: {
        /* Base URL - uses port 3001 for Docker or 3000 for local dev */
        baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',

        /* Collect trace when retrying the failed test */
        trace: 'on-first-retry',

        /* Screenshot on failure */
        screenshot: 'only-on-failure',

        /* Action timeout - increased for slow operations */
        actionTimeout: 15000, // 15 seconds for clicks, fills, etc.
    },

    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    /* Start local dev server if TEST_BASE_URL is not set */
    webServer: process.env.TEST_BASE_URL ? undefined : {
        command: 'npx cross-env ENABLE_USER_MANAGEMENT=false npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120 * 1000,
    },
});
