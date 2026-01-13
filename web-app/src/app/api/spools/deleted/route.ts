/**
 * Deleted Spools API (Recycle Bin)
 * 
 * GET /api/spools/deleted - List all deleted spools
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Spool } from '@/db';
import { safeJSONParse } from '@/lib/storage/fileUtils';

// Directory where deleted spool files are stored
const DATA_DIR = process.env.DATA_DIR || './data';
const DELETED_DIR = path.join(DATA_DIR, 'spools', '.deleted');

// Ensure deleted directory exists
async function ensureDeletedDir() {
    try {
        await fs.mkdir(DELETED_DIR, { recursive: true });
    } catch (e) {
        // Directory exists
    }
}

/**
 * GET /api/spools/deleted
 * List all deleted spools in the recycle bin
 */
export async function GET(req: NextRequest) {
    try {
        await ensureDeletedDir();

        const files = await fs.readdir(DELETED_DIR);
        const jsonFiles = files.filter(f => f.endsWith('.json'));

        const spools: Spool[] = [];

        for (const file of jsonFiles) {
            try {
                const filePath = path.join(DELETED_DIR, file);
                const content = await fs.readFile(filePath, 'utf-8');
                const spool = safeJSONParse<Spool>(content);
                if (spool) {
                    spools.push(spool);
                }
            } catch (e) {
                console.error(`Failed to read deleted spool ${file}:`, e);
            }
        }

        // Sort by deletion time (most recent first)
        spools.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));

        return NextResponse.json(spools);
    } catch (error) {
        console.error('Error listing deleted spools:', error);
        return NextResponse.json(
            { error: 'Failed to list deleted spools', details: String(error) },
            { status: 500 }
        );
    }
}
