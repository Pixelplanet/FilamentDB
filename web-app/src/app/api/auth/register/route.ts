
import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/auth/UserService';
import { createSessionToken } from '@/lib/auth/jwt';


// Ensure user management is enabled
const ENABLED = process.env.ENABLE_USER_MANAGEMENT === 'true';

export async function POST(req: NextRequest) {
    if (!ENABLED) {
        return NextResponse.json({ error: 'User management is disabled' }, { status: 404 });
    }

    try {
        const { username, password, displayName } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        if (password.length < 12) {
            return NextResponse.json({ error: 'Password must be at least 12 characters' }, { status: 400 });
        }

        // Initialize DB if needed (e.g. first run)
        await UserService.init();

        try {
            const user = await UserService.createUser(username, password, 'local', displayName);
            const token = await createSessionToken(user);

            const response = NextResponse.json({ success: true, user });

            // Set HTTP-only cookie for web
            response.cookies.set('auth_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 // 7 days
            });

            return response;

        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 400 }); // e.g., Username exists
        }

    } catch (e) {
        console.error('Registration error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
