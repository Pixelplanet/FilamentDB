
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageTransition } from '@/components/PageTransition';
import { ShieldCheck, Database, Lock, Globe, Trash2 } from 'lucide-react';
import { authFetch } from '@/lib/api';

type MigrationStrategy = 'assign_private' | 'make_public' | 'delete' | 'none';

export default function SetupPage() {
    const router = useRouter();
    const { refreshProfile } = useAuth();

    // State
    const [step, setStep] = useState<'loading' | 'account' | 'migration'>('loading');
    const [spoolCount, setSpoolCount] = useState(0);

    // Form
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [migrationStrategy, setMigrationStrategy] = useState<MigrationStrategy>('assign_private');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const res = await authFetch('/api/auth/setup-status');
            const data = await res.json();

            if (data.isSetup) {
                router.push('/login');
                return;
            }

            setSpoolCount(data.existingSpoolCount || 0);
            setStep('account');
        } catch {
            setError('Failed to connect to server');
        }
    };

    const handleAccountSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        if (spoolCount > 0) {
            setStep('migration');
        } else {
            completeSetup('none');
        }
    };

    const completeSetup = async (strategy: MigrationStrategy) => {
        setIsLoading(true);
        setError('');

        try {
            const res = await authFetch('/api/auth/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    password,
                    displayName,
                    migrationStrategy: strategy
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            await refreshProfile();
            router.push('/');

        } catch (e: any) {
            setError(e.message);
            setIsLoading(false);
        }
    };

    if (step === 'loading') return null;

    return (
        <PageTransition className="flex flex-col items-center justify-center min-h-[80vh] p-4">
            <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold">Server Setup</h1>
                    <p className="text-gray-500 mt-2">Create the Admin account to secure your FilamentDB instance.</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                        {error}
                    </div>
                )}

                {step === 'account' && (
                    <form onSubmit={handleAccountSubmit} className="space-y-6 max-w-md mx-auto">
                        <div>
                            <label className="block text-sm font-medium mb-1">Username</label>
                            <input
                                type="text"
                                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-lg"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Display Name</label>
                            <input
                                type="text"
                                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-lg"
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Password</label>
                            <input
                                type="password"
                                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-lg"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                            <p className="text-xs text-gray-500 mt-1">Min. 8 characters</p>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                        >
                            Next Step
                        </button>
                    </form>
                )}

                {step === 'migration' && (
                    <div className="space-y-6">
                        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg flex items-start gap-4">
                            <Database className="w-6 h-6 text-yellow-600 shrink-0 mt-1" />
                            <div>
                                <h3 className="font-bold text-yellow-800 dark:text-yellow-500">Existing Data Found</h3>
                                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                    We found <strong>{spoolCount}</strong> existing spools in your database.
                                    How would you like to handle them?
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            <button
                                onClick={() => setMigrationStrategy('assign_private')}
                                className={`p-4 border-2 rounded-xl text-left transition-all ${migrationStrategy === 'assign_private'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                                    }`}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <Lock className="w-5 h-5 text-blue-600" />
                                    <span className="font-bold">Private (My Inventory)</span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    Assign all spools to me. Only I can see them initially.
                                </p>
                            </button>

                            <button
                                onClick={() => setMigrationStrategy('make_public')}
                                className={`p-4 border-2 rounded-xl text-left transition-all ${migrationStrategy === 'make_public'
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                                    }`}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <Globe className="w-5 h-5 text-green-600" />
                                    <span className="font-bold">Public (Shared Server)</span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    Assign ownership to me, but make them visible to everyone on this server.
                                </p>
                            </button>

                            <button
                                onClick={() => setMigrationStrategy('delete')}
                                className={`p-4 border-2 rounded-xl text-left transition-all ${migrationStrategy === 'delete'
                                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-red-300'
                                    }`}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <Trash2 className="w-5 h-5 text-red-600" />
                                    <span className="font-bold">Delete</span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    Start fresh. Delete all existing spools.
                                </p>
                            </button>
                        </div>

                        <button
                            onClick={() => completeSetup(migrationStrategy)}
                            disabled={isLoading}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 mt-4"
                        >
                            {isLoading ? 'Setting up Server...' : 'Complete Setup'}
                        </button>
                    </div>
                )}
            </div>
        </PageTransition>
    );
}
