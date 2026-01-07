/**
 * Export Spools API
 * 
 * GET /api/spools/export - Export all spools as a ZIP file
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import archiver from 'archiver';
import { Readable } from 'stream';

// Must be static for Next.js to parse at build time
export const revalidate = false;

// Directory where spool files are stored
const SPOOLS_DIR = path.join(process.cwd(), 'data', 'spools');

/**
 * GET /api/spools/export
 * Export all spools as a ZIP file
 */
export async function GET(req: NextRequest) {
    try {
        //Check if spools directory exists
        try {
            await fs.access(SPOOLS_DIR);
        } catch {
            return NextResponse.json(
                { error: 'No spools found to export' },
                { status: 404 }
            );
        }

        // Read all JSON files
        const files = await fs.readdir(SPOOLS_DIR);
        const jsonFiles = files.filter(file => file.endsWith('.json'));

        if (jsonFiles.length === 0) {
            return NextResponse.json(
                { error: 'No spools found to export' },
                { status: 404 }
            );
        }

        // Create a ZIP archive
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });

        // Add each JSON file to the archive
        for (const file of jsonFiles) {
            const filePath = path.join(SPOOLS_DIR, file);
            const content = await fs.readFile(filePath);
            archive.append(content, { name: file });
        }

        // Finalize the archive
        archive.finalize();

        // Convert archive to buffer
        const chunks: Buffer[] = [];
        for await (const chunk of archive) {
            chunks.push(Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);

        // Return as ZIP file
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="filamentdb-spools-${Date.now()}.zip"`,
                'Content-Length': buffer.length.toString()
            }
        });
    } catch (error) {
        console.error('Error exporting spools:', error);
        return NextResponse.json(
            { error: 'Failed to export spools', details: String(error) },
            { status: 500 }
        );
    }
}
