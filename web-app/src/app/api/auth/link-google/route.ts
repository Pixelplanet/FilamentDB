import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { UserService } from '@/lib/auth/UserService';
import { getUserFromRequest } from '@/lib/auth/serverUtils';

// Ensure user management is enabled
const ENABLED = process.env.ENABLE_USER_MANAGEMENT === 'true';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

const client = new OAuth2Client(CLIENT_ID);

export async function POST(req: NextRequest) {
    if (!ENABLED) {
        return NextResponse.json({ error: 'User management is disabled' }, { status: 404 });
    }

    if (!CLIENT_ID) {
        return NextResponse.json({ error: 'Google Login not configured' }, { status: 503 });
    }

    try {
        const currentUser = await getUserFromRequest(req);
        if (!currentUser) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

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
        const picture = payload.picture;

        // Check if this Google Email is already linked to ANOTHER user
        const existing = await UserService.findUserByGoogleEmail(email);
        if (existing && existing.id !== currentUser.id) {
            return NextResponse.json({ error: 'This Google account is already linked to another user.' }, { status: 409 });
        }

        // Also check if username matches (for legacy/direct google accounts)
        // If a user registered directly with Google, username === email.
        const userByUsername = await UserService.findUserByUsername(email);
        if (userByUsername && userByUsername.id !== currentUser.id) {
            return NextResponse.json({ error: 'This Google account is already registered as a primary account.' }, { status: 409 });
        }

        // Link
        const updates: any = { googleEmail: email };
        if (!currentUser.avatarUrl && picture) {
            updates.avatarUrl = picture;
        }

        const updatedUser = await UserService.updateUser(currentUser.id, updates);

        return NextResponse.json({ success: true, user: updatedUser });

    } catch (e: any) {
        console.error('Link Google Error:', e);
        return NextResponse.json({ error: 'Linking failed: ' + e.message }, { status: 400 });
    }
}
