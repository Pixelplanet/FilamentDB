
import { NextRequest } from 'next/server';
import { verifySessionToken } from './jwt';
import { UserService } from './UserService';
import { User } from './types';

export async function getUserFromRequest(req: NextRequest): Promise<User | null> {
    // 1. Try Cookie
    let token = req.cookies.get('auth_token')?.value;

    // 2. Try Authorization Header (Bearer ...)
    if (!token) {
        const authHeader = req.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
    }

    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload || !payload.sub) return null;

    const user = await UserService.findUserById(payload.sub as string);
    return user || null;
}
