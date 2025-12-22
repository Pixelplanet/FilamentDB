'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { useState, useEffect, Suspense } from 'react';
import { Filter, Search } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function InventoryPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading Inventory...</div>}>
            <InventoryPageContent />
        </Suspense>
    );
}

function InventoryPageContent() {
    const searchParams = useSearchParams();
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('All');

    useEffect(() => {
        const typeParam = searchParams.get('type');
        if (typeParam) {
            setFilterType(typeParam);
        }
    }, [searchParams]);

    const spools = useLiveQuery(async () => {
        let collection = db.spools.toCollection();

        // Sort by newest scan (reverse id roughly)
        return await collection.reverse().sortBy('id');
    });

    if (!spools) return <div className="p-8 text-center">Loading Inventory...</div>;

    // Client-side filtering (Dexie is fast enough for small DBs, or use .where() for large)
    const filtered = spools.filter(s => {
        const matchSearch = s.brand.toLowerCase().includes(search.toLowerCase()) ||
            s.type.toLowerCase().includes(search.toLowerCase()) ||
            s.color.toLowerCase().includes(search.toLowerCase());
        const matchType = filterType === 'All' || s.type === filterType;
        return matchSearch && matchType;
    });

    const uniqueTypes = Array.from(new Set(spools.map(s => s.type))).sort();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold">Inventory</h1>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Link href="/inventory/add" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-1 transition-colors whitespace-nowrap">
                        + Add Spool
                    </Link>
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search brand, color..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="relative">
                        <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                            className="appearance-none pl-4 pr-8 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        >
                            <option value="All">All Types</option>
                            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-400">
                        No spools found. Scan some tags to populate!
                    </div>
                )}

                {filtered.map(spool => (
                    <Link href={`/inventory/detail?id=${spool.id}`} key={spool.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                        <div className="flex items-start justify-between">
                            <div>
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded uppercase tracking-wider">
                                    {spool.type}
                                </span>
                                <h3 className="font-semibold text-lg mt-1">{spool.brand}</h3>
                                <p className="text-gray-500 text-sm">{spool.color}</p>
                            </div>
                            <div
                                className="w-6 h-6 rounded-full border border-gray-200 shadow-inner"
                                style={{ backgroundColor: spool.colorHex || '#ccc' }}
                            />
                        </div>

                        <div className="mt-auto">
                            <div className="flex justify-between text-sm mb-1">
                                <span>Remaining</span>
                                <span className="font-mono">{spool.weightRemaining}g / {spool.weightTotal}g</span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full"
                                    style={{ width: `${Math.min(100, (spool.weightRemaining / spool.weightTotal) * 100)}%` }}
                                />
                            </div>
                        </div>

                        <div className="text-xs text-gray-400 font-mono truncate">
                            ID: {spool.serial}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
