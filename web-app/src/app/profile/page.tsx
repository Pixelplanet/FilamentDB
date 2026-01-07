'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PageTransition } from '@/components/PageTransition';
import { User, Mail, ShieldCheck, Link as LinkIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const { user, isGoogleAuthEnabled, isAuthEnabled, refreshProfile } = useAuth();
    const router = useRouter(); // Import this
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isAuthEnabled) {
            router.push('/');
        }
    }, [isAuthEnabled, router]);

    const handleGoogleLink = async (credential: string) => {
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch('/api/auth/link-google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to link account');

            setMessage('✅ Google Account linked successfully!');
            await refreshProfile();
        } catch (e: any) {
            setMessage(`❌ ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user || user.googleEmail || !isGoogleAuthEnabled) return;

        const initGoogle = () => {
            // @ts-ignore
            if (window.google && window.google.accounts) {
                // @ts-ignore
                window.google.accounts.id.initialize({
                    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
                    callback: (response: any) => handleGoogleLink(response.credential)
                });
                // @ts-ignore
                window.google.accounts.id.renderButton(
                    document.getElementById("googleLinkBtn"),
                    { theme: "outline", size: "large", width: "100%", text: "continue_with" }
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
    }, [user, isGoogleAuthEnabled]);

    if (!user) {
        return (
            <div className="p-8 text-center text-gray-500">
                Please log in to view your profile.
            </div>
        );
    }

    return (
        <PageTransition className="max-w-xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold">Profile</h1>

            {/* Profile Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4 mb-6">
                    {user.avatarUrl ? (
                        <img
                            src={user.avatarUrl}
                            alt={user.username}
                            className="w-20 h-20 rounded-full object-cover border-2 border-gray-100 dark:border-gray-700"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <User className="w-10 h-10" />
                        </div>
                    )}
                    <div>
                        <h2 className="text-xl font-bold">{user.displayName || user.username}</h2>
                        <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <User className="w-5 h-5 text-gray-400" />
                        <div>
                            <p className="text-xs text-gray-400">Username</p>
                            <p className="font-medium text-sm">{user.username}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <ShieldCheck className="w-5 h-5 text-gray-400" />
                        <div>
                            <p className="text-xs text-gray-400">Auth Provider</p>
                            <p className="font-medium text-sm capitalize">{user.authProvider}</p>
                        </div>
                    </div>

                    {user.googleEmail && (
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <div>
                                <p className="text-xs text-green-600 dark:text-green-400 font-medium">Linked Google Account</p>
                                <p className="font-medium text-sm">{user.googleEmail}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Account Linking */}
            {isGoogleAuthEnabled && !user.googleEmail && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <LinkIcon className="w-5 h-5" />
                        Link Account
                    </h3>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
                        <div className="flex gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <p className="text-sm text-blue-700 dark:text-blue-200">
                                Link your Google account to log in with either your username or your Google account.
                            </p>
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-lg mb-4 text-sm ${message.includes('❌')
                            ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                            : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            }`}>
                            {message}
                        </div>
                    )}

                    <div id="googleLinkBtn" className="w-full h-[40px] flex justify-center">
                        {/* Google Button Renders Here */}
                    </div>
                </div>
            )}
        </PageTransition>
    );
}
