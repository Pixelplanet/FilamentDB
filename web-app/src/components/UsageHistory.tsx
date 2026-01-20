'use client';

import React, { useState, useEffect } from 'react';
import { History, Plus, AlertTriangle, Loader2, Calendar, Scale, Hammer, RefreshCw } from 'lucide-react';
import { getStorage } from '@/lib/storage';
import { UsageLog } from '@/db';

interface UsageHistoryProps {
    serial: string;
}

export function UsageHistory({ serial }: UsageHistoryProps) {
    const [history, setHistory] = useState<UsageLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [amount, setAmount] = useState('');
    const [action, setAction] = useState<'print' | 'correction'>('print');

    const loadHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            const storage = getStorage();
            const logs = await storage.getUsageHistory(serial);
            // Sort by timestamp descending
            setHistory(logs.sort((a, b) => b.timestamp - a.timestamp));
        } catch (e: any) {
            setError(e.message || 'Failed to load usage history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, [serial]);

    const handleAddLog = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        setError(null);
        try {
            const storage = getStorage();

            // Get current spool to calculate weights
            const spool = await storage.getSpool(serial);
            if (!spool) throw new Error('Spool not found');

            const previousWeight = spool.weightRemaining;
            const newWeight = action === 'print'
                ? previousWeight - numAmount
                : previousWeight; // Correction might not change weight, or handle it differently?
            // Actually, if we log a correction, we usually want to update the weight too.
            // But let's keep it simple: this just logs. The weight update should happen in SpoolForm.
            // Or we can do both here if we want this to be a "quick use" tool.

            const log: UsageLog = {
                id: crypto.randomUUID(),
                spoolId: serial,
                timestamp: Date.now(),
                amount: numAmount,
                previousWeight,
                newWeight: action === 'print' ? Math.max(0, newWeight) : previousWeight,
                action
            };

            await storage.logUsage(log);

            // If it was a print, we SHOULD update the spool weight
            if (action === 'print') {
                await storage.saveSpool({
                    ...spool,
                    weightRemaining: Math.max(0, newWeight),
                    lastUpdated: Date.now()
                });
                window.dispatchEvent(new Event('filament-db-change'));
            }

            setAmount('');
            setIsAdding(false);
            await loadHistory();
        } catch (e: any) {
            setError(e.message || 'Failed to add usage log');
        }
    };

    if (loading && history.length === 0) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-500" />
                    Usage History
                </h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                    <Plus className="w-4 h-4" />
                    Add Entry
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAddLog} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Amount (g)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="0.0"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900"
                                autoFocus
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
                            <select
                                value={action}
                                onChange={e => setAction(e.target.value as any)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900"
                            >
                                <option value="print">Print Consumption</option>
                                <option value="correction">Manual Correction</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsAdding(false)}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Save Entry
                        </button>
                    </div>
                </form>
            )}

            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {history.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p>No usage recorded yet</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {history.map((log) => (
                        <div
                            key={log.id}
                            className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${log.action === 'print' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600'}`}>
                                    {log.action === 'print' ? <Hammer className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                        {log.amount}g {log.action === 'print' ? 'used for print' : 'correction'}
                                    </div>
                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(log.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-gray-400">Remaining</div>
                                <div className="font-mono text-sm font-bold text-gray-700 dark:text-gray-300">
                                    {log.newWeight}g
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
