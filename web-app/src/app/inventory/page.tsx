'use client';

import { useState, useEffect, Suspense } from 'react';
import { Filter, Search, Eye, EyeOff, List, Layers, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PageTransition } from '@/components/PageTransition';
import { StaggerContainer, StaggerItem } from '@/components/StaggerAnimation';
import { useSpools } from '@/hooks/useFileStorage';
import { getStorage } from '@/lib/storage';
import { parseOpenPrintTagBin } from '@/lib/openPrintTagImporter';

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
    const [showEmpty, setShowEmpty] = useState(true); // Show empty spools by default
    const [viewMode, setViewMode] = useState<'spools' | 'grouped'>('spools');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 48;
    const [importing, setImporting] = useState(false);

    // Use file storage hook instead of Dexie
    const { spools, loading, error, refresh } = useSpools();

    useEffect(() => {
        const typeParam = searchParams.get('type');
        if (typeParam) {
            setFilterType(typeParam);
        }
    }, [searchParams]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterType, showEmpty, viewMode]);

    const scrollToTop = () => {
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleImportBin = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        try {
            const data = await parseOpenPrintTagBin(file);

            const storage = getStorage();
            await storage.saveSpool({
                serial: data.uuid || `OPT-${Date.now()}`, // Use bin UUID or generate one
                brand: data.brand,
                type: data.type,
                color: data.color,
                diameter: data.diameter,
                weightRemaining: data.weight, // Assume full if from generator? Or is 'weight' capacity? Usually capacity.
                // OpenPrintTag 'weight' usually refers to initial weight or formatted weight.
                // Let's assume it's the total weight.
                weightTotal: data.weight || 1000,
                weightSpool: 0, // Default tare
                temperatureNozzleMin: data.tempMin || 190,
                temperatureNozzleMax: data.tempMax || 220,
                temperatureBedMin: 60,
                temperatureBedMax: 60,
                density: 1.24,
                lastScanned: Date.now(),
                lastUpdated: Date.now(),
                series: '',
                finish: 'plain', // Default finish
                notes: `Imported from OpenPrintTag .bin file (${data.version || 'v1.0'})`
            });

            alert(`Successfully imported ${data.brand} ${data.type}`);
            if (refresh) refresh();

            // Clear input
            e.target.value = '';
        } catch (error: any) {
            console.error('Import failed:', error);
            alert(`Import failed: ${error.message}`);
        } finally {
            setImporting(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Inventory...</div>;
    if (error) return <div className="p-8 text-center text-red-600">Error loading spools: {error.message}</div>;
    // if (!spools) return <div className="p-8 text-center">No spools found</div>; // Allow rendering header even if empty

    // Client-side filtering (Dexie is fast enough for small DBs, or use .where() for large)
    const filtered = (spools || []).filter(s => {
        const matchSearch = (s.brand || '').toLowerCase().includes(search.toLowerCase()) ||
            (s.type || '').toLowerCase().includes(search.toLowerCase()) ||
            (s.color || '').toLowerCase().includes(search.toLowerCase());
        const matchType = filterType === 'All' || s.type === filterType;
        const matchEmpty = showEmpty || s.weightRemaining > 0; // Hide empty if showEmpty is false
        return matchSearch && matchType && matchEmpty;
    });

    // Group spools by brand + type + color
    const groupedFilaments = filtered.reduce((acc, spool) => {
        const key = `${spool.brand || 'Unknown'}-${spool.type}-${spool.color || 'No Color'}`;
        if (!acc[key]) {
            acc[key] = {
                brand: spool.brand || 'Unknown Brand',
                type: spool.type,
                color: spool.color || 'No Color',
                colorHex: spool.colorHex,
                spools: [],
                totalRemaining: 0,
                totalCapacity: 0,
                spoolCount: 0,
                isEmpty: true
            };
        }
        acc[key].spools.push(spool);
        acc[key].totalRemaining += spool.weightRemaining;
        acc[key].totalCapacity += spool.weightTotal;
        acc[key].spoolCount += 1;
        if (spool.weightRemaining > 0) acc[key].isEmpty = false;
        return acc;
    }, {} as Record<string, any>);

    const groupedArray = Object.values(groupedFilaments);

    const uniqueTypes = Array.from(new Set((spools || []).map(s => s.type))).sort();
    const emptyCount = (spools || []).filter(s => s.weightRemaining <= 0).length;

    return (
        <PageTransition className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold">Inventory</h1>

                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    <Link href="/inventory/add" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-1 transition-colors whitespace-nowrap">
                        + Add Spool
                    </Link>

                    <label className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap">
                        <Upload className="w-4 h-4" />
                        <span className="hidden sm:inline">Import .bin</span>
                        <input
                            type="file"
                            accept=".bin"
                            className="hidden"
                            onChange={handleImportBin}
                            disabled={importing}
                        />
                    </label>

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
                    <button
                        onClick={() => setShowEmpty(!showEmpty)}
                        className={`px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${showEmpty
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50'
                            }`}
                        title={showEmpty ? 'Hide empty spools' : 'Show empty spools'}
                    >
                        {showEmpty ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        <span className="hidden sm:inline">
                            {showEmpty ? 'Empty' : `Hidden (${emptyCount})`}
                        </span>
                    </button>
                    <button
                        onClick={() => setViewMode(viewMode === 'spools' ? 'grouped' : 'spools')}
                        className={`px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${viewMode === 'grouped'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        title={viewMode === 'spools' ? 'Group by filament type' : 'Show individual spools'}
                    >
                        {viewMode === 'spools' ? <Layers className="w-4 h-4" /> : <List className="w-4 h-4" />}
                        <span className="hidden lg:inline">
                            {viewMode === 'spools' ? 'Group' : 'Spools'}
                        </span>
                    </button>
                </div>
            </div>

            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(viewMode === 'spools' ? filtered.length === 0 : groupedArray.length === 0) && (
                    <div className="col-span-full text-center py-12 text-gray-400">
                        {showEmpty ? 'No spools found. Scan some tags to populate!' : 'No active spools found. Toggle "Empty" to show all.'}
                    </div>
                )}

                {viewMode === 'spools' ? (
                    // Individual Spools View
                    // Individual Spools View (Paginated)
                    filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(spool => {
                        const isEmpty = spool.weightRemaining <= 0;
                        return (
                            <StaggerItem key={spool.serial}>
                                <Link
                                    href={`/inventory/detail?serial=${spool.serial}`}
                                    className={`rounded-xl p-4 shadow-sm border flex flex-col gap-3 transition-all block ${isEmpty
                                        ? 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 opacity-60 hover:opacity-80'
                                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${isEmpty
                                                    ? 'text-gray-500 dark:text-gray-600 bg-gray-200 dark:bg-gray-800'
                                                    : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                                                    }`}>
                                                    {spool.type}
                                                </span>
                                                {isEmpty && (
                                                    <span className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                                                        EMPTY
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className={`font-semibold text-lg mt-1 ${isEmpty ? 'text-gray-500 dark:text-gray-600' : ''}`}>
                                                {spool.brand || 'Unknown Brand'}
                                            </h3>
                                            <p className={`text-sm ${isEmpty ? 'text-gray-400 dark:text-gray-700' : 'text-gray-500'}`}>
                                                {spool.color || 'No Color'}
                                            </p>
                                        </div>
                                        <div
                                            className={`w-6 h-6 rounded-full border shadow-inner ${isEmpty ? 'opacity-50' : ''}`}
                                            style={{
                                                backgroundColor: spool.colorHex || '#ccc',
                                                borderColor: isEmpty ? '#d1d5db' : '#e5e7eb'
                                            }}
                                        />
                                    </div>

                                    <div className="mt-auto">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className={isEmpty ? 'text-gray-400' : ''}>Remaining</span>
                                            <span className={`font-mono ${isEmpty ? 'text-gray-400' : ''}`}>
                                                {spool.weightRemaining}g / {spool.weightTotal}g
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${isEmpty
                                                    ? 'bg-gray-300 dark:bg-gray-600'
                                                    : spool.weightRemaining < 200
                                                        ? 'bg-orange-500'
                                                        : 'bg-blue-500'
                                                    }`}
                                                style={{ width: `${Math.min(100, (spool.weightRemaining / spool.weightTotal) * 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className={`text-xs font-mono truncate ${isEmpty ? 'text-gray-400' : 'text-gray-400'}`}>
                                        ID: {spool.serial}
                                    </div>
                                </Link>
                            </StaggerItem>
                        );
                    })
                ) : (
                    // Grouped Filaments View
                    // Grouped Filaments View (Paginated)
                    groupedArray.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((group, idx) => {
                        const isEmpty = group.isEmpty;
                        const percentage = (group.totalRemaining / group.totalCapacity) * 100;
                        return (
                            <StaggerItem key={`${group.brand}-${group.type}-${group.color}-${idx}`}>
                                <div
                                    className={`rounded-xl p-4 shadow-sm border flex flex-col gap-3 transition-all ${isEmpty
                                        ? 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 opacity-60'
                                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${isEmpty
                                                    ? 'text-gray-500 dark:text-gray-600 bg-gray-200 dark:bg-gray-800'
                                                    : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                                                    }`}>
                                                    {group.type}
                                                </span>
                                                <span className={`text-xs font-medium px-2 py-1 rounded ${isEmpty
                                                    ? 'text-gray-500 dark:text-gray-600 bg-gray-200 dark:bg-gray-800'
                                                    : 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30'
                                                    }`}>
                                                    {group.spoolCount} {group.spoolCount === 1 ? 'spool' : 'spools'}
                                                </span>
                                                {isEmpty && (
                                                    <span className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                                                        ALL EMPTY
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className={`font-semibold text-lg mt-1 ${isEmpty ? 'text-gray-500 dark:text-gray-600' : ''}`}>
                                                {group.brand}
                                            </h3>
                                            <p className={`text-sm ${isEmpty ? 'text-gray-400 dark:text-gray-700' : 'text-gray-500'}`}>
                                                {group.color}
                                            </p>
                                        </div>
                                        <div
                                            className={`w-6 h-6 rounded-full border shadow-inner ${isEmpty ? 'opacity-50' : ''}`}
                                            style={{
                                                backgroundColor: group.colorHex || '#ccc',
                                                borderColor: isEmpty ? '#d1d5db' : '#e5e7eb'
                                            }}
                                        />
                                    </div>

                                    <div className="mt-auto">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className={isEmpty ? 'text-gray-400' : ''}>Total Remaining</span>
                                            <span className={`font-mono ${isEmpty ? 'text-gray-400' : ''}`}>
                                                {group.totalRemaining}g / {group.totalCapacity}g
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${isEmpty
                                                    ? 'bg-gray-300 dark:bg-gray-600'
                                                    : group.totalRemaining < 200
                                                        ? 'bg-orange-500'
                                                        : 'bg-blue-500'
                                                    }`}
                                                style={{ width: `${Math.min(100, percentage)}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-1 flex-wrap">
                                        {group.spools.map((spool: any) => (
                                            <Link
                                                key={spool.id}
                                                href={`/inventory/detail?serial=${spool.serial}`}
                                                className={`text-xs px-2 py-1 rounded transition-colors ${spool.weightRemaining <= 0
                                                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                                                    }`}
                                                title={`${spool.weightRemaining}g / ${spool.weightTotal}g`}
                                            >
                                                #{spool.serial.slice(-6)}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </StaggerItem>
                        );
                    })
                )}
            </StaggerContainer>

            {/* Pagination Controls */}
            {(() => {
                const totalItems = viewMode === 'spools' ? filtered.length : groupedArray.length;
                const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

                if (totalPages <= 1) return null;

                return (
                    <div className="flex items-center justify-center gap-4 mt-8 pb-8">
                        <button
                            onClick={() => {
                                setCurrentPage(p => Math.max(1, p - 1));
                                scrollToTop();
                            }}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            aria-label="Previous Page"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Page <span className="text-gray-900 dark:text-gray-100">{currentPage}</span> of {totalPages}
                        </div>

                        <button
                            onClick={() => {
                                setCurrentPage(p => Math.min(totalPages, p + 1));
                                scrollToTop();
                            }}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            aria-label="Next Page"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                );
            })()}
        </PageTransition>
    );
}
