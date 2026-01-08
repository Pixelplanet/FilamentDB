import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        enabled: process.env.ENABLE_USER_MANAGEMENT === 'true',
        googleEnabled: !!process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'undefined' && process.env.GOOGLE_CLIENT_ID !== ''
    });
}
