/**
 * Import Spools API
 * 
 * POST /api/spools/import - Import spools from a ZIP file
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { Spool } from '@/db';
import { safeJSONParse, isValidSpoolFilename } from '@/lib/storage/fileUtils';

export const revalidate = false;

// Directory where spool files are stored
const SPOOLS_DIR = path.join(process.cwd(), 'data', 'spools');

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
 * POST /api/spools/import
 * Import spools from a ZIP file
 */
export async function POST(req: NextRequest) {
    try {
        await ensureSpoolsDir();

        // Parse multipart form data
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Extract ZIP
        const zip = new AdmZip(buffer);
        const zipEntries = zip.getEntries();

        const results = {
            imported: 0,
            skipped: 0,
            errors: [] as string[]
        };

        // Process each file in the ZIP
        for (const entry of zipEntries) {
            // Skip directories
            if (entry.isDirectory) continue;

            // Only process .json files
            if (!entry.entryName.endsWith('.json')) {
                results.skipped++;
                continue;
            }

            try {
                // Get file content
                const content = entry.getData().toString('utf-8');

                // Parse JSON
                const spool = safeJSONParse<Spool>(content);

                if (!spool) {
                    results.errors.push(`Failed to parse ${entry.entryName}`);
                    continue;
                }

                // Validate required fields
                if (!spool.serial || !spool.type) {
                    results.errors.push(`Invalid spool data in ${entry.entryName}: missing serial or type`);
                    continue;
                }

                // Use the original filename from the ZIP
                const filename = path.basename(entry.entryName);

                // Validate filename format
                if (!isValidSpoolFilename(filename)) {
                    results.errors.push(`Invalid filename format: ${filename}`);
                    continue;
                }

                // Write file
                const filePath = path.join(SPOOLS_DIR, filename);
                await fs.writeFile(filePath, content, 'utf-8');

                results.imported++;
            } catch (error) {
                results.errors.push(`Error processing ${entry.entryName}: ${error}`);
            }
        }

        return NextResponse.json(results);
    } catch (error) {
        console.error('Error importing spools:', error);
        return NextResponse.json(
            { error: 'Failed to import spools', details: String(error) },
            { status: 500 }
        );
    }
}
