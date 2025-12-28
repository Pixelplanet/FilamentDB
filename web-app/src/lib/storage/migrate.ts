/**
 * Migration Script: IndexedDB to File-Based Storage
 * 
 * Converts all spools from IndexedDB (Dexie) to JSON files
 * 
 * Usage:
 *   npm run migrate-to-files
 */

import { db } from '@/db';
import { getSpoolFileName, prettyJSON } from '@/lib/storage/fileUtils';

interface MigrationResult {
    success: number;
    failed: number;
    errors: Array<{ serial: string; error: string }>;
    files: string[];
}

/**
 * Migrate all spools from IndexedDB to files
 */
export async function migrateToFiles(): Promise<MigrationResult> {
    console.log('🚀 Starting migration from IndexedDB to file-based storage...\n');

    const result: MigrationResult = {
        success: 0,
        failed: 0,
        errors: [],
        files: []
    };

    try {
        // 1. Connect to IndexedDB and get all spools
        console.log('📖 Reading spools from IndexedDB...');
        const spools = await db.spools.toArray();

        console.log(`✓ Found ${spools.length} spools in IndexedDB\n`);

        if (spools.length === 0) {
            console.log('⚠️  No spools to migrate');
            return result;
        }

        // 2. For each spool, save to file via API
        console.log('💾 Migrating spools to files...');

        for (const spool of spools) {
            try {
                // Generate filename for logging
                const filename = getSpoolFileName(spool);

                // Save via API endpoint
                const response = await fetch('/api/spools', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(spool)
                });

                if (!response.ok) {
                    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
                    throw new Error(error.error || `HTTP ${response.status}`);
                }

                result.success++;
                result.files.push(filename);
                console.log(`  ✓ ${filename}`);
            } catch (error) {
                result.failed++;
                result.errors.push({
                    serial: spool.serial,
                    error: error instanceof Error ? error.message : String(error)
                });
                console.error(`  ✗ Failed ${spool.serial}: ${error}`);
            }
        }

        // 3. Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 Migration Complete!\n');
        console.log(`✅ Success: ${result.success} spools`);
        console.log(`❌ Failed:  ${result.failed} spools`);
        console.log('='.repeat(60));

        if (result.errors.length > 0) {
            console.log('\n⚠️  Errors:');
            result.errors.forEach(({ serial, error }) => {
                console.log(`  - ${serial}: ${error}`);
            });
        }

        console.log('\n💡 Next Steps:');
        console.log('  1. Verify files in data/spools/ directory');
        console.log('  2. Run the app and check all spools load correctly');
        console.log('  3. Once verified, you can remove the old IndexedDB (optional)');

        return result;
    } catch (error) {
        console.error('💥 Migration failed:', error);
        throw error;
    }
}

/**
 * Run migration if called directly
 */
if (typeof window !== 'undefined') {
    // Browser environment - expose to window for console access
    (window as any).migrateToFiles = migrateToFiles;
    console.log('Migration utility loaded. Run: migrateToFiles()');
}
