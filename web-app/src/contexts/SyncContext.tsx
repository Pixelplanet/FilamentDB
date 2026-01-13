'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { syncSpools, SyncResult } from '@/lib/storage/simpleSync';

interface SyncContextType {
    status: 'idle' | 'syncing' | 'success' | 'error';
    lastSyncResult: SyncResult | null;
    errorMessage: string | null;
    performSync: () => Promise<void>;
    queueSync: () => void; // Debounced sync trigger for automatic syncing
    isConfigured: boolean;
}

const SyncContext = createContext<SyncContextType | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
    const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isConfigured, setIsConfigured] = useState(false);
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const AUTOSYNC_INTERVAL_MS = 5 * 60 * 1000;
    const DEBOUNCE_MS = 2000; // 2 second debounce for automatic sync

    const performSync = useCallback(async () => {
        // Prevent multiple concurrent syncs
        if (status === 'syncing') return;

        const serverUrl = localStorage.getItem('sync_server_url');
        const apiKey = localStorage.getItem('sync_api_key');
        const token = localStorage.getItem('sync_auth_token');

        if (!serverUrl) {
            setIsConfigured(false);
            return;
        }

        setIsConfigured(true);
        setStatus('syncing');
        setErrorMessage(null);

        try {
            const result = await syncSpools({
                serverUrl,
                apiKey: apiKey || undefined,
                token: token || undefined
            });
            setLastSyncResult(result);

            if (result.summary.errorCount > 0) {
                setStatus('error');
                setErrorMessage(result.errors.join(', '));
            } else {
                setStatus('success');
                setTimeout(() => setStatus(prev => prev === 'success' ? 'idle' : prev), 30000);
            }

            // If we received changes (ingress), notify the app to reload views
            if (result.summary.ingressCount > 0) {
                window.dispatchEvent(new Event('filament-db-change'));
            }

            // Update last sync time in local storage for other components to see
            localStorage.setItem('sync_last_sync', Date.now().toString());

        } catch (e: any) {
            setStatus('error');
            setErrorMessage(e.message);
        }
    }, [status]);

    // Debounced sync trigger - call this after every local change
    const queueSync = useCallback(() => {
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }
        syncTimeoutRef.current = setTimeout(() => {
            performSync();
        }, DEBOUNCE_MS);
    }, [performSync]);

    useEffect(() => {
        const updateConfigStatus = () => {
            setIsConfigured(!!localStorage.getItem('sync_server_url'));
        };

        // Initial check
        updateConfigStatus();

        // Listen for storage changes
        window.addEventListener('storage', updateConfigStatus);

        const timer = setTimeout(performSync, 5000);
        const interval = setInterval(performSync, AUTOSYNC_INTERVAL_MS);

        const handleOnline = () => performSync();
        window.addEventListener('online', handleOnline);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('storage', updateConfigStatus);
        };
    }, [performSync]);

    return (
        <SyncContext.Provider value={{ status, lastSyncResult, errorMessage, performSync, queueSync, isConfigured }}>
            {children}
        </SyncContext.Provider>
    );
}

export function useSync() {
    const context = useContext(SyncContext);
    if (!context) throw new Error('useSync must be used within SyncProvider');
    return context;
}
