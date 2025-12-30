'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Tag, TrendingUp, Package, BarChart3, Clock } from 'lucide-react';
import Link from 'next/link';
import { useSpools } from '@/hooks/useFileStorage';
import { Spool } from '@/db';

interface TagStats {
    serial: string;
    currentSpool?: Spool;
    totalAssignments: number;
    totalRemovals: number;
    inUse: boolean;
    spoolCount: number;
    lastUsed: number;
}

export default function TagStatsPage() {
    const { spools, loading } = useSpools();
    const [stats, setStats] = useState<{
        totalTags: number;
        activeTags: number;
        availableTags: number;
        totalAssignments: number;
        totalRemovals: number;
        averageReuses: number;
        mostReusedTag?: TagStats;
        recentlyUsedTags: TagStats[];
        allTags: TagStats[];
    } | null>(null);

    useEffect(() => {
        if (!spools) return;

        // Build map of all tags and their stats
        const tagMap = new Map<string, TagStats>();

        spools.forEach(spool => {
            // Current tag
            if (spool.nfcTagSerial) {
                if (!tagMap.has(spool.nfcTagSerial)) {
                    tagMap.set(spool.nfcTagSerial, {
                        serial: spool.nfcTagSerial,
                        totalAssignments: 0,
                        totalRemovals: 0,
                        inUse: false,
                        spoolCount: 0,
                        lastUsed: 0
                    });
                }

                const tag = tagMap.get(spool.nfcTagSerial)!;
                if (spool.weightRemaining > 0) {
                    tag.inUse = true;
                    tag.currentSpool = spool;
                }
                tag.spoolCount++;
            }

            // Historical tags
            if (spool.nfcTagHistory) {
                spool.nfcTagHistory.forEach(entry => {
                    if (!tagMap.has(entry.tagSerial)) {
                        tagMap.set(entry.tagSerial, {
                            serial: entry.tagSerial,
                            totalAssignments: 0,
                            totalRemovals: 0,
                            inUse: false,
                            spoolCount: 0,
                            lastUsed: 0
                        });
                    }

                    const tag = tagMap.get(entry.tagSerial)!;

                    if (entry.action === 'assigned' || entry.action === 'reassigned') {
                        tag.totalAssignments++;
                    } else if (entry.action === 'removed') {
                        tag.totalRemovals++;
                    }

                    // Track last used
                    if (entry.timestamp > tag.lastUsed) {
                        tag.lastUsed = entry.timestamp;
                    }

                    // Count unique spools for this tag
                    tag.spoolCount++;
                });
            }
        });

        const allTags = Array.from(tagMap.values());
        const activeTags = allTags.filter(t => t.inUse).length;
        const totalAssignments = allTags.reduce((sum, t) => sum + t.totalAssignments, 0);
        const totalRemovals = allTags.reduce((sum, t) => sum + t.totalRemovals, 0);
        const averageReuses = allTags.length > 0
            ? totalAssignments / allTags.length
            : 0;

        // Find most reused tag
        const mostReused = allTags.reduce((max, tag) =>
            tag.totalAssignments > (max?.totalAssignments || 0) ? tag : max
            , allTags[0]);

        // Recently used tags (last 10)
        const recentlyUsed = [...allTags]
            .filter(t => t.lastUsed > 0)
            .sort((a, b) => b.lastUsed - a.lastUsed)
            .slice(0, 10);

        setStats({
            totalTags: allTags.length,
            activeTags,
            availableTags: allTags.length - activeTags,
            totalAssignments,
            totalRemovals,
            averageReuses,
            mostReusedTag: mostReused,
            recentlyUsedTags: recentlyUsed,
            allTags: allTags.sort((a, b) => b.totalAssignments - a.totalAssignments)
        });
    }, [spools]);

    if (loading || !stats) {
        return <div className="p-8 text-center">Loading tag statistics...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/inventory" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">NFC Tag Statistics</h1>
                    <p className="text-sm text-gray-500">Track and analyze your tag usage</p>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                        <Tag className="w-4 h-4" />
                        <span className="text-xs font-medium">Total Tags</span>
                    </div>
                    <div className="text-2xl font-bold">{stats.totalTags}</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                        <Package className="w-4 h-4" />
                        <span className="text-xs font-medium">Active</span>
                    </div>
                    <div className="text-2xl font-bold">{stats.activeTags}</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                        <Tag className="w-4 h-4" />
                        <span className="text-xs font-medium">Available</span>
                    </div>
                    <div className="text-2xl font-bold">{stats.availableTags}</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs font-medium">Assignments</span>
                    </div>
                    <div className="text-2xl font-bold">{stats.totalAssignments}</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
                        <BarChart3 className="w-4 h-4" />
                        <span className="text-xs font-medium">Avg Reuses</span>
                    </div>
                    <div className="text-2xl font-bold">{stats.averageReuses.toFixed(1)}</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-medium">Removals</span>
                    </div>
                    <div className="text-2xl font-bold">{stats.totalRemovals}</div>
                </div>
            </div>

            {/* Most Reused Tag */}
            {stats.mostReusedTag && stats.mostReusedTag.totalAssignments > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 shadow-sm border border-purple-200 dark:border-purple-800">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                        Most Reused Tag
                    </h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-mono text-lg font-semibold text-purple-900 dark:text-purple-200">
                                {stats.mostReusedTag.serial}
                            </p>
                            <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                                Used {stats.mostReusedTag.totalAssignments} times across {stats.mostReusedTag.spoolCount} spools
                            </p>
                            {stats.mostReusedTag.currentSpool && (
                                <Link
                                    href={`/inventory/detail?serial=${stats.mostReusedTag.currentSpool.serial}`}
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 block"
                                >
                                    Currently: {stats.mostReusedTag.currentSpool.brand} {stats.mostReusedTag.currentSpool.type}
                                </Link>
                            )}
                        </div>
                        <Link
                            href={`/tag-history?serial=${stats.mostReusedTag.serial}`}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors"
                        >
                            View History
                        </Link>
                    </div>
                </div>
            )}

            {/* Recently Used Tags */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recently Used Tags
                </h2>
                <div className="space-y-2">
                    {stats.recentlyUsedTags.map((tag) => (
                        <div
                            key={tag.serial}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tag.inUse ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                    }`} />
                                <div className="flex-1 min-w-0">
                                    <p className="font-mono text-sm truncate">{tag.serial}</p>
                                    {tag.currentSpool && (
                                        <p className="text-xs text-gray-500 truncate">
                                            {tag.currentSpool.brand} {tag.currentSpool.type}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-xs text-gray-500">
                                        {tag.totalAssignments} uses
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {new Date(tag.lastUsed).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <Link
                                href={`/tag-history?serial=${tag.serial}`}
                                className="ml-3 px-3 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex-shrink-0"
                            >
                                History
                            </Link>
                        </div>
                    ))}
                </div>
            </div>

            {/* All Tags Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold mb-4">All Tags</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-400">Tag Serial</th>
                                <th className="text-left py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
                                <th className="text-left py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-400">Current Spool</th>
                                <th className="text-right py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-400">Uses</th>
                                <th className="text-right py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-400">Spools</th>
                                <th className="text-right py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.allTags.map((tag) => (
                                <tr key={tag.serial} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                    <td className="py-3 px-3">
                                        <code className="text-xs bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                                            {tag.serial}
                                        </code>
                                    </td>
                                    <td className="py-3 px-3">
                                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${tag.inUse
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                            }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${tag.inUse ? 'bg-green-500' : 'bg-gray-400'}`} />
                                            {tag.inUse ? 'Active' : 'Available'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-3">
                                        {tag.currentSpool ? (
                                            <Link
                                                href={`/inventory/detail?serial=${tag.currentSpool.serial}`}
                                                className="text-sm hover:underline text-blue-600 dark:text-blue-400"
                                            >
                                                {tag.currentSpool.brand} {tag.currentSpool.type}
                                            </Link>
                                        ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                        <span className="text-sm font-mono">{tag.totalAssignments}</span>
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                        <span className="text-sm font-mono">{tag.spoolCount}</span>
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                        <Link
                                            href={`/tag-history?serial=${tag.serial}`}
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            View History →
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
