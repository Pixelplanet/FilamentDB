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
import { SPOOLS_DIR, findSpoolFile, invalidateSpoolCache } from '@/lib/storage/server';
import { getUserFromRequest } from '@/lib/auth/serverUtils';

export const revalidate = false;

// Feature Flag
const AUTH_ENABLED = process.env.ENABLE_USER_MANAGEMENT === 'true';

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

        // Auth Check
        let user = null;
        if (AUTH_ENABLED) {
            user = await getUserFromRequest(req);
        }

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
                    const spool = safeJSONParse<Spool>(content);

                    // Filter logic
                    if (spool && AUTH_ENABLED) {
                        const isOwner = user && spool.ownerId === user.id;
                        const isAdmin = user && user.role === 'admin';
                        const isPublic = spool.visibility === 'public';

                        // If no ownerId (legacy), it's treated as Public for backward compat 
                        // UNLESS migration script ran and set them private.
                        // But if truly undefined, let's treat as visible to authenticated users?
                        // Or visible to everyone? 
                        // Decision: Legacy (no owner) -> Visible to Everyone (Public)
                        const isLegacy = !spool.ownerId;

                        if (!isOwner && !isAdmin && !isPublic && !isLegacy) {
                            return null;
                        }
                    }

                    return spool;
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

        const spool: Spool = await req.json();

        // Validate required fields
        if (!spool.serial) {
            return NextResponse.json({ error: 'Serial number is required' }, { status: 400 });
        }
        if (!spool.type) {
            return NextResponse.json({ error: 'Type is required' }, { status: 400 });
        }

        // Auth Logic
        if (AUTH_ENABLED) {
            const user = await getUserFromRequest(req);
            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            // Check existing file ownership
            const existingFile = await findSpoolFile(spool.serial);
            if (existingFile) {
                const filePath = path.join(SPOOLS_DIR, existingFile);
                const existingContent = await fs.readFile(filePath, 'utf-8');
                const existingSpool = safeJSONParse<Spool>(existingContent);

                if (existingSpool && existingSpool.ownerId) {
                    if (existingSpool.ownerId !== user.id && user.role !== 'admin') {
                        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
                    }
                }

                // Preserve owner if admin is editing someone else's spool
                if (existingSpool?.ownerId) {
                    spool.ownerId = existingSpool.ownerId;
                } else {
                    // Adopt legacy spool? Yes, if edited by a user, they claim it?
                    // Better to just set owner to editor if it was null.
                    spool.ownerId = user.id;
                }
            } else {
                // New Spool
                spool.ownerId = user.id;
            }

            // Default visibility
            if (!spool.visibility) {
                spool.visibility = 'private';
            }
        }

        // Update timestamps
        spool.lastUpdated = Date.now();
        if (!spool.createdAt) {
            spool.createdAt = spool.lastUpdated;
        }

        // Generate filename
        const filename = getSpoolFileName(spool);
        const filePath = path.join(SPOOLS_DIR, filename);

        // Rename logic
        const existingFile = await findSpoolFile(spool.serial);
        if (existingFile && existingFile !== filename) {
            const oldPath = path.join(SPOOLS_DIR, existingFile);
            await fs.unlink(oldPath);
        }

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
