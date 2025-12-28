'use client';

import { useState } from 'react';
import { migrateToFiles } from '@/lib/storage/migrate';
import { PageTransition } from '@/components/PageTransition';

/**
 * Migration Page
 * 
 * UI for migrating from IndexedDB to file-based storage
 */
export default function MigratePage() {
    const [migrating, setMigrating] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleMigrate = async () => {
        setMigrating(true);
        setError(null);
        setResult(null);

        try {
            const migrationResult = await migrateToFiles();
            setResult(migrationResult);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setMigrating(false);
        }
    };

    return (
        <PageTransition className="max-w-4xl mx-auto space-y-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                <h1 className="text-2xl font-bold text-yellow-900 dark:text-yellow-100 mb-2">
                    ⚠️ Database Migration
                </h1>
                <p className="text-yellow-800 dark:text-yellow-200">
                    This tool migrates your spools from IndexedDB to the new file-based storage system.
                </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-4">Migration Process</h2>

                <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">1️⃣</span>
                        <div>
                            <h3 className="font-medium">Read from IndexedDB</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Retrieves all existing spools from the browser database
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <span className="text-2xl">2️⃣</span>
                        <div>
                            <h3 className="font-medium">Convert to JSON Files</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Creates individual JSON files with format: {'{'}type{'}'}
                                -{'{'}brand{'}'}-{'{'}color{'}'}-{'{'}serial{'}'}.json
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <span className="text-2xl">3️⃣</span>
                        <div>
                            <h3 className="font-medium">Verify & Report</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Shows detailed results and any errors encountered
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                        ℹ️ Important Notes
                    </h3>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                        <li>• This migration is safe - your IndexedDB data remains unchanged</li>
                        <li>• You can run this multiple times without issues</li>
                        <li>• Files are stored in: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">data/spools/</code></li>
                        <li>• Existing files with same serial will be updated</li>
                    </ul>
                </div>

                <button
                    onClick={handleMigrate}
                    disabled={migrating}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    {migrating ? (
                        <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                            Migrating...
                        </>
                    ) : (
                        <>
                            🚀 Start Migration
                        </>
                    )}
                </button>
            </div>

            {/* Results */}
            {result && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 text-green-600 dark:text-green-400">
                        ✅ Migration Complete!
                    </h2>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                                {result.success}
                            </div>
                            <div className="text-sm text-green-700 dark:text-green-300">
                                Successfully migrated
                            </div>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                                {result.failed}
                            </div>
                            <div className="text-sm text-red-700 dark:text-red-300">
                                Failed
                            </div>
                        </div>
                    </div>

                    {result.files.length > 0 && (
                        <div className="mb-4">
                            <h3 className="font-medium mb-2">Files Created:</h3>
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-60 overflow-y-auto">
                                <ul className="text-sm font-mono space-y-1">
                                    {result.files.slice(0, 10).map((file: string, i: number) => (
                                        <li key={i} className="text-gray-700 dark:text-gray-300">
                                            ✓ {file}
                                        </li>
                                    ))}
                                    {result.files.length > 10 && (
                                        <li className="text-gray-500 dark:text-gray-500">
                                            ... and {result.files.length - 10} more
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    )}

                    {result.errors.length > 0 && (
                        <div>
                            <h3 className="font-medium mb-2 text-red-600 dark:text-red-400">
                                Errors:
                            </h3>
                            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 max-h-60 overflow-y-auto">
                                <ul className="text-sm space-y-2">
                                    {result.errors.map((err: any, i: number) => (
                                        <li key={i} className="text-red-700 dark:text-red-300">
                                            <span className="font-mono">{err.serial}</span>: {err.error}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                            📝 Next Steps
                        </h3>
                        <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                            <li>Check that files were created in <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">data/spools/</code></li>
                            <li>Navigate to the Inventory page and verify all spools load correctly</li>
                            <li>Test creating, updating, and deleting spools</li>
                            <li>Once verified, the old IndexedDB data can remain as backup</li>
                        </ol>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-2 text-red-600 dark:text-red-400">
                        ❌ Migration Failed
                    </h2>
                    <p className="text-red-700 dark:text-red-300 font-mono text-sm">
                        {error}
                    </p>
                </div>
            )}
        </PageTransition>
    );
}
