'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, Package, Calendar, Loader2 } from 'lucide-react';
import { Spool } from '@/db';
import { getStorage } from '@/lib/storage';

// Simple time ago formatter
function timeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
    const months = Math.floor(days / 30);
    return `${months} month${months !== 1 ? 's' : ''} ago`;
}

export function RecycleBin() {
    const [deletedSpools, setDeletedSpools] = useState<Spool[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [restoring, setRestoring] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    const loadDeletedSpools = async () => {
        setLoading(true);
        setError(null);
        try {
            const storage = getStorage();
            const spools = await storage.listDeletedSpools();
            setDeletedSpools(spools);
        } catch (e: any) {
            setError(e.message || 'Failed to load deleted spools');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDeletedSpools();
    }, []);

    const handleRestore = async (serial: string) => {
        setRestoring(serial);
        try {
            const storage = getStorage();
            await storage.restoreSpool(serial);
            // Refresh list
            await loadDeletedSpools();
            // Dispatch change event to refresh other views
            window.dispatchEvent(new Event('filament-db-change'));
        } catch (e: any) {
            setError(e.message || 'Failed to restore spool');
        } finally {
            setRestoring(null);
        }
    };

    const handlePermanentDelete = async (serial: string) => {
        if (!confirm('Are you sure you want to permanently delete this spool? This action cannot be undone.')) {
            return;
        }

        setDeleting(serial);
        try {
            const storage = getStorage();
            await storage.permanentlyDeleteSpool(serial);
            // Refresh list
            await loadDeletedSpools();
        } catch (e: any) {
            setError(e.message || 'Failed to permanently delete spool');
        } finally {
            setDeleting(null);
        }
    };

    const handleEmptyRecycleBin = async () => {
        if (!confirm(`Are you sure you want to permanently delete all ${deletedSpools.length} spools in the recycle bin? This action cannot be undone.`)) {
            return;
        }

        setLoading(true);
        try {
            const storage = getStorage();
            for (const spool of deletedSpools) {
                await storage.permanentlyDeleteSpool(spool.serial);
            }
            setDeletedSpools([]);
        } catch (e: any) {
            setError(e.message || 'Failed to empty recycle bin');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    Recycle Bin
                </h3>
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    Recycle Bin
                    {deletedSpools.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                            {deletedSpools.length}
                        </span>
                    )}
                </h3>
                {deletedSpools.length > 0 && (
                    <button
                        onClick={handleEmptyRecycleBin}
                        className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                    >
                        Empty Recycle Bin
                    </button>
                )}
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {deletedSpools.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Recycle bin is empty</p>
                    <p className="text-sm mt-1">Deleted spools will appear here for 30 days</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {deletedSpools.map((spool) => (
                        <div
                            key={spool.serial}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                {/* Color swatch */}
                                <div
                                    className="w-8 h-8 rounded-lg flex-shrink-0 border border-gray-200 dark:border-gray-700"
                                    style={{ backgroundColor: spool.color || '#808080' }}
                                />
                                <div className="min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-white truncate">
                                        {spool.brand} {spool.type}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                        <span className="truncate">{spool.serial.substring(0, 8)}...</span>
                                        {spool.lastUpdated && (
                                            <>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    Deleted {timeAgo(spool.lastUpdated)}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={() => handleRestore(spool.serial)}
                                    disabled={restoring === spool.serial}
                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                                    title="Restore"
                                >
                                    {restoring === spool.serial ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <RotateCcw className="w-4 h-4" />
                                    )}
                                </button>
                                <button
                                    onClick={() => handlePermanentDelete(spool.serial)}
                                    disabled={deleting === spool.serial}
                                    className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                    title="Permanently Delete"
                                >
                                    {deleting === spool.serial ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                Deleted spools are automatically removed after 30 days.
            </p>
        </div>
    );
}
