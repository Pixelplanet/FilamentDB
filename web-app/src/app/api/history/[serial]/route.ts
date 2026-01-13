/**
 * Usage History API
 * 
 * GET    /api/history/[serial] - Get usage history for a spool
 * POST   /api/history/[serial] - Add a usage log entry
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { UsageLog } from '@/db';
import { safeJSONParse, prettyJSON } from '@/lib/storage/fileUtils';

// Directory where history files are stored
const DATA_DIR = process.env.DATA_DIR || './data';
const HISTORY_DIR = path.join(DATA_DIR, 'history');

// Ensure history directory exists
async function ensureHistoryDir() {
    try {
        await fs.mkdir(HISTORY_DIR, { recursive: true });
    } catch (e) {
        // Directory exists
    }
}

/**
 * GET /api/history/[serial]
 * Get usage history for a spool
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ serial: string }> }
) {
    try {
        const params = await context.params;
        const serial = params.serial;

        await ensureHistoryDir();

        const filePath = path.join(HISTORY_DIR, `${serial}.json`);

        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const history = safeJSONParse<UsageLog[]>(content);
            return NextResponse.json(history || []);
        } catch (e: any) {
            if (e.code === 'ENOENT') {
                // No history file exists, return empty array
                return NextResponse.json([]);
            }
            throw e;
        }
    } catch (error) {
        console.error('Error getting usage history:', error);
        return NextResponse.json(
            { error: 'Failed to get usage history', details: String(error) },
            { status: 500 }
        );
    }
}

/**
 * POST /api/history/[serial]
 * Add a usage log entry
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ serial: string }> }
) {
    try {
        const params = await context.params;
        const serial = params.serial;

        await ensureHistoryDir();

        const log: UsageLog = await req.json();

        // Validate required fields
        if (!log.id || !log.spoolId || log.amount === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields: id, spoolId, amount' },
                { status: 400 }
            );
        }

        // Ensure spoolId matches URL param
        if (log.spoolId !== serial) {
            return NextResponse.json(
                { error: 'spoolId in body must match URL parameter' },
                { status: 400 }
            );
        }

        const filePath = path.join(HISTORY_DIR, `${serial}.json`);

        // Read existing history
        let history: UsageLog[] = [];
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            history = safeJSONParse<UsageLog[]>(content) || [];
        } catch (e: any) {
            if (e.code !== 'ENOENT') throw e;
        }

        // Add new entry
        history.push({
            ...log,
            timestamp: log.timestamp || Date.now()
        });

        // Write back
        await fs.writeFile(filePath, prettyJSON(history), 'utf-8');

        return NextResponse.json({ success: true, entriesCount: history.length });
    } catch (error) {
        console.error('Error adding usage log:', error);
        return NextResponse.json(
            { error: 'Failed to add usage log', details: String(error) },
            { status: 500 }
        );
    }
}
