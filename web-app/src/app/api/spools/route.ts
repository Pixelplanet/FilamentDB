/**
 * Spools API - List and Create
 * 
 * GET  /api/spools - List all spools
 * POST /api/spools - Create or update a spool
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Spool } from '@/db';
import { getSpoolFileName, prettyJSON, safeJSONParse } from '@/lib/storage/fileUtils';

// Must be static for Next.js to parse at build time
export const dynamic = 'force-dynamic';
export const revalidate = false;

// Directory where spool files are stored
import { SPOOLS_DIR, findSpoolFile, invalidateSpoolCache } from '@/lib/storage/server';

/**
 * Ensure the spools directory exists
 */
async function ensureSpoolsDir() {
    try {
        await fs.access(SPOOLS_DIR);
    } catch {
        await fs.mkdir(SPOOLS_DIR, { recursive: true });
    }
}

/**
 * GET /api/spools
 * List all spools
 */
export async function GET(req: NextRequest) {
    try {
        await ensureSpoolsDir();

        // Read all files in the spools directory
        const files = await fs.readdir(SPOOLS_DIR);

        // Filter for .json files only
        const jsonFiles = files.filter(file => file.endsWith('.json'));

        // Read and parse files in parallel batches
        const spools: Spool[] = [];
        const BATCH_SIZE = 200;

        for (let i = 0; i < jsonFiles.length; i += BATCH_SIZE) {
            const chunk = jsonFiles.slice(i, i + BATCH_SIZE);
            const chunkTasks = chunk.map(async (file) => {
                try {
                    const filePath = path.join(SPOOLS_DIR, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    return safeJSONParse<Spool>(content);
                } catch (error) {
                    console.error(`Error reading spool file ${file}:`, error);
                    return null;
                }
            });

            const chunkResults = await Promise.all(chunkTasks);
            const validSpools = chunkResults.filter((s): s is Spool => s !== null);
            spools.push(...validSpools);
        }

        // Sort by lastUpdated (newest first) or id
        spools.sort((a, b) => {
            if (a.lastUpdated && b.lastUpdated) {
                return b.lastUpdated - a.lastUpdated;
            }
            return (b.id || 0) - (a.id || 0);
        });

        return NextResponse.json(spools);
    } catch (error) {
        console.error('Error listing spools:', error);
        return NextResponse.json(
            { error: 'Failed to list spools', details: String(error) },
            { status: 500 }
        );
    }
}

/**
 * POST /api/spools
 * Create or update a spool
 */
export async function POST(req: NextRequest) {
    try {
        await ensureSpoolsDir();

        // Parse request body
        const spool: Spool = await req.json();

        // Validate required fields
        if (!spool.serial) {
            return NextResponse.json(
                { error: 'Serial number is required' },
                { status: 400 }
            );
        }

        if (!spool.type) {
            return NextResponse.json(
                { error: 'Type is required' },
                { status: 400 }
            );
        }

        // Update lastUpdated timestamp
        spool.lastUpdated = Date.now();

        // If no createdAt, set it
        if (!spool.createdAt) {
            spool.createdAt = spool.lastUpdated;
        }

        // Generate filename
        const filename = getSpoolFileName(spool);
        const filePath = path.join(SPOOLS_DIR, filename);

        // Check if we need to handle filename change (if spool details changed)
        // First, try to find existing file with same serial
        const existingFile = await findSpoolFile(spool.serial);

        // If existing file has different name, delete it
        if (existingFile && existingFile !== filename) {
            const oldPath = path.join(SPOOLS_DIR, existingFile);
            await fs.unlink(oldPath);
            console.log(`Renamed spool file: ${existingFile} -> ${filename}`);
        }

        // Write the file with pretty-printed JSON
        await fs.writeFile(filePath, prettyJSON(spool), 'utf-8');

        invalidateSpoolCache();

        return NextResponse.json({
            success: true,
            filename,
            spool
        });
    } catch (error) {
        console.error('Error saving spool:', error);
        return NextResponse.json(
            { error: 'Failed to save spool', details: String(error) },
            { status: 500 }
        );
    }
}
