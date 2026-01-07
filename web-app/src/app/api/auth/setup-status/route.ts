import { NextResponse } from 'next/server';
import { UserService } from '@/lib/auth/UserService';
import { getStorage } from '@/lib/storage';

export async function GET() {
    try {
        await UserService.init();
        const hasUsers = await UserService.hasUsers();

        let spoolCount = 0;
        if (!hasUsers) {
            // Only check spools if we are in setup mode, to help user decide migration
            const storage = getStorage();
            const spools = await storage.listSpools();
            spoolCount = spools.length;
        }

        return NextResponse.json({
            isSetup: hasUsers,
            needsSetup: !hasUsers,
            existingSpoolCount: spoolCount
        });
    } catch (e) {
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
