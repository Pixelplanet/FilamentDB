
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
        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const user = await UserService.findUserByUsername(username);

        if (!user || user.authProvider !== 'local') {
            // Avoid revealing if user exists or not, OR if user registered with Google.
            // But valid message if provider is differnt is helpful for UX.
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isValid = await UserService.verifyPassword(user, password);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const token = await createSessionToken(user);

        const response = NextResponse.json({ success: true, user, token }); // Return token in body for Mobile Apps

        // Set HTTP-only cookie for Web
        response.cookies.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 days
        });

        return response;

    } catch (e) {
        console.error('Login error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
