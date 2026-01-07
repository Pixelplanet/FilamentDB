import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { UserService } from '@/lib/auth/UserService';
import { createSessionToken } from '@/lib/auth/jwt';

// Ensure user management is enabled
const ENABLED = process.env.ENABLE_USER_MANAGEMENT === 'true';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const client = new OAuth2Client(CLIENT_ID);

export async function POST(req: NextRequest) {
    if (!ENABLED) {
        return NextResponse.json({ error: 'User management is disabled' }, { status: 404 });
    }

    if (!CLIENT_ID) {
        // Log locally but return helpful error
        console.error('GOOGLE_CLIENT_ID not configured on server');
        return NextResponse.json({ error: 'Google Login not configured on server' }, { status: 503 });
    }

    try {
        const { credential } = await req.json();

        // Verify Google Token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            throw new Error('Invalid Google Token: Missing email');
        }

        const email = payload.email;
        const name = payload.name || email.split('@')[0];
        const picture = payload.picture;

        await UserService.init();

        // Find or Create User
        // 1. Try finding by Linked Google Email
        let user = await UserService.findUserByGoogleEmail(email);

        // 2. If not found, try username (legacy/direct google)
        if (!user) {
            user = await UserService.findUserByUsername(email);
        }

        if (!user) {
            // Register new user
            // Password is undefined for Google Auth
            user = await UserService.createUser(email, undefined, 'google', name);

            // Set googleEmail and avatar
            await UserService.updateUser(user.id, { googleEmail: email, avatarUrl: picture });
            user.googleEmail = email;
            if (picture) user.avatarUrl = picture;

        } else {
            // Link / Update existing user if needed
            const updates: any = {};
            if (!user.googleEmail) updates.googleEmail = email;
            if (!user.avatarUrl && picture) updates.avatarUrl = picture;

            if (Object.keys(updates).length > 0) {
                await UserService.updateUser(user.id, updates);
                // Update local obj
                if (updates.googleEmail) user.googleEmail = email;
                if (updates.avatarUrl) user.avatarUrl = picture;
            }
        }

        // Create Session
        const token = await createSessionToken(user);

        const response = NextResponse.json({ success: true, user, token });

        // Set HTTP-only cookie
        response.cookies.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 days
        });

        return response;

    } catch (e: any) {
        console.error('Google Auth Error:', e);
        return NextResponse.json({ error: 'Authentication failed: ' + e.message }, { status: 401 });
    }
}
