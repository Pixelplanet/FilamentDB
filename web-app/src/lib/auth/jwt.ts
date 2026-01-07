
import { SignJWT, jwtVerify } from 'jose';
import { User } from './types';

const SECRET_KEY = new TextEncoder().encode(
    process.env.AUTH_SECRET || 'dev-secret-change-in-prod'
);

const ALG = 'HS256';

export async function createSessionToken(user: User): Promise<string> {
    return new SignJWT({
        sub: user.id,
        role: user.role,
        username: user.username
    })
        .setProtectedHeader({ alg: ALG })
        .setIssuedAt()
        .setExpirationTime('7d') // 7 days session
        .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, SECRET_KEY);
        return payload;
    } catch (e) {
        return null;
    }
}
