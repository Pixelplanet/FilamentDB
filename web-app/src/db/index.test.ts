import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, Spool } from './index';

describe('FilamentDB Database', () => {
    // Clear database before each test to ensure isolation
    beforeEach(async () => {
        await db.spools.clear();
    });

    // Clean up after all tests
    afterEach(async () => {
        await db.spools.clear();
    });

    describe('CRUD Operations', () => {
        it('should add a new spool', async () => {
            const spool: Omit<Spool, 'id'> = {
                serial: 'TEST-001',
                brand: 'Test Brand',
                type: 'PLA',
                color: 'Red',
                colorHex: '#ff0000',
                weightRemaining: 1000,
                weightTotal: 1000,
                diameter: 1.75,
                lastScanned: Date.now()
            };

            const id = await db.spools.add(spool);
            expect(id).toBeDefined();
            expect(typeof id).toBe('number');

            const retrieved = await db.spools.get(id);
            expect(retrieved).toBeDefined();
            expect(retrieved?.brand).toBe('Test Brand');
            expect(retrieved?.type).toBe('PLA');
            expect(retrieved?.color).toBe('Red');
            expect(retrieved?.weightRemaining).toBe(1000);
        });

        it('should update spool weight', async () => {
            const id = await db.spools.add({
                serial: 'TEST-002',
                brand: 'Test',
                type: 'PETG',
                color: 'Blue',
                weightRemaining: 1000,
                weightTotal: 1000,
                diameter: 1.75
            });

            await db.spools.update(id, { weightRemaining: 500 });

            const updated = await db.spools.get(id);
            expect(updated?.weightRemaining).toBe(500);
            expect(updated?.weightTotal).toBe(1000); // Should remain unchanged
        });

        it('should update multiple fields at once', async () => {
            const id = await db.spools.add({
                serial: 'TEST-003',
                brand: 'Old Brand',
                type: 'PLA',
                color: 'Red',
                weightRemaining: 1000,
                weightTotal: 1000,
                diameter: 1.75
            });

            await db.spools.update(id, {
                brand: 'New Brand',
                weightRemaining: 750,
                color: 'Blue',
                colorHex: '#0000ff'
            });

            const updated = await db.spools.get(id);
            expect(updated?.brand).toBe('New Brand');
            expect(updated?.weightRemaining).toBe(750);
            expect(updated?.color).toBe('Blue');
            expect(updated?.colorHex).toBe('#0000ff');
        });

        it('should delete a spool', async () => {
            const id = await db.spools.add({
                serial: 'TEST-004',
                brand: 'Test',
                type: 'TPU',
                color: 'Clear',
                weightRemaining: 500,
                weightTotal: 500,
                diameter: 1.75
            });

            expect(await db.spools.get(id)).toBeDefined();

            await db.spools.delete(id);

            const deleted = await db.spools.get(id);
            expect(deleted).toBeUndefined();
        });

        it('should bulk add multiple spools', async () => {
            const spools: Omit<Spool, 'id'>[] = [
                {
                    serial: 'BULK-001',
                    brand: 'Brand A',
                    type: 'PLA',
                    color: 'Red',
                    weightRemaining: 1000,
                    weightTotal: 1000,
                    diameter: 1.75
                },
                {
                    serial: 'BULK-002',
                    brand: 'Brand B',
                    type: 'PETG',
                    color: 'Blue',
                    weightRemaining: 800,
                    weightTotal: 1000,
                    diameter: 1.75
                },
                {
                    serial: 'BULK-003',
                    brand: 'Brand C',
                    type: 'ABS',
                    color: 'Black',
                    weightRemaining: 500,
                    weightTotal: 1000,
                    diameter: 2.85
                }
            ];

            await db.spools.bulkAdd(spools);

            const count = await db.spools.count();
            expect(count).toBe(3);

            const all = await db.spools.toArray();
            expect(all).toHaveLength(3);
        });

        it('should bulk delete spools', async () => {
            const id1 = await db.spools.add({
                serial: 'DEL-001',
                brand: 'Test',
                type: 'PLA',
                color: 'Red',
                weightRemaining: 1000,
                weightTotal: 1000,
                diameter: 1.75
            });

            const id2 = await db.spools.add({
                serial: 'DEL-002',
                brand: 'Test',
                type: 'PETG',
                color: 'Blue',
                weightRemaining: 1000,
                weightTotal: 1000,
                diameter: 1.75
            });

            await db.spools.bulkDelete([id1, id2]);

            const count = await db.spools.count();
            expect(count).toBe(0);
        });
    });

    describe('Querying', () => {
        beforeEach(async () => {
            // Add test data
            await db.spools.bulkAdd([
                {
                    serial: 'Q-001',
                    brand: 'Prusament',
                    type: 'PLA',
                    color: 'Galaxy Black',
                    colorHex: '#1a1a1a',
                    weightRemaining: 850,
                    weightTotal: 1000,
                    diameter: 1.75,
                    lastScanned: Date.now() - 1000
                },
                {
                    serial: 'Q-002',
                    brand: 'Prusament',
                    type: 'PETG',
                    color: 'Prusa Orange',
                    colorHex: '#ff8800',
                    weightRemaining: 120,
                    weightTotal: 1000,
                    diameter: 1.75,
                    lastScanned: Date.now() - 2000
                },
                {
                    serial: 'Q-003',
                    brand: 'Bambu Lab',
                    type: 'PLA',
                    color: 'Matte White',
                    colorHex: '#ffffff',
                    weightRemaining: 980,
                    weightTotal: 1000,
                    diameter: 1.75,
                    lastScanned: Date.now() - 3000
                },
                {
                    serial: 'Q-004',
                    brand: 'eSun',
                    type: 'TPU',
                    color: 'Clear',
                    weightRemaining: 400,
                    weightTotal: 500,
                    diameter: 1.75,
                    lastScanned: Date.now()
                }
            ]);
        });

        it('should find spools by type', async () => {
            const plaSpools = await db.spools.where('type').equals('PLA').toArray();
            expect(plaSpools).toHaveLength(2);
            expect(plaSpools.every(s => s.type === 'PLA')).toBe(true);
        });

        it('should find spools by brand', async () => {
            const prusaSpools = await db.spools.where('brand').equals('Prusament').toArray();
            expect(prusaSpools).toHaveLength(2);
            expect(prusaSpools.every(s => s.brand === 'Prusament')).toBe(true);
        });

        it('should find spool by serial', async () => {
            const spool = await db.spools.where('serial').equals('Q-003').first();
            expect(spool).toBeDefined();
            expect(spool?.brand).toBe('Bambu Lab');
            expect(spool?.type).toBe('PLA');
        });

        it('should filter low stock spools', async () => {
            const lowStock = await db.spools.filter(s => s.weightRemaining < 200).toArray();
            expect(lowStock).toHaveLength(1);
            expect(lowStock[0].serial).toBe('Q-002');
            expect(lowStock[0].weightRemaining).toBe(120);
        });

        it('should get total count', async () => {
            const count = await db.spools.count();
            expect(count).toBe(4);
        });

        it('should get all spools', async () => {
            const all = await db.spools.toArray();
            expect(all).toHaveLength(4);
        });

        it('should sort spools by last scanned (most recent first)', async () => {
            const sorted = await db.spools.orderBy('lastScanned').reverse().toArray();
            expect(sorted[0].serial).toBe('Q-004'); // Most recent
            expect(sorted[sorted.length - 1].serial).toBe('Q-003'); // Oldest
        });

        it('should paginate results', async () => {
            const page1 = await db.spools.limit(2).toArray();
            expect(page1).toHaveLength(2);

            const page2 = await db.spools.offset(2).limit(2).toArray();
            expect(page2).toHaveLength(2);

            // All pages should have different items
            const page1Serials = page1.map(s => s.serial);
            const page2Serials = page2.map(s => s.serial);
            expect(page1Serials).not.toEqual(page2Serials);
        });
    });

    describe('Advanced Queries', () => {
        beforeEach(async () => {
            await db.spools.bulkAdd([
                {
                    serial: 'ADV-001',
                    brand: 'Prusament',
                    type: 'PLA',
                    color: 'Red',
                    weightRemaining: 900,
                    weightTotal: 1000,
                    diameter: 1.75,
                    temperatureNozzleMin: 200,
                    temperatureNozzleMax: 220
                },
                {
                    serial: 'ADV-002',
                    brand: 'Prusament',
                    type: 'PETG',
                    color: 'Blue',
                    weightRemaining: 150,
                    weightTotal: 1000,
                    diameter: 1.75,
                    temperatureNozzleMin: 230,
                    temperatureNozzleMax: 250
                },
                {
                    serial: 'ADV-003',
                    brand: 'Bambu Lab',
                    type: 'PLA',
                    color: 'Green',
                    weightRemaining: 50,
                    weightTotal: 1000,
                    diameter: 1.75,
                    temperatureNozzleMin: 200,
                    temperatureNozzleMax: 220
                }
            ]);
        });

        it('should get statistics by type', async () => {
            const spools = await db.spools.toArray();

            const stats = spools.reduce((acc, spool) => {
                if (!acc[spool.type]) {
                    acc[spool.type] = { count: 0, totalWeight: 0 };
                }
                acc[spool.type].count++;
                acc[spool.type].totalWeight += spool.weightRemaining;
                return acc;
            }, {} as Record<string, { count: number, totalWeight: number }>);

            expect(stats['PLA'].count).toBe(2);
            expect(stats['PLA'].totalWeight).toBe(950);
            expect(stats['PETG'].count).toBe(1);
            expect(stats['PETG'].totalWeight).toBe(150);
        });

        it('should find spools needing replacement (< 100g)', async () => {
            const critical = await db.spools
                .filter(s => s.weightRemaining < 100)
                .toArray();

            expect(critical).toHaveLength(1);
            expect(critical[0].serial).toBe('ADV-003');
        });

        it('should filter by multiple criteria', async () => {
            const prusaPLA = await db.spools
                .filter(s => s.brand === 'Prusament' && s.type === 'PLA')
                .toArray();

            expect(prusaPLA).toHaveLength(1);
            expect(prusaPLA[0].serial).toBe('ADV-001');
        });

        it('should calculate total remaining weight', async () => {
            const spools = await db.spools.toArray();
            const totalWeight = spools.reduce((sum, s) => sum + s.weightRemaining, 0);
            expect(totalWeight).toBe(1100); // 900 + 150 + 50
        });
    });

    describe('Error Handling', () => {
        it('should handle adding spool with missing required fields', async () => {
            await expect(async () => {
                await db.spools.add({
                    // Missing serial, type, etc.
                } as any);
            }).rejects.toThrow();
        });

        it('should handle updating non-existent spool', async () => {
            const result = await db.spools.update(999999, { weightRemaining: 500 });
            expect(result).toBe(0); // Dexie returns 0 for no updates
        });

        it('should handle deleting non-existent spool', async () => {
            // Should not throw, just silently succeed
            await expect(db.spools.delete(999999)).resolves.not.toThrow();
        });

        it('should handle invalid query', async () => {
            // Query for non-indexed field should still work but be slower
            const results = await db.spools.filter(s => s.batchNumber === 'INVALID').toArray();
            expect(results).toHaveLength(0);
        });
    });

    describe('Data Integrity', () => {
        it('should preserve all fields when updating', async () => {
            const original: Omit<Spool, 'id'> = {
                serial: 'INT-001',
                brand: 'Test Brand',
                type: 'PLA',
                color: 'Red',
                colorHex: '#ff0000',
                weightRemaining: 1000,
                weightTotal: 1000,
                diameter: 1.75,
                weightSpool: 250,
                density: 1.24,
                temperatureNozzleMin: 200,
                temperatureNozzleMax: 220,
                temperatureBedMin: 50,
                temperatureBedMax: 60,
                batchNumber: 'BATCH-123',
                productionDate: '2025-01-01',
                lastScanned: Date.now(),
                detailUrl: 'https://example.com/product'
            };

            const id = await db.spools.add(original);
            await db.spools.update(id, { weightRemaining: 500 });

            const updated = await db.spools.get(id);
            expect(updated?.brand).toBe('Test Brand');
            expect(updated?.colorHex).toBe('#ff0000');
            expect(updated?.batchNumber).toBe('BATCH-123');
            expect(updated?.temperatureNozzleMin).toBe(200);
            expect(updated?.diameter).toBe(1.75);
            expect(updated?.weightRemaining).toBe(500); // Changed
            expect(updated?.weightTotal).toBe(1000); // Unchanged
        });

        it('should handle null/undefined optional fields', async () => {
            const spool = await db.spools.add({
                serial: 'OPT-001',
                brand: 'Test',
                type: 'PLA',
                color: 'Red',
                weightRemaining: 1000,
                weightTotal: 1000,
                diameter: 1.75
                // All optional fields omitted
            });

            const retrieved = await db.spools.get(spool);
            expect(retrieved).toBeDefined();
            expect(retrieved?.colorHex).toBeUndefined();
            expect(retrieved?.temperatureNozzleMin).toBeUndefined();
            expect(retrieved?.batchNumber).toBeUndefined();
        });
    });
});
