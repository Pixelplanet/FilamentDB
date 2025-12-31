
import { promises as fs } from 'fs';
import path from 'path';
import { Spool } from '@/db';
import { safeJSONParse } from './fileUtils';

export const SPOOLS_DIR = path.join(process.cwd(), 'data', 'spools');

// In-memory cache of filenames to avoid repetitive readdir calls
// This drastically improves performance on Docker Volumes or slow file systems
let cachedFilenames: string[] = [];
let isCacheValid = false;
let lastCacheUpdate = 0;
const CACHE_TTL = 30000; // 30 seconds auto-refresh to catch external changes

export function invalidateSpoolCache() {
    isCacheValid = false;
}

async function ensureCache() {
    // If valid and within TTL, skip
    if (isCacheValid && (Date.now() - lastCacheUpdate < CACHE_TTL)) {
        return;
    }

    try {
        const start = Date.now();
        cachedFilenames = await fs.readdir(SPOOLS_DIR);
        isCacheValid = true;
        lastCacheUpdate = Date.now();
        // Console log only if it took significant time or first load
        if (Date.now() - start > 100) {
            console.log(`[SpoolCache] Refreshed ${cachedFilenames.length} files in ${Date.now() - start}ms`);
        }
    } catch (error) {
        console.error('Error reading spools directory for cache:', error);
        // Fallback to empty, but don't mark valid so we retry
        cachedFilenames = [];
        isCacheValid = false;
    }
}

/**
 * Find a spool file by serial number using in-memory cache
 * @param serial - Serial number to find
 * @returns Filename if found, null otherwise
 */
export async function findSpoolFile(serial: string): Promise<string | null> {
    await ensureCache();

    // Look for file ending with -{serial}.json
    const suffix = `-${serial}.json`;

    // Fast in-memory search
    const found = cachedFilenames.find(file => file.endsWith(suffix));

    return found || null;
}

/**
 * Get a specific spool by serial number (Server Side)
 * @param serial - Serial number
 * @returns Spool object or null
 */
export async function getSpoolServer(serial: string): Promise<Spool | null> {
    try {
        const filename = await findSpoolFile(serial);
        if (!filename) return null;

        const filePath = path.join(SPOOLS_DIR, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        return safeJSONParse<Spool>(content);
    } catch (error) {
        console.error('Error reading spool file:', error);
        return null;
    }
}
