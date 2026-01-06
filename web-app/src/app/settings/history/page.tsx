
'use client';

import { useState, useEffect } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { ArrowLeft, RotateCcw, ArrowRight, Download, Upload, Check, X, Clock, Trash2, Server } from 'lucide-react';
import Link from 'next/link';
import { getSyncHistory, undoSync, SyncLogEntry } from '@/lib/storage/syncHistory';

interface ServerLogEntry {
    id: string;
    timestamp: number;
    clientIp?: string;
    changesCount: number;
    deletionsCount: number;
    userAgent?: string;
    status: 'success' | 'failed';
    error?: string;
}

export default function SyncHistoryPage() {
    const [history, setHistory] = useState<SyncLogEntry[]>([]);
    const [uistory, setUistory] = useState<SyncLogEntry[]>([]); // Typo kept to avoid massive diff, just kidding.
    const [serverLogs, setServerLogs] = useState<ServerLogEntry[]>([]);
    const [undoing, setUndoing] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'incoming' | 'outgoing' | 'server'>('all');
    const [serverLoading, setServerLoading] = useState(false);

    useEffect(() => {
        loadHistory();
    }, []);

    // Load server history when filter is set to server
    useEffect(() => {
        if (filter === 'server') {
            loadServerHistory();
        }
    }, [filter]);

    const loadHistory = async () => {
        const logs = await getSyncHistory();
        setHistory(logs);
    };

    const loadServerHistory = async () => {
        const url = localStorage.getItem('sync_server_url');
        const apiKey = localStorage.getItem('sync_api_key');

        if (!url || !apiKey) {
            setMessage('Sync not configured, cannot fetch server logs');
            return;
        }

        setServerLoading(true);
        try {
            const res = await fetch(`${url}/api/sync?logs=true`, {
                headers: {
                    'x-api-key': apiKey
                }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setServerLogs(data.logs);
                } else {
                    setMessage('Failed to fetch server logs: ' + data.error);
                }
            } else {
                setMessage('Server error fetching logs');
            }
        } catch (e: any) {
            setMessage('Network error fetching server logs: ' + e.message);
        } finally {
            setServerLoading(false);
        }
    };

    const handleUndo = async (id: string) => {
        if (!confirm('Are you sure you want to undo these changes? This will revert local files to their previous state.')) return;

        setUndoing(id);
        const result = await undoSync(id);
        setMessage(result.message);
        setUndoing(null);

        if (result.success) {
            loadHistory();
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const clearHistory = () => {
        if (confirm('Clear all local sync history logs?')) {
            localStorage.removeItem('filamentdb_sync_history');
            setHistory([]);
        }
    };

    const filteredHistory = history.filter(log => {
        if (filter === 'all') return true;
        if (filter === 'server') return false;
        return log.direction === filter;
    });

    return (
        <PageTransition className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/settings" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-3xl font-bold">Sync History</h1>
                </div>
                {filter !== 'server' && (
                    <button
                        onClick={clearHistory}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2 text-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                        Clear Logs
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
                {(['all', 'incoming', 'outgoing', 'server'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === f
                                ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                    >
                        {f === 'server' ? (
                            <span className="flex items-center gap-2">
                                <Server className="w-4 h-4" />
                                Server Logs
                            </span>
                        ) : (
                            f.charAt(0).toUpperCase() + f.slice(1)
                        )}
                    </button>
                ))}
            </div>

            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${message.includes('failed') || message.includes('error') || message.includes('cannot')
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}>
                    {(message.includes('failed') || message.includes('error')) ? <X className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                    {message}
                </div>
            )}

            {/* Server Logs View */}
            {filter === 'server' ? (
                <div className="space-y-4">
                    {serverLoading ? (
                        <div className="text-center py-12">
                            <Clock className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-500" />
                            <p>Fetching logs from server...</p>
                        </div>
                    ) : serverLogs.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                            <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No server logs found or not connected</p>
                        </div>
                    ) : (
                        serverLogs.map(log => (
                            <div key={log.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded-full">
                                            <Upload className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-semibold">Incoming Sync Request</div>
                                            <div className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs font-bold ${log.status === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {log.status.toUpperCase()}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm mt-3 bg-gray-50 dark:bg-gray-900/30 p-3 rounded-lg">
                                    <div>
                                        <span className="text-gray-500 block text-xs uppercase">Client IP</span>
                                        <span className="font-mono">{log.clientIp}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-xs uppercase">Device</span>
                                        <span className="truncate block" title={log.userAgent}>{log.userAgent?.split('(')[0] || 'Unknown'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-xs uppercase">Changes</span>
                                        <span className="font-bold text-blue-600">{log.changesCount}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-xs uppercase">Deletions</span>
                                        <span className="font-bold text-red-600">{log.deletionsCount}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                /* Local Client Logs View */
                <div className="space-y-4">
                    {filteredHistory.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No local sync history found</p>
                        </div>
                    ) : (
                        filteredHistory.map(log => (
                            <div key={log.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                {/* Log Header */}
                                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${log.direction === 'incoming'
                                                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                            }`}>
                                            {log.direction === 'incoming' ? <Download className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <div className="font-semibold flex items-center gap-2">
                                                {log.direction === 'incoming' ? 'Pulled from Server' : 'Pushed to Server'}
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${log.status === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
                                                    }`}>
                                                    {log.status.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-500 flex items-center gap-4">
                                                <span>{new Date(log.timestamp).toLocaleString()}</span>
                                                {log.serverUrl && <span className="font-mono text-xs opacity-75">{log.serverUrl}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {log.changes.length > 0 && log.direction === 'incoming' && (
                                        <button
                                            onClick={() => handleUndo(log.id)}
                                            disabled={!!undoing}
                                            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800 transition-colors flex items-center gap-2"
                                        >
                                            {undoing === log.id ? (
                                                <span className="animate-pulse">Undoing...</span>
                                            ) : (
                                                <>
                                                    <RotateCcw className="w-4 h-4" />
                                                    Undo Changes
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* Changes List */}
                                <div className="p-4">
                                    {log.changes.length === 0 ? (
                                        <p className="text-sm text-gray-500 italic">No changes recorded (Sync check only)</p>
                                    ) : (
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Affected Items</h4>
                                            {log.changes.map((change, i) => (
                                                <div key={i} className="flex items-center gap-3 text-sm p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <span className={`font-bold text-xs uppercase w-16 text-center py-1 rounded ${change.action === 'created'
                                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                        }`}>
                                                        {change.action}
                                                    </span>
                                                    <div className="flex-1">
                                                        <span className="font-medium">{change.newSpool.brand} {change.newSpool.type}</span>
                                                        <span className="mx-2 text-gray-300">|</span>
                                                        <span className="text-gray-500">{change.newSpool.color}</span>
                                                    </div>
                                                    <span className="font-mono text-xs text-gray-400">{change.serial}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {log.error && (
                                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                                            <strong>Error:</strong> {log.error}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </PageTransition>
    );
}
