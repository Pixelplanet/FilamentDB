import { NextResponse } from 'next/server';
import { UserService } from '@/lib/auth/UserService';
import { promises as fs } from 'fs';
import { SPOOLS_DIR } from '@/lib/storage/server';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await UserService.init();
        const hasUsers = await UserService.hasUsers();

        let spoolCount = 0;
        if (!hasUsers) {
            // Only check spools if we are in setup mode
            // Use direct FS access instead of fetch-based getStorage() to avoid server-side request issues
            try {
                // Ensure directory exists first (handled by server.ts but safe to check)
                await fs.access(SPOOLS_DIR).catch(() => { });

                const files = await fs.readdir(SPOOLS_DIR);
                spoolCount = files.filter(file => file.endsWith('.json')).length;
            } catch (e) {
                console.warn('Failed to count spools during setup check:', e);
                spoolCount = 0;
            }
        }

        return NextResponse.json({
            isSetup: hasUsers,
            needsSetup: !hasUsers,
            existingSpoolCount: spoolCount
        });
    } catch (e) {
        console.error('Setup status check failed:', e);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
