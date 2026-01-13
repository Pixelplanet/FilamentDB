/**
 * useSpools Hook
 * 
 * Hook for managing spools with file-based storage
 * Replaces useLiveQuery from Dexie
 */

import { useState, useEffect, useCallback } from 'react';
import { Spool } from '@/db';
import { getStorage } from '@/lib/storage';

/**
 * Hook to get all spools
 */
// Event name for checking updates
const DB_CHANGE_EVENT = 'filament-db-change';

/**
 * Hook to get all spools
 */
export function useSpools() {
    const [spools, setSpools] = useState<Spool[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchSpools = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const storage = getStorage();
            const data = await storage.listSpools();
            setSpools(data);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSpools();

        const handleDbChange = () => fetchSpools();
        window.addEventListener(DB_CHANGE_EVENT, handleDbChange);
        return () => window.removeEventListener(DB_CHANGE_EVENT, handleDbChange);
    }, [fetchSpools]);

    return {
        spools,
        loading,
        error,
        refresh: fetchSpools
    };
}

/**
 * Hook to get a single spool by serial
 */
export function useSpool(serial: string | null, initialData?: Spool | null) {
    const [spool, setSpool] = useState<Spool | null>(initialData || null);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState<Error | null>(null);

    const fetchSpool = useCallback(async () => {
        if (!serial) {
            setSpool(null);
            setLoading(false);
            return;
        }

        try {
            // Only set loading true if we don't have data
            if (!spool && !initialData) setLoading(true);

            setError(null);
            const storage = getStorage();
            const data = await storage.getSpool(serial);
            setSpool(data);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    }, [serial]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchSpool();

        const handleDbChange = () => fetchSpool();
        window.addEventListener(DB_CHANGE_EVENT, handleDbChange);
        return () => window.removeEventListener(DB_CHANGE_EVENT, handleDbChange);
    }, [fetchSpool]);

    return {
        spool,
        loading,
        error,
        refresh: fetchSpool
    };
}

/**
 * Hook for spool mutations (create, update, delete)
 * @param options - Optional callbacks
 * @param options.onMutation - Called after successful create/update/delete (use for auto-sync)
 */
export function useSpoolMutations(options?: { onMutation?: () => void }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const notifyChange = useCallback(() => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event(DB_CHANGE_EVENT));
        }
    }, []);

    const createSpool = useCallback(async (spool: Spool) => {
        try {
            setLoading(true);
            setError(null);
            const storage = getStorage();
            await storage.saveSpool(spool);
            options?.onMutation?.();
            notifyChange();
            return true;
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
            return false;
        } finally {
            setLoading(false);
        }
    }, [options?.onMutation, notifyChange]);

    const updateSpool = useCallback(async (serial: string, updates: Partial<Spool>) => {
        try {
            setLoading(true);
            setError(null);
            const storage = getStorage();

            // Get existing spool
            const existing = await storage.getSpool(serial);
            if (!existing) {
                throw new Error(`Spool not found: ${serial}`);
            }

            // Merge updates
            const updated = { ...existing, ...updates };
            await storage.saveSpool(updated);
            options?.onMutation?.();
            notifyChange();
            return true;
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
            return false;
        } finally {
            setLoading(false);
        }
    }, [options?.onMutation, notifyChange]);

    const deleteSpool = useCallback(async (serial: string) => {
        try {
            setLoading(true);
            setError(null);
            const storage = getStorage();
            await storage.deleteSpool(serial);
            options?.onMutation?.();
            notifyChange();
            return true;
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
            return false;
        } finally {
            setLoading(false);
        }
    }, [options?.onMutation, notifyChange]);

    return {
        createSpool,
        updateSpool,
        deleteSpool,
        loading,
        error
    };
}

/**
 * Hook to search spools
 */
export function useSpoolSearch(query: string) {
    const [results, setResults] = useState<Spool[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Initial search
    useEffect(() => {
        const search = async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const storage = getStorage();
                const data = await storage.searchSpools(query);
                setResults(data);
            } catch (err) {
                setError(err instanceof Error ? err : new Error(String(err)));
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(search, 300);
        return () => clearTimeout(debounce);
    }, [query]);

    // We could add DB_CHANGE_EVENT listener here too if we want live search results, 
    // but usually search is triggered by typing. 
    // Let's keep it simple for now, but adding it wouldn't hurt. Since this has a debounce, it's slightly more complex to hook up cleanly.

    return {
        results,
        loading,
        error
    };
}

/**
 * Hook to get storage stats
 */
export function useStorageStats() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const storage = getStorage();
            const data = await storage.getStats();
            setStats(data);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();

        const handleDbChange = () => fetchStats();
        window.addEventListener(DB_CHANGE_EVENT, handleDbChange);
        return () => window.removeEventListener(DB_CHANGE_EVENT, handleDbChange);
    }, [fetchStats]);

    return {
        stats,
        loading,
        error,
        refresh: fetchStats
    };
}
