import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// For static export builds (Capacitor), these routes are stubs.
// The actual API is served by the Docker container.
export const dynamic = 'force-static';
export const revalidate = false;

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export async function GET() {
    return NextResponse.json({ status: 'ok', service: 'FilamentDB' });
}

export async function POST(req: NextRequest) {
    try {
        const { spools } = await req.json();

        // Ensure data directory exists
        await fs.mkdir(DATA_DIR, { recursive: true });

        let serverData = { spools: [] };
        try {
            const content = await fs.readFile(DB_FILE, 'utf-8');
            serverData = JSON.parse(content);
        } catch (e) {
            // File doesn't exist yet, that's fine
        }

        // Naive Merge logic:
        const mergedMap = new Map();
        serverData.spools.forEach((s: any) => mergedMap.set(s.serial, s));
        spools.forEach((s: any) => {
            const existing = mergedMap.get(s.serial);
            if (!existing || s.lastScanned > existing.lastScanned) {
                mergedMap.set(s.serial, s);
            }
        });

        const mergedList = Array.from(mergedMap.values());
        await fs.writeFile(DB_FILE, JSON.stringify({ spools: mergedList }, null, 2));

        return NextResponse.json({
            success: true,
            serverSpools: mergedList,
            stats: { total: mergedList.length, received: spools.length }
        });
    } catch (e: any) {
        console.error('Sync Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
