'use client';

import { useState, useEffect } from 'react';
import { Save, RefreshCw, Server, Download, Check, AlertTriangle, Search, Loader2, Cloud, Lock, FileCode, Book, FlaskConical, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { PageTransition } from '@/components/PageTransition';
import { syncSpools } from '@/lib/storage/simpleSync';
import { useSpools } from '@/hooks/useFileStorage';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck } from 'lucide-react';

export default function SettingsPage() {
    const [serverUrl, setServerUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [syncStatus, setSyncStatus] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const { user } = useAuth();

    // New Sync Auth
    const [syncToken, setSyncToken] = useState<string | null>(null);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [loginUser, setLoginUser] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    const { spools } = useSpools();
    const spoolCount = spools?.length || 0;

    useEffect(() => {
        // Load sync configuration from localStorage
        const savedUrl = localStorage.getItem('sync_server_url');
        const savedKey = localStorage.getItem('sync_api_key');
        const savedLastSync = localStorage.getItem('sync_last_sync');
        const savedToken = localStorage.getItem('sync_auth_token'); // New

        if (savedUrl) setServerUrl(savedUrl);
        if (savedKey) setApiKey(savedKey);
        if (savedToken) setSyncToken(savedToken);
        if (savedLastSync) {
            setLastSync(new Date(parseInt(savedLastSync)).toLocaleString());
        }
    }, []);

    const saveSettings = () => {
        if (!serverUrl) {
            setSyncStatus('Error: Server URL Required');
            return;
        }

        localStorage.setItem('sync_server_url', serverUrl);
        if (apiKey) localStorage.setItem('sync_api_key', apiKey);

        // Force update context
        window.dispatchEvent(new Event('storage'));

        setSyncStatus('✅ Settings Saved');
        setTimeout(() => setSyncStatus(''), 2000);
    };

    const handleRemoteLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!serverUrl) {
            alert('Please enter Server URL first');
            return;
        }

        setLoginLoading(true);
        try {
            // Login to REMOTE server
            // Ensure URL doesn't have trailing slash
            const base = serverUrl.replace(/\/$/, '');
            const res = await fetch(`${base}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: loginUser, password: loginPass })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');

            // Assume the token is returned in cookie usually, BUT for cross-origin / mobile app to external server,
            // we probably need the token in the BODY.
            // My current login API endpoint sets a cookie. 
            // Does it return the token in body? Yes, I added that in Session 2.

            if (data.token) {
                localStorage.setItem('sync_auth_token', data.token);
                setSyncToken(data.token);
                // Also save server URL
                localStorage.setItem('sync_server_url', serverUrl);

                setShowLoginModal(false);
                setSyncStatus('✅ Logged in successfully');
            } else {
                throw new Error('No token returned from server');
            }

        } catch (e: any) {
            alert(e.message);
        } finally {
            setLoginLoading(false);
        }
    }

    const clearToken = () => {
        localStorage.removeItem('sync_auth_token');
        setSyncToken(null);
    };

    const performSync = async () => {
        if (!serverUrl || (!apiKey && !syncToken)) {
            setSyncStatus('Error: Configure sync settings first');
            return;
        }

        setSyncing(true);
        setSyncStatus('🔄 Syncing...');

        try {
            // Determine auth method
            // If token exists, use it. Else API Key.
            const result = await syncSpools({
                serverUrl,
                apiKey: syncToken ? undefined : apiKey,
                token: syncToken || undefined
            });

            const now = Date.now();
            localStorage.setItem('sync_last_sync', now.toString());
            setLastSync(new Date(now).toLocaleString());

            setSyncStatus(
                `✅ Sync Complete! ⬆️  ${result.summary.uploadCount} uploaded, ⬇️  ${result.summary.downloadCount} downloaded${result.summary.errorCount > 0 ? `, ❌ ${result.summary.errorCount} errors` : ''}`
            );

            // Auto-hide success message after 5 seconds
            setTimeout(() => setSyncStatus(''), 5000);

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
            const response = await fetch(`${serverUrl}/api/spools`, {
                method: 'GET'
            });

            if (response.ok) {
                const data = await response.json();
                setSyncStatus(`✅ Server found! Total spools on server: ${data.length || 0}`);
            } else {
                setSyncStatus(`❌ Server responded with error: ${response.status}`);
            }
        } catch (e: any) {
            setSyncStatus(`❌ Connection failed: ${e.message}`);
        }
    };

    const clearSyncData = () => {
        if (confirm('Clear sync configuration? This will not delete your local data.')) {
            localStorage.removeItem('sync_server_url');
            localStorage.removeItem('sync_api_key');
            localStorage.removeItem('sync_last_sync');
            localStorage.removeItem('sync_auth_token');
            window.dispatchEvent(new Event('storage'));
            setServerUrl('');
            setApiKey('');
            setSyncToken(null);
            setLastSync(null);
            setSyncStatus('Sync configuration cleared');
        }
    };

    return (
        <PageTransition className="max-w-xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold">Settings</h1>

            {/* User Management (Admin Only) */}
            {user?.role === 'admin' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4">
                    <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-full">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold">User Management</h3>
                        <p className="text-sm text-gray-500">Manage users, roles and permissions</p>
                    </div>
                    <Link
                        href="/admin/users"
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                    >
                        <ShieldCheck className="w-4 h-4" />
                        Manage
                    </Link>
                </div>
            )}

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

                    {/* API Key or Login */}
                    {!syncToken ? (
                        <div>
                            <label className="block text-sm font-medium mb-1">Authentication</label>
                            <div className="flex gap-2">
                                {/* Toggle between API Key and Login */}
                                <input
                                    type={showApiKey ? 'text' : 'password'}
                                    placeholder="API Key for System Sync"
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
                            </div>

                            <div className="mt-2 flex items-center gap-2">
                                <span className="text-xs text-gray-400">OR</span>
                                <button
                                    onClick={() => setShowLoginModal(true)}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Login with User Account
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Use API Key for system sync, or User Login for personal sync.</p>
                        </div>
                    ) : (
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                <ShieldCheck className="w-5 h-5" />
                                <span className="text-sm font-medium">Authenticated per user</span>
                            </div>
                            <button
                                onClick={clearToken}
                                className="text-xs text-red-500 hover:text-red-600 font-medium"
                            >
                                Disconnect
                            </button>
                        </div>
                    )}

                    {/* API Key Save Button if not logged in */}
                    {!syncToken && (
                        <button
                            onClick={saveSettings}
                            className="w-full py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex justify-center items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Save API Key
                        </button>
                    )}

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
                <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-800">
                    <Link href="/settings/history" className="text-sm font-medium text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 flex items-center gap-1 group">
                        View Detailed History
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>

            {/* API Documentation */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-full">
                    <FileCode className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold">API Documentation</h3>
                    <p className="text-sm text-gray-500">Interactive API reference with live testing</p>
                </div>
                <a
                    href="/api-docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                >
                    <Book className="w-4 h-4" />
                    View Docs
                </a>
            </div>

            {/* Material Profiles */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-full">
                    <FlaskConical className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold">Material Profiles</h3>
                    <p className="text-sm text-gray-500">Manage material types and default temperatures</p>
                </div>
                <Link
                    href="/settings/materials"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                >
                    <FlaskConical className="w-4 h-4" />
                    Manage
                </Link>
            </div>

            {/* NFC Tag Statistics */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-full">
                    <Search className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold">NFC Tag Statistics</h3>
                    <p className="text-sm text-gray-500">Track tag usage, reuse frequency, and history</p>
                </div>
                <a
                    href="/tag-stats"
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                >
                    <Search className="w-4 h-4" />
                    View Stats
                </a>
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
            {/* Login Modal */}
            {showLoginModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-bold mb-4">Remote Login</h3>
                        <form onSubmit={handleRemoteLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Username</label>
                                <input
                                    type="text"
                                    className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
                                    value={loginUser}
                                    onChange={e => setLoginUser(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Password</label>
                                <input
                                    type="password"
                                    className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
                                    value={loginPass}
                                    onChange={e => setLoginPass(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowLoginModal(false)}
                                    className="flex-1 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loginLoading}
                                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
                                >
                                    {loginLoading ? 'Logging in...' : 'Login'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </PageTransition >
    );
}
