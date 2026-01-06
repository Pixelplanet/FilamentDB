
import { useState, useEffect, useRef } from 'react';
import { syncSpools, SyncResult } from '@/lib/storage/simpleSync';

export function useAutoSync() {
    const [status, setStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
    const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Config
    const AUTOSYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    const performSync = async () => {
        const serverUrl = localStorage.getItem('sync_server_url');
        const apiKey = localStorage.getItem('sync_api_key');

        if (!serverUrl) return;

        setStatus('syncing');
        try {
            const result = await syncSpools({ serverUrl, apiKey: apiKey || undefined });
            setLastSyncResult(result);

            if (result.summary.errorCount > 0) {
                setStatus('error');
                setErrorMessage(result.errors.join(', '));
            } else {
                setStatus('success');
                // Revert to idle after 30 seconds so success icon doesn't persist forever
                setTimeout(() => setStatus('idle'), 30000);
            }
        } catch (e: any) {
            setStatus('error');
            setErrorMessage(e.message);
        }
    };

    useEffect(() => {
        // Initial sync on mount if configured
        const timer = setTimeout(() => {
            performSync();
        }, 2000); // Small delay to allow app to settle

        const interval = setInterval(performSync, AUTOSYNC_INTERVAL_MS);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, []);

    // Also listen for online status
    useEffect(() => {
        const handleOnline = () => performSync();
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    return {
        status,
        performSync,
        lastSyncResult,
        errorMessage
    };
}
