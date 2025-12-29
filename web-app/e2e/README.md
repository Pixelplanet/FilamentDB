# E2E Testing with Playwright

This directory contains end-to-end tests for FilamentDB using Playwright.

## Test Coverage

### 1. Navigation Tests (`navigation.spec.ts`)
- Homepage loading
- Navigation between pages
- Mobile menu functionality
- Dashboard statistics
- Settings page sections
- API documentation link
- Theme toggle
- 404 handling

### 2. Inventory Management Tests (`inventory.spec.ts`)
- Viewing inventory
- Adding new spools manually
- Viewing spool details
- Editing spools
- Deleting spools
- Filtering by type
- Searching spools
- Toggling empty spools visibility
- Switching between list/grouped views

### 3. API Tests (`api.spec.ts`)
- GET /api/spools - List all spools
- POST /api/spools - Create/update spool
- GET /api/spools/[serial] - Get specific spool
- DELETE /api/spools/[serial] - Delete spool
- GET /api/spools/export - Export as ZIP
- GET /api/scrape - Web scraping
- Input validation
- Error handling

## Running Tests

### Prerequisites
- Docker running with FilamentDB container on port 3000
- Playwright browsers installed (`npx playwright install`)

### Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/inventory.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run with specific browser
npx playwright test --project=chromium

# View test report
npm run test:e2e:report

# Debug a test
npx playwright test --debug
```

## Test Configuration

See `playwright.config.ts` for configuration including:
- Test timeout settings
- Retry logic
- Screenshot/trace collection
- Browser configurations
- Base URL

## Writing New Tests

1. Create a new file in `e2e/` with `.spec.ts` extension
2. Import Playwright test utilities:
   ```typescript
   import { test, expect } from '@playwright/test';
   ```
3. Use `test.describe()` to group related tests
4. Write individual tests with `test('test name', async ({ page }) => { ... })`
5. Use `expect()` for assertions

## CI/CD Integration

The tests are configured to:
- Run in CI with `process.env.CI` check
- Retry failed tests automatically in CI
- Run sequentially in CI (workers: 1)
- Generate HTML reports

## Best Practices

1. **Use data-testid for stable selectors**
   ```typescript
   await page.getByTestId('submit-button').click();
   ```

2. **Wait for navigation properly**
   ```typescript
   await expect(page).toHaveURL('/expected-url');
   ```

3. **Handle dialogs**
   ```typescript
   page.on('dialog', dialog => dialog.accept());
   ```

4. **Clean up test data**
   - Delete test spools after tests
   - Use unique identifiers (timestamps)

5. **Test both happy and error paths**

## Debugging

- Use `await page.pause()` to pause execution
- Use `npx playwright test --debug` for step-by-step debugging
- Check `playwright-report/` for failure screenshots and traces

## Known Issues

- Scanner tests are limited (NFC/QR require physical devices)
- File upload tests may be flaky depending on system
- Web scraping tests depend on external websites

## Future Improvements

- [ ] Add visual regression testing
- [ ] Add performance testing
- [ ] Add accessibility testing (a11y)
- [ ] Test mobile app via Appium
- [ ] Add authentication tests (when implemented)
