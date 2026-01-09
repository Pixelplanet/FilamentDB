
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PageTransition } from '@/components/PageTransition';
import { Lock, User, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, loginWithGoogle, isGoogleAuthEnabled } = useAuth();


    const handleGoogleCallback = async (response: any) => {
        setIsLoading(true);
        try {
            await loginWithGoogle(response.credential);
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const initGoogle = () => {
            // @ts-ignore
            if (window.google && window.google.accounts) {
                // @ts-ignore
                window.google.accounts.id.initialize({
                    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
                    callback: handleGoogleCallback
                });
                // @ts-ignore
                window.google.accounts.id.renderButton(
                    document.getElementById("googleSignInBtn"),
                    { theme: "outline", size: "large", width: "100%" }
                );
            }
        };

        const interval = setInterval(() => {
            // @ts-ignore
            if (window.google) {
                initGoogle();
                clearInterval(interval);
            }
        }, 100);
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(username, password);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PageTransition className="flex flex-col items-center justify-center min-h-[60vh] p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 space-y-6">
                <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <LogIn className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold dark:text-white">Welcome Back</h1>
                    <p className="text-gray-500 dark:text-gray-300 text-sm mt-1">Sign in to manage your inventory</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* ... error and inputs ... */}
                    {error && (
                        <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                className="w-full pl-9 pr-3 py-2 bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                placeholder="Enter username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="password"
                                className="w-full pl-9 pr-3 py-2 bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>

                    {/* Use dynamic runtime config instead of build-time process.env */}
                    {isGoogleAuthEnabled && (
                        <>
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or continue with</span>
                                </div>
                            </div>

                            <div id="googleSignInBtn" className="w-full h-[40px] flex justify-center"></div>
                        </>
                    )}
                </form>


                <div className="text-center text-sm text-gray-500">
                    Don't have an account?{' '}
                    <Link href="/register" className="text-blue-600 hover:underline">
                        Create one
                    </Link>
                </div>
            </div>
        </PageTransition>
    );
}
