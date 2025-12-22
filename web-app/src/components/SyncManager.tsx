'use client';

import { useEffect, useRef } from 'react';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';

export function SyncManager() {
    const isInitialSyncDone = useRef(false);
    const lastChangeCount = useRef(0);

    // Watch for count changes as a simple trigger for "something changed"
    const spoolCount = useLiveQuery(() => db.spools.count());

    useEffect(() => {
        const serverUrl = localStorage.getItem('filamentdb_server');
        if (!serverUrl) return;

        const performSync = async () => {
            console.log('[SyncManager] Starting Auto-Sync...');
            try {
                // 1. Get Local Data
                const localSpools = await db.spools.toArray();

                // 2. Sync with Server
                const res = await fetch(`${serverUrl}/api/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ spools: localSpools })
                });

                if (!res.ok) throw new Error(`Server Error: ${res.status}`);

                const data = await res.json();

                // 3. Pull / Merge (Server returned full list)
                if (data.serverSpools) {
                    await db.spools.bulkPut(data.serverSpools);
                    console.log(`[SyncManager] Sync Success: ${data.stats.total} total spools.`);
                }

                localStorage.setItem('filamentdb_lastscan', new Date().toLocaleString());

            } catch (e) {
                console.error('[SyncManager] Auto-Sync Failed:', e);
            }
        };

        // Trigger 1: Initial load
        if (!isInitialSyncDone.current) {
            performSync();
            isInitialSyncDone.current = true;
            if (spoolCount !== undefined) lastChangeCount.current = spoolCount;
            return;
        }

        // Trigger 2: Data change (detected via count change)
        if (spoolCount !== undefined && spoolCount !== lastChangeCount.current) {
            performSync();
            lastChangeCount.current = spoolCount;
        }

    }, [spoolCount]);

    return null; // Side-effect only component
}
