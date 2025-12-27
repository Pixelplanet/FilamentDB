'use client';

import { useState, useEffect } from 'react';
import { db } from '@/db';
import { Save, RefreshCw, Server, Download, Check, AlertTriangle, Search, Loader2, Cloud, Lock } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { syncManager } from '@/lib/SyncManager';
import { PageTransition } from '@/components/PageTransition';

export default function SettingsPage() {
    const [serverUrl, setServerUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [syncStatus, setSyncStatus] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);

    const spoolCount = useLiveQuery(() => db.spools.count());

    useEffect(() => {
        // Load sync configuration
        const config = syncManager.getConfig();
        if (config) {
            setServerUrl(config.serverUrl);
            setApiKey(config.apiKey);
        }

        // Load last sync time
        const lastSyncTime = syncManager.getLastSyncTime();
        if (lastSyncTime > 0) {
            setLastSync(new Date(lastSyncTime).toLocaleString());
        }
    }, []);

    const saveSettings = () => {
        if (!serverUrl || !apiKey) {
            setSyncStatus('Error: Please enter both Server URL and API Key');
            return;
        }

        syncManager.saveConfig({ serverUrl, apiKey });
        setSyncStatus('✅ Settings Saved');
        setTimeout(() => setSyncStatus(''), 2000);
    };

    const performSync = async () => {
        if (!serverUrl || !apiKey) {
            setSyncStatus('Error: Please configure sync settings first');
            return;
        }

        setSyncing(true);
        setSyncStatus('🔄 Syncing...');

        try {
            const result = await syncManager.sync({ serverUrl, apiKey });

            if (result.success) {
                const now = new Date().toLocaleString();
                setLastSync(now);
                setSyncStatus(`✅ Sync Complete! ↑${result.stats.uploaded} ↓${result.stats.downloaded} 🔀${result.stats.conflictsResolved}`);

                // Auto-hide success message after 5 seconds
                setTimeout(() => setSyncStatus(''), 5000);
            } else {
                setSyncStatus(`❌ ${result.error}`);
            }

        } catch (e: any) {
            console.error(e);
            setSyncStatus(`❌ Error: ${e.message}`);
        } finally {
            setSyncing(false);
        }
    };

    const testConnection = async () => {
        if (!serverUrl) {
            setSyncStatus('Error: Please enter Server URL');
            return;
        }

        setSyncStatus('Testing connection...');

        try {
            const response = await fetch(`${serverUrl}/api/sync`, {
                method: 'GET'
            });

            if (response.ok) {
                const data = await response.json();
                setSyncStatus(`✅ Server found! Total spools on server: ${data.totalSpools || 0}`);
            } else {
                setSyncStatus(`❌ Server responded with error: ${response.status}`);
            }
        } catch (e: any) {
            setSyncStatus(`❌ Connection failed: ${e.message}`);
        }
    };

    const clearSyncData = () => {
        if (confirm('Clear sync configuration? This will not delete your local data.')) {
            syncManager.clearConfig();
            setServerUrl('');
            setApiKey('');
            setLastSync(null);
            setSyncStatus('Sync configuration cleared');
        }
    };

    return (
        <PageTransition className="max-w-xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold">Settings</h1>

            {/* Sync Configuration Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-400 font-semibold">
                    <Cloud className={`w-5 h-5 ${syncing ? 'animate-pulse' : ''}`} />
                    <span>Sync Configuration</span>
                </div>

                <div className="space-y-4">
                    {/* Server URL Input */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Server URL</label>
                        <div className="flex gap-2">
                            <input
                                placeholder="http://192.168.1.100:3000"
                                className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none"
                                value={serverUrl}
                                onChange={e => setServerUrl(e.target.value)}
                            />
                            <button
                                onClick={testConnection}
                                title="Test connection"
                                className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 transition-colors"
                            >
                                <Server className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Your self-hosted FilamentDB server address</p>
                    </div>

                    {/* API Key Input */}
                    <div>
                        <label className="block text-sm font-medium mb-1">API Key</label>
                        <div className="flex gap-2">
                            <input
                                type={showApiKey ? 'text' : 'password'}
                                placeholder="dev-key-change-in-production"
                                className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                            />
                            <button
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                <Lock className="w-5 h-5" />
                            </button>
                            <button
                                onClick={saveSettings}
                                className="p-2 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 transition-colors"
                            >
                                <Save className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Set in server's SYNC_API_KEY environment variable</p>
                    </div>

                    {/* Sync Button */}
                    <div className="pt-2">
                        <button
                            onClick={performSync}
                            disabled={!serverUrl || !apiKey || syncing}
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 transition-all"
                        >
                            {syncing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Syncing...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-5 h-5" />
                                    Sync Now
                                </>
                            )}
                        </button>
                    </div>

                    {/* Status Message */}
                    {syncStatus && (
                        <div className={`text-sm text-center font-mono p-3 rounded-lg ${syncStatus.includes('❌') || syncStatus.includes('Error')
                                ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                            }`}>
                            {syncStatus}
                        </div>
                    )}

                    {/* Last Sync Time */}
                    {lastSync && (
                        <p className="text-center text-xs text-gray-400">
                            Last sync: {lastSync}
                        </p>
                    )}

                    {/* Clear Config Button */}
                    <button
                        onClick={clearSyncData}
                        className="w-full text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 py-2"
                    >
                        Clear sync configuration
                    </button>
                </div>
            </div>

            {/* Sync Info Card */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    How Sync Works
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                    <li>Only changed spools are synced (delta sync)</li>
                    <li>Conflicts resolved by newest modification time</li>
                    <li>Works across unlimited devices</li>
                    <li>Your data stays on your server</li>
                </ul>
            </div>

            {/* APK Download */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full">
                    <Download className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold">Download Android App</h3>
                    <p className="text-sm text-gray-500">Get the APK for your device.</p>
                </div>
                <a
                    href="https://github.com/Pixelplanet/FilamentDB/releases/latest/download/filamentdb.apk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                    Download
                </a>
            </div>

            {/* App Info */}
            <div className="text-center text-gray-400 text-sm space-y-1">
                <p>Local spools: <span className="font-mono font-bold">{spoolCount}</span></p>
                <p>Version: {process.env.NEXT_PUBLIC_APP_VERSION || '0.1.5'} (Hybrid)</p>
                <p className="text-xs">Device ID: {typeof window !== 'undefined' ? localStorage.getItem('filamentdb_device_id') || 'Not set' : 'Loading...'}</p>
            </div>
        </PageTransition>
    );
}
