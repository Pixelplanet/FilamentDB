/**
 * Permanently Delete Spool API
 * 
 * DELETE /api/spools/deleted/[serial] - Permanently remove a deleted spool
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Directory paths
const DATA_DIR = process.env.DATA_DIR || './data';
const SPOOLS_DIR = path.join(DATA_DIR, 'spools');
const DELETED_DIR = path.join(SPOOLS_DIR, '.deleted');
const HISTORY_DIR = path.join(DATA_DIR, 'history');

/**
 * DELETE /api/spools/deleted/[serial]
 * Permanently remove a deleted spool and its history
 */
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ serial: string }> }
) {
    try {
        const params = await context.params;
        const serial = params.serial;

        const deletedPath = path.join(DELETED_DIR, `${serial}.json`);

        // Try to delete the spool file
        try {
            await fs.unlink(deletedPath);
        } catch (e: any) {
            if (e.code === 'ENOENT') {
                return NextResponse.json(
                    { error: 'Deleted spool not found' },
                    { status: 404 }
                );
            }
            throw e;
        }

        // Also delete history file if exists
        const historyPath = path.join(HISTORY_DIR, `${serial}.json`);
        try {
            await fs.unlink(historyPath);
        } catch (e) {
            // History may not exist, that's fine
        }

        // Also remove tombstone if exists
        const tombstonePath = path.join(SPOOLS_DIR, '.tombstones', `${serial}.json`);
        try {
            await fs.unlink(tombstonePath);
        } catch (e) {
            // Tombstone may not exist, that's fine
        }

        return NextResponse.json({
            success: true,
            permanentlyDeleted: serial
        });
    } catch (error) {
        console.error('Error permanently deleting spool:', error);
        return NextResponse.json(
            { error: 'Failed to permanently delete spool', details: String(error) },
            { status: 500 }
        );
    }
}
