/**
 * Tombstones API - Get deleted spool records for sync
 * 
 * GET /api/sync/tombstones - Get all tombstones (deleted spool markers)
 */

import { NextResponse } from 'next/server';
import { getAllTombstones, purgeTombstones } from '@/lib/storage/tombstones';
import { SPOOLS_DIR } from '@/lib/storage/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sync/tombstones
 * Get all tombstone records for sync purposes
 */
export async function GET() {
    try {
        // Purge old tombstones first (cleanup)
        await purgeTombstones(SPOOLS_DIR);

        // Get all remaining tombstones
        const tombstones = await getAllTombstones(SPOOLS_DIR);

        return NextResponse.json({
            tombstones,
            count: tombstones.length
        });
    } catch (error) {
        console.error('Error getting tombstones:', error);
        return NextResponse.json(
            { error: 'Failed to get tombstones', details: String(error) },
            { status: 500 }
        );
    }
}
