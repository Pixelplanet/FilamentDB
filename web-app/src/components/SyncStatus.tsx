
'use client';

import { useState } from 'react';
import { RefreshCw, Check, AlertTriangle, Clock } from 'lucide-react';
import { useSync } from '@/contexts/SyncContext';
import { SyncHistoryModal } from './SyncHistoryModal';

export function SyncStatus() {
    const { status, performSync, errorMessage, isConfigured } = useSync();
    const [showHistory, setShowHistory] = useState(false);

    // Only show if sync is configured
    if (!isConfigured) {
        return null;
    }

    return (
        <>
            <button
                onClick={() => {
                    if (status === 'error') setShowHistory(true);
                    else if (status !== 'syncing') setShowHistory(true); // Always show history on click
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${status === 'syncing'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : status === 'success'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : status === 'error'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                title={status === 'error' ? errorMessage || 'Sync Error' : 'Sync Status'}
            >
                {status === 'syncing' && (
                    <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span className="hidden sm:inline">Syncing...</span>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <Check className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Synced</span>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Error</span>
                    </>
                )}
                {status === 'idle' && (
                    <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Sync</span>
                    </>
                )}
            </button>

            <SyncHistoryModal
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
            />
        </>
    );
}
