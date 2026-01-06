
'use client';

import { useState, useEffect } from 'react';
import { X, RotateCcw, Check, AlertTriangle, ArrowRight, ArrowLeft, ArrowLeftRight } from 'lucide-react';
import { getSyncHistory, undoSync, SyncLogEntry } from '@/lib/storage/syncHistory';

interface SyncHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SyncHistoryModal({ isOpen, onClose }: SyncHistoryModalProps) {
    const [history, setHistory] = useState<SyncLogEntry[]>([]);
    const [undoing, setUndoing] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadHistory();
        }
    }, [isOpen]);

    const loadHistory = async () => {
        const logs = await getSyncHistory();
        setHistory(logs);
    };

    const handleUndo = async (id: string) => {
        if (!confirm('Are you sure you want to undo these changes? This will revert local files to their previous state.')) return;

        setUndoing(id);
        const result = await undoSync(id);
        setMessage(result.message);
        setUndoing(null);

        if (result.success) {
            setTimeout(onClose, 1500); // Close after success
            loadHistory(); // Refresh
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[80vh] rounded-xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-800">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <ArrowLeftRight className="w-5 h-5 text-blue-500" />
                        Sync History
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {message && (
                        <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm mb-4">
                            {message}
                        </div>
                    )}

                    {history.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">No sync history available</p>
                    ) : (
                        history.map(log => (
                            <div key={log.id} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-900/50">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {log.status.toUpperCase()}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="text-sm font-medium">
                                            {log.changes.length} changes
                                        </div>
                                    </div>

                                    {log.changes.length > 0 && (
                                        <button
                                            onClick={() => handleUndo(log.id)}
                                            disabled={!!undoing}
                                            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors flex items-center gap-1"
                                        >
                                            {undoing === log.id ? 'Undoing...' : (
                                                <>
                                                    <RotateCcw className="w-3 h-3" />
                                                    Undo Changes
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* Changes List */}
                                <div className="space-y-1 mt-2">
                                    {log.changes.map((change, i) => (
                                        <div key={i} className="text-xs flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            {change.action === 'created' ? (
                                                <span className="text-green-600 font-bold w-12 text-center">CREATE</span>
                                            ) : (
                                                <span className="text-orange-600 font-bold w-12 text-center">UPDATE</span>
                                            )}
                                            <span className="font-mono">{change.serial}</span>
                                            <span className="text-gray-400">-</span>
                                            <span>{change.newSpool.brand} {change.newSpool.type}</span>
                                        </div>
                                    ))}
                                </div>

                                {log.error && (
                                    <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                                        Error: {log.error}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
