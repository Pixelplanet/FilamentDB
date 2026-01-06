
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Check if the request is for the API
    if (request.nextUrl.pathname.startsWith('/api/')) {
        // Retrieve the current response
        const response = NextResponse.next();

        // Add the CORS headers to the response
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, x-forwarded-for, user-agent');
        response.headers.set('Access-Control-Max-Age', '86400');

        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            return new NextResponse(null, {
                status: 200,
                headers: response.headers,
            });
        }

        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/:path*',
};
