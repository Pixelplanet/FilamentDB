
import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/auth/UserService';
import { createSessionToken } from '@/lib/auth/jwt';
import { getStorage } from '@/lib/storage';
import { Spool } from '@/db';

export async function POST(req: NextRequest) {
    try {
        await UserService.init();
        if (await UserService.hasUsers()) {
            return NextResponse.json({ error: 'Setup already completed' }, { status: 403 });
        }

        const { username, password, displayName, migrationStrategy } = await req.json();
        // migrationStrategy: 'assign_private' | 'make_public' | 'delete' | 'none'

        // 1. Create Admin
        const user = await UserService.createUser(username, password, 'local', displayName);

        // 2. Perform Migration
        if (migrationStrategy && migrationStrategy !== 'none') {
            const storage = getStorage();
            const spools = await storage.listSpools();

            if (migrationStrategy === 'delete') {
                const serials = spools.map(s => s.serial);
                await storage.deleteSpools(serials);
            } else {
                const updates: Spool[] = spools.map(s => {
                    const update = { ...s };
                    if (migrationStrategy === 'assign_private') {
                        update.ownerId = user.id;
                        update.visibility = 'private';
                    } else if (migrationStrategy === 'make_public') {
                        update.ownerId = user.id; // Still owned by admin
                        update.visibility = 'public';
                    }
                    return update;
                });
                await storage.saveSpools(updates);
            }
        }

        // 3. Login
        const token = await createSessionToken(user);

        const response = NextResponse.json({ success: true, user });
        response.cookies.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7
        });

        return response;

    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Setup failed' }, { status: 500 });
    }
}
