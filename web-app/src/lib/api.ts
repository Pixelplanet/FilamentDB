import { Capacitor } from '@capacitor/core';

export function getApiUrl(path: string): string {
    const isMobile = process.env.NEXT_PUBLIC_BUILD_MODE === 'mobile' || (typeof window !== 'undefined' && Capacitor.isNativePlatform());
    if (isMobile) {
        // Run on client side only
        if (typeof window !== 'undefined') {
            const serverUrl = localStorage.getItem('sync_server_url');
            if (serverUrl) {
                // Ensure no double slash
                const base = serverUrl.replace(/\/$/, '');
                const endpoint = path.startsWith('/') ? path : `/${path}`;
                return `${base}${endpoint}`;
            }
        }
    }
    return path; // Relative for Web
}

export async function authFetch(path: string, options: RequestInit = {}) {
    const url = getApiUrl(path);
    const isMobile = typeof window !== 'undefined' && Capacitor.isNativePlatform();

    // Get stored token for mobile auth
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('sync_auth_token') : null;

    // Build headers
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> || {})
    };

    // Add Bearer token for mobile (cookies don't work cross-origin)
    if (isMobile && storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
    }

    const newOptions: RequestInit = {
        ...options,
        credentials: 'include', // Still include for web (cookie-based auth)
        headers
    };

    return fetch(url, newOptions);
}
