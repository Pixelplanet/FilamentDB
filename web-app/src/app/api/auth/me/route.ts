
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/serverUtils';

// Ensure user management is enabled
const ENABLED = process.env.ENABLE_USER_MANAGEMENT === 'true';

export async function GET(req: NextRequest) {
    if (!ENABLED) {
        return NextResponse.json({ error: 'User management is disabled' }, { status: 404 });
    }

    try {
        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json({ authenticated: false }, { status: 401 });
        }

        // Don't leak the hash
        const { passwordHash, ...safeUser } = user;

        return NextResponse.json({
            authenticated: true,
            user: safeUser
        });

    } catch (e) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
