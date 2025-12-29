import { test, expect } from '@playwright/test';

/**
 * E2E Tests: API Endpoints
 * 
 * Tests the REST API for file storage operations
 */

test.describe('API Endpoints', () => {
    const baseURL = 'http://localhost:3000';

    test('GET /api/spools should return array of spools', async ({ request }) => {
        const response = await request.get(`${baseURL}/api/spools`);
        expect(response.ok()).toBeTruthy();

        const spools = await response.json();
        expect(Array.isArray(spools)).toBeTruthy();
    });

    test('POST /api/spools should create a new spool', async ({ request }) => {
        const newSpool = {
            serial: `TEST-${Date.now()}`,
            brand: 'Test Brand',
            type: 'PLA',
            color: 'Test Color',
            colorHex: '#ff0000',
            weightRemaining: 1000,
            weightTotal: 1000,
            diameter: 1.75,
        };

        const response = await request.post(`${baseURL}/api/spools`, {
            data: newSpool,
        });

        expect(response.ok()).toBeTruthy();
        const result = await response.json();
        expect(result.success).toBeTruthy();
        expect(result.filename).toBeTruthy();
    });

    test('GET /api/spools/[serial] should return specific spool', async ({ request }) => {
        // First create a spool
        const serial = `TEST-GET-${Date.now()}`;
        await request.post(`${baseURL}/api/spools`, {
            data: {
                serial,
                brand: 'Test',
                type: 'PLA',
                weightRemaining: 500,
                weightTotal: 1000,
                diameter: 1.75,
            },
        });

        // Wait for file system to write (increased delay for reliability)
        await new Promise(resolve => setTimeout(resolve, 500));

        // Now fetch it
        const response = await request.get(`${baseURL}/api/spools/${encodeURIComponent(serial)}`);
        expect(response.ok()).toBeTruthy();

        const spool = await response.json();
        expect(spool.serial).toBe(serial);
        expect(spool.brand).toBe('Test');
    });

    test('DELETE /api/spools/[serial] should remove a spool', async ({ request }) => {
        // Create a spool
        const serial = `TEST-DEL-${Date.now()}`;
        await request.post(`${baseURL}/api/spools`, {
            data: {
                serial,
                brand: 'To Delete',
                type: 'PLA',
                weightRemaining: 1000,
                weightTotal: 1000,
                diameter: 1.75,
            },
        });

        // Wait for file system to write
        await new Promise(resolve => setTimeout(resolve, 500));

        // Delete it
        const deleteResponse = await request.delete(`${baseURL}/api/spools/${encodeURIComponent(serial)}`);
        expect(deleteResponse.ok()).toBeTruthy();

        // Verify it's gone
        const getResponse = await request.get(`${baseURL}/api/spools/${encodeURIComponent(serial)}`);
        expect(getResponse.status()).toBe(404);
    });

    test('POST /api/spools should update existing spool', async ({ request }) => {
        const serial = `TEST-UPD-${Date.now()}`;

        // Create
        await request.post(`${baseURL}/api/spools`, {
            data: {
                serial,
                brand: 'Original Brand',
                type: 'PLA',
                weightRemaining: 1000,
                weightTotal: 1000,
                diameter: 1.75,
            },
        });

        // Wait for file system
        await new Promise(resolve => setTimeout(resolve, 500));

        // Update
        await request.post(`${baseURL}/api/spools`, {
            data: {
                serial,
                brand: 'Updated Brand',
                type: 'PETG',
                weightRemaining: 800,
                weightTotal: 1000,
                diameter: 1.75,
            },
        });

        // Wait for file system
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify update
        const response = await request.get(`${baseURL}/api/spools/${encodeURIComponent(serial)}`);
        const spool = await response.json();
        expect(spool.brand).toBe('Updated Brand');
        expect(spool.type).toBe('PETG');
        expect(spool.weightRemaining).toBe(800);
    });

    test('POST /api/spools should validate required fields', async ({ request }) => {
        // Missing serial
        const response1 = await request.post(`${baseURL}/api/spools`, {
            data: {
                brand: 'Test',
                type: 'PLA',
            },
        });
        expect(response1.status()).toBe(400);

        // Missing type
        const response2 = await request.post(`${baseURL}/api/spools`, {
            data: {
                serial: 'TEST-123',
                brand: 'Test',
            },
        });
        expect(response2.status()).toBe(400);
    });

    test('GET /api/spools/export should return ZIP file', async ({ request }) => {
        const response = await request.get(`${baseURL}/api/spools/export`);
        expect(response.ok()).toBeTruthy();

        const contentType = response.headers()['content-type'];
        expect(contentType).toContain('application/zip');
    });

    test('GET /api/scrape should accept URL parameter', async ({ request }) => {
        const testUrl = 'https://prusament.com/materials/prusament-pla-prusa-orange/';
        const response = await request.get(`${baseURL}/api/scrape`, {
            params: { url: testUrl },
            timeout: 15000, // Scraping might take time
        });

        // Should either succeed or fail gracefully
        if (response.ok()) {
            const data = await response.json();
            expect(data).toBeTruthy();
        } else {
            // Even on failure, should return proper error format
            expect(response.status()).toBeGreaterThanOrEqual(400);
        }
    });
});
