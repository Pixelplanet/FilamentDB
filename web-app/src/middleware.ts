
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const origin = request.headers.get('origin') || '*';

    // Check if the request is for the API
    if (pathname.startsWith('/api/')) {
        // Retrieve the current response
        const response = NextResponse.next();

        // Add the CORS headers to the response
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, x-forwarded-for, user-agent');
        response.headers.set('Access-Control-Allow-Credentials', 'true');
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

    // --- Authentication Guard ---
    const isAuthEnabled = process.env.ENABLE_USER_MANAGEMENT === 'true';

    if (isAuthEnabled) {
        // Define public routes that don't require authentication
        const isPublicRoute =
            pathname.startsWith('/login') ||
            pathname.startsWith('/register') ||
            pathname.startsWith('/_next') ||
            pathname.includes('.') || // Allow static files
            pathname === '/favicon.ico' ||
            pathname === '/manifest.json';

        if (!isPublicRoute) {
            const authToken = request.cookies.get('auth_token')?.value;

            if (!authToken) {
                // If it's a browser navigation, redirect to login
                const loginUrl = new URL('/login', request.url);
                return NextResponse.redirect(loginUrl);
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (allow login/google/config)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     */
    matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.json).*)'],
};


