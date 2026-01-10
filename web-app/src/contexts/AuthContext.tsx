
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/auth/types';
import { authFetch } from '@/lib/api';
import { Capacitor } from '@capacitor/core';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<void>;
    loginWithGoogle: (credential: string) => Promise<void>;
    register: (username: string, password: string, displayName?: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    isAuthenticated: boolean;
    isAuthEnabled: boolean;
    isGoogleAuthEnabled: boolean;
    checkAuthConfig: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const [isAuthEnabled, setIsAuthEnabled] = useState(false);
    const [isGoogleAuthEnabled, setIsGoogleAuthEnabled] = useState(false);

    const fetchConfig = async () => {
        try {
            // Determine Base URL
            let baseUrl = '';
            // Only check server URL on native platforms
            if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
                const savedUrl = localStorage.getItem('sync_server_url');
                if (savedUrl) {
                    baseUrl = savedUrl.replace(/\/$/, '');
                } else {
                    // If native and no URL set, we can't fetch config.
                    return;
                }
            }

            const res = await fetch(`${baseUrl}/api/config/auth`);
            if (res.ok) {
                const data = await res.json();
                setIsAuthEnabled(data.enabled);
                setIsGoogleAuthEnabled(data.googleEnabled);
            }
        } catch (e) {
            console.error('Failed to fetch auth config', e);
        }
    };

    // Listen for storage events to update config when Server URL changes
    useEffect(() => {
        const handleStorageChange = () => {
            fetchConfig().then(fetchProfile);
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const fetchProfile = async () => {
        try {
            const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

            if (isNative) {
                // On mobile, check if we have a stored token
                const storedToken = localStorage.getItem('sync_auth_token');
                const serverUrl = localStorage.getItem('sync_server_url');

                if (!storedToken || !serverUrl) {
                    // No token stored = not logged in
                    setUser(null);
                    setLoading(false);
                    return;
                }

                // Fetch profile from remote server using stored token
                const res = await fetch(`${serverUrl.replace(/\/$/, '')}/api/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${storedToken}`
                    }
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.authenticated) {
                        setUser(data.user);
                    } else {
                        // Token invalid, clear it
                        localStorage.removeItem('sync_auth_token');
                        setUser(null);
                    }
                } else {
                    // Auth failed, clear token
                    localStorage.removeItem('sync_auth_token');
                    setUser(null);
                }
            } else {
                // Web: use cookie-based auth
                const res = await authFetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    if (data.authenticated) {
                        setUser(data.user);
                    } else {
                        setUser(null);
                    }
                } else {
                    setUser(null);
                }
            }
        } catch (e) {
            console.error('Failed to fetch auth profile', e);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig().then(fetchProfile);
    }, []);

    const login = async (username: string, password: string) => {
        const res = await authFetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Store token for mobile (cookies don't work cross-origin)
        if (Capacitor.isNativePlatform() && data.token) {
            localStorage.setItem('sync_auth_token', data.token);
        }

        setUser(data.user);
        router.push('/');
    };

    const register = async (username: string, password: string, displayName?: string) => {
        const res = await authFetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, displayName })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        // Store token for mobile
        if (Capacitor.isNativePlatform() && data.token) {
            localStorage.setItem('sync_auth_token', data.token);
        }

        setUser(data.user);
        router.push('/');
    };

    const loginWithGoogle = async (credential: string) => {
        const res = await authFetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Google login failed');
        }

        setUser(data.user);
        router.push('/');
    };

    const logout = async () => {
        // Clear stored token on mobile
        if (Capacitor.isNativePlatform()) {
            localStorage.removeItem('sync_auth_token');
        }

        // Calling logout endpoint (clears cookie on web)
        try {
            await authFetch('/api/auth/logout', { method: 'POST' });
        } catch { }

        setUser(null);
        router.push('/login');
    };

    const checkAuthConfig = async () => {
        await fetchConfig();
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            loginWithGoogle,
            register,
            logout,
            refreshProfile: fetchProfile,
            checkAuthConfig,
            isAuthenticated: !!user,
            isAuthEnabled,
            isGoogleAuthEnabled
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
