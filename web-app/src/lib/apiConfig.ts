/**
 * API Configuration
 * 
 * Provides the correct API base URL depending on the platform:
 * - Web (browser): Uses relative URLs (same origin)
 * - Native App: Uses absolute URL to the deployed server
 */

import { Capacitor } from '@capacitor/core';

/**
 * Get the base URL for API calls
 * @returns Base URL (empty string for web, full URL for native apps)
 */
export function getApiBaseUrl(): string {
    // Check if running as a native app (Android/iOS)
    if (typeof window !== 'undefined' && Capacitor.getPlatform) {
        const platform = Capacitor.getPlatform();

        if (platform === 'android' || platform === 'ios') {
            // Native app - use the deployed server URL
            // TODO: Replace with your actual deployed URL
            return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        }
    }

    // Web browser - use relative URLs (same origin)
    return '';
}

/**
 * Build a full API URL
 * @param path API path (e.g., '/api/scrape')
 * @returns Full URL
 */
export function getApiUrl(path: string): string {
    const baseUrl = getApiBaseUrl();

    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return `${baseUrl}${normalizedPath}`;
}
