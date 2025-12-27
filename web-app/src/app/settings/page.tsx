'use client';

import { useState, useEffect } from 'react';
import { db } from '@/db';
import { Save, RefreshCw, Server, Download, Check, AlertTriangle, Search, Loader2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

export default function SettingsPage() {
    const [serverUrl, setServerUrl] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [syncStatus, setSyncStatus] = useState('');

    const spoolCount = useLiveQuery(() => db.spools.count());

    useEffect(() => {
        const stored = localStorage.getItem('filamentdb_server');
        if (stored) setServerUrl(stored);

        const last = localStorage.getItem('filamentdb_lastscan');
        if (last) setLastSync(last);
    }, []);

    const saveSettings = () => {
        localStorage.setItem('filamentdb_server', serverUrl);
        setSyncStatus('Settings Saved');
        setTimeout(() => setSyncStatus(''), 2000);
    };

    const [discovering, setDiscovering] = useState(false);

    const discoverServer = async () => {
        setDiscovering(true);
        setSyncStatus('Searching local network...');

        // Define common subnets to scan
        const subnets = ['192.168.1', '192.168.0', '192.168.178', '10.0.0'];
        const port = '3000';

        let found = false;

        // Helper to check a single IP
        const checkIp = async (ip: string) => {
            if (found) return;
            try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 1500); // Short timeout

                const res = await fetch(`http://${ip}:${port}/api/sync`, {
                    method: 'GET',
                    signal: controller.signal
                });
                clearTimeout(id);

                if (res.ok) {
                    const url = `http://${ip}:${port}`;
                    setServerUrl(url);
                    localStorage.setItem('filamentdb_server', url);
                    setSyncStatus(`Found: ${url}`);
                    found = true;
                }
            } catch (e) {
                // Ignore failures
            }
        };

        // Scan subnets in batches to avoid overwhelming the browser
        for (const subnet of subnets) {
            if (found) break;
            const tasks = [];
            for (let i = 1; i < 255; i++) {
                tasks.push(checkIp(`${subnet}.${i}`));
                if (tasks.length >= 20) { // Batch of 20
                    await Promise.all(tasks);
                    tasks.length = 0;
                    if (found) break;
                }
            }
            if (tasks.length > 0) await Promise.all(tasks);
        }

        if (!found) {
            setSyncStatus('Server not found. Please enter IP manually.');
        }
        setDiscovering(false);
    };

    const performSync = async () => {
        if (!serverUrl) return;
        setSyncing(true);
        setSyncStatus('Connecting...');

        try {
            // 1. Get Local Data
            const localSpools = await db.spools.toArray();

            // 2. Push to Server
            const res = await fetch(`${serverUrl}/api/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ spools: localSpools })
            });

            if (!res.ok) throw new Error(`Server Error: ${res.status}`);

            const data = await res.json();

            // 3. Pull / Merge (Server returned full list)
            if (data.serverSpools) {
                // Naive merge: Server authority for now, or just add missing
                // Let's use bulkPut to overwrite/add
                await db.spools.bulkPut(data.serverSpools);
            }

            const now = new Date().toLocaleString();
            localStorage.setItem('filamentdb_lastscan', now);
            setLastSync(now);
            setSyncStatus(`Sync Complete! (S: ${data.stats.total})`);

        } catch (e: any) {
            console.error(e);
            setSyncStatus(`Error: ${e.message}`);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold">Settings</h1>

            {/* Sync Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4 text-blue-600 font-semibold">
                    <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                    <span>Server Sync</span>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Server URL</label>
                        <div className="flex gap-2">
                            <input
                                placeholder="http://192.168.1.100:3000"
                                className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent"
                                value={serverUrl}
                                onChange={e => setServerUrl(e.target.value)}
                            />
                            <button
                                onClick={discoverServer}
                                disabled={discovering}
                                title="Auto-discover server"
                                className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                            >
                                {discovering ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                            </button>
                            <button onClick={saveSettings} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <Save className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Tap the search icon to find your Docker server automatically.</p>
                    </div>

                    <div className="pt-2">
                        <button
                            onClick={performSync}
                            disabled={!serverUrl || syncing}
                            className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold shadow-lg disabled:opacity-50 flex justify-center gap-2"
                        >
                            {syncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                    </div>

                    {syncStatus && (
                        <div className={`text-sm text-center font-mono p-2 rounded ${syncStatus.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {syncStatus}
                        </div>
                    )}

                    {lastSync && <p className="text-center text-xs text-gray-400">Last Sync: {lastSync}</p>}
                </div>
            </div>

            {/* APK Download (Visible if running in Browser/Server Mode) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-700 rounded-full">
                    <Download className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold">Download Android App</h3>
                    <p className="text-sm text-gray-500">Get the APK for your device.</p>
                </div>
                <a
                    href="/downloads/filamentdb.apk"
                    download
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm"
                >
                    Download
                </a>
            </div>

            <div className="text-center text-gray-400 text-sm">
                <p>Local DB Items: {spoolCount}</p>
                <p>Version: {process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0'} (Hybrid)</p>
            </div>
        </div>
    );
}
