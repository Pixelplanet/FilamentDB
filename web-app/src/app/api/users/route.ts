
import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/auth/UserService';
import { getUserFromRequest } from '@/lib/auth/serverUtils';

const ENABLED = process.env.ENABLE_USER_MANAGEMENT === 'true';

export async function GET(req: NextRequest) {
    if (!ENABLED) return NextResponse.json({ error: 'Disabled' }, { status: 404 });

    try {
        const currentUser = await getUserFromRequest(req);
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const users = await UserService.getAllUsers();
        // Return without hashes
        const safeUsers = users.map(({ passwordHash, ...u }) => u);

        return NextResponse.json(safeUsers);
    } catch (e) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
