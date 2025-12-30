'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Tag, Clock, TrendingUp, Package } from 'lucide-react';
import Link from 'next/link';
import { useSpools } from '@/hooks/useFileStorage';
import { Spool } from '@/db';

export default function TagHistoryPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading tag history...</div>}>
            <TagHistoryContent />
        </Suspense>
    );
}

function TagHistoryContent() {
    const searchParams = useSearchParams();
    const tagSerial = searchParams.get('serial');
    const { spools, loading } = useSpools();
    const [tagStats, setTagStats] = useState<any>(null);

    useEffect(() => {
        if (!spools || !tagSerial) return;

        // Find all spools associated with this tag (current or historical)
        const associatedSpools = spools.filter(spool => {
            // Current association
            if (spool.nfcTagSerial === tagSerial) return true;

            // Historical association
            if (spool.nfcTagHistory && spool.nfcTagHistory.some(h => h.tagSerial === tagSerial)) {
                return true;
            }

            return false;
        });

        // Build timeline from all history entries
        const timeline: Array<{
            timestamp: number;
            action: string;
            spool: Spool;
            tagSerial: string;
        }> = [];

        associatedSpools.forEach(spool => {
            if (spool.nfcTagHistory) {
                spool.nfcTagHistory.forEach(entry => {
                    if (entry.tagSerial === tagSerial) {
                        timeline.push({
                            timestamp: entry.timestamp,
                            action: entry.action,
                            spool,
                            tagSerial: entry.tagSerial
                        });
                    }
                });
            }
        });

        // Sort by timestamp desc (newest first)
        timeline.sort((a, b) => b.timestamp - a.timestamp);

        // Calculate stats
        const currentSpool = spools.find(s => s.nfcTagSerial === tagSerial);
        const totalAssignments = timeline.filter(t => t.action === 'assigned').length;
        const totalRemovals = timeline.filter(t => t.action === 'removed').length;
        const totalReassignments = timeline.filter(t => t.action === 'reassigned').length;
        const uniqueSpools = new Set(timeline.map(t => t.spool.serial)).size;

        setTagStats({
            tagSerial,
            timeline,
            currentSpool,
            associatedSpools,
            totalAssignments,
            totalRemovals,
            totalReassignments,
            uniqueSpools,
            inUse: !!currentSpool && currentSpool.weightRemaining > 0
        });
    }, [spools, tagSerial]);

    if (!tagSerial) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500">No tag serial specified</p>
                <Link href="/inventory" className="text-blue-600 hover:underline">Back to Inventory</Link>
            </div>
        );
    }

    if (loading || !tagStats) {
        return <div className="p-8 text-center">Loading tag history...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/inventory" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">NFC Tag History</h1>
                    <p className="text-sm text-gray-500 font-mono mt-1">{tagSerial}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${tagStats.inUse
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                    {tagStats.inUse ? 'In Use' : 'Available'}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                        <Package className="w-4 h-4" />
                        <span className="text-xs font-medium">Spools</span>
                    </div>
                    <div className="text-2xl font-bold">{tagStats.uniqueSpools}</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                        <Tag className="w-4 h-4" />
                        <span className="text-xs font-medium">Assignments</span>
                    </div>
                    <div className="text-2xl font-bold">{tagStats.totalAssignments}</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs font-medium">Reuses</span>
                    </div>
                    <div className="text-2xl font-bold">{tagStats.totalReassignments}</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-medium">Removals</span>
                    </div>
                    <div className="text-2xl font-bold">{tagStats.totalRemovals}</div>
                </div>
            </div>

            {/* Current Association */}
            {tagStats.currentSpool && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Tag className="w-5 h-5 text-green-600" />
                        Currently Attached To
                    </h2>
                    <Link
                        href={`/inventory/detail?serial=${tagStats.currentSpool.serial}`}
                        className="block hover:bg-gray-50 dark:hover:bg-gray-700/50 p-4 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-semibold text-lg">
                                    {tagStats.currentSpool.brand} {tagStats.currentSpool.type}
                                </h3>
                                <p className="text-sm text-gray-500">{tagStats.currentSpool.color}</p>
                                <p className="text-sm font-mono text-gray-400 mt-1">
                                    {tagStats.currentSpool.weightRemaining}g / {tagStats.currentSpool.weightTotal}g
                                </p>
                            </div>
                            <div
                                className="w-8 h-8 rounded-full border shadow-inner"
                                style={{ backgroundColor: tagStats.currentSpool.colorHex || '#ccc' }}
                            />
                        </div>
                    </Link>
                </div>
            )}

            {/* Timeline */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Tag History Timeline
                </h2>

                {tagStats.timeline.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No history recorded for this tag</p>
                )}

                <div className="space-y-4">
                    {tagStats.timeline.map((entry: any, idx: number) => (
                        <div key={idx} className="flex gap-4">
                            {/* Timeline line */}
                            <div className="flex flex-col items-center">
                                <div className={`w-3 h-3 rounded-full border-2 ${entry.action === 'assigned' ? 'bg-green-500 border-green-600' :
                                    entry.action === 'removed' ? 'bg-red-500 border-red-600' :
                                        'bg-orange-500 border-orange-600'
                                    }`} />
                                {idx < tagStats.timeline.length - 1 && (
                                    <div className="w-0.5 h-full min-h-[60px] bg-gray-200 dark:bg-gray-700 mt-2" />
                                )}
                            </div>

                            {/* Entry content */}
                            <div className="flex-1 pb-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-semibold ${entry.action === 'assigned' ? 'text-green-600 dark:text-green-400' :
                                                entry.action === 'removed' ? 'text-red-600 dark:text-red-400' :
                                                    'text-orange-600 dark:text-orange-400'
                                                }`}>
                                                {entry.action === 'assigned' && '✓ Tag Assigned'}
                                                {entry.action === 'removed' && '✗ Tag Removed'}
                                                {entry.action === 'reassigned' && '↻ Tag Reassigned'}
                                            </span>
                                        </div>
                                        <Link
                                            href={`/inventory/detail?serial=${entry.spool.serial}`}
                                            className="text-sm hover:underline text-blue-600 dark:text-blue-400 mt-1 block"
                                        >
                                            {entry.spool.brand} {entry.spool.type} - {entry.spool.color}
                                        </Link>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date(entry.timestamp).toLocaleString()}
                                        </p>
                                    </div>
                                    <div
                                        className="w-6 h-6 rounded-full border shadow-inner flex-shrink-0"
                                        style={{ backgroundColor: entry.spool.colorHex || '#ccc' }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* All Associated Spools */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold mb-4">All Associated Spools</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tagStats.associatedSpools.map((spool: Spool) => (
                        <Link
                            key={spool.serial}
                            href={`/inventory/detail?serial=${spool.serial}`}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${spool.weightRemaining <= 0
                                ? 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 opacity-60'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300'
                                }`}
                        >
                            <div
                                className="w-8 h-8 rounded-full border shadow-inner flex-shrink-0"
                                style={{ backgroundColor: spool.colorHex || '#ccc' }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                    {spool.brand} {spool.type}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                    {spool.color} • {spool.weightRemaining}g
                                </div>
                            </div>
                            {spool.weightRemaining <= 0 && (
                                <span className="text-xs text-red-600 dark:text-red-400 font-medium">EMPTY</span>
                            )}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
