/**
 * File Storage Factory
 * 
 * Creates the appropriate storage implementation based on platform
 */

import { ISpoolStorage, StoragePlatform } from './types';
import { FileStorageWeb } from './FileStorageWeb';

/**
 * Detect the current platform
 * @returns Platform type
 */
function detectPlatform(): StoragePlatform {
    // Check if we're actually in a native Capacitor app
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
        const capacitor = (window as any).Capacitor;

        // Get the actual platform - it returns 'web', 'ios', or 'android'
        const platform = capacitor.getPlatform ? capacitor.getPlatform() : 'web';

        // Only use mobile storage for actual native platforms (iOS/Android)
        // When accessed as a website (even on mobile devices), platform will be 'web'
        if (platform === 'ios' || platform === 'android') {
            return StoragePlatform.MOBILE;
        }
    }

    // Default to web (including mobile browsers)
    return StoragePlatform.WEB;
}

/**
 * Create storage instance for current platform
 * @param baseUrl - Base URL for API endpoints (web only)
 * @returns Storage implementation
 */
export function createStorage(baseUrl: string = ''): ISpoolStorage {
    const platform = detectPlatform();

    switch (platform) {
        case StoragePlatform.WEB:
            return new FileStorageWeb(baseUrl);

        case StoragePlatform.MOBILE:
            // Mobile fallback to Web API for now (until local FS impl)
            // This allows connecting to a self-hosted instance from the app
            let mobileUrl = '';
            if (typeof window !== 'undefined') {
                mobileUrl = localStorage.getItem('sync_server_url') || '';
            }
            return new FileStorageWeb(mobileUrl);

        default:
            throw new Error(`Unknown platform: ${platform}`);
    }
}

/**
 * Global storage instance
 * Initialized on first access
 */
let storageInstance: ISpoolStorage | null = null;

/**
 * Get the global storage instance
 * Creates it if it doesn't exist
 * @returns Storage instance
 */
export function getStorage(): ISpoolStorage {
    if (!storageInstance) {
        storageInstance = createStorage();
    }
    return storageInstance;
}

/**
 * Reset the global storage instance
 * Useful for testing
 */
export function resetStorage(): void {
    storageInstance = null;
}

// Export types and implementations
export * from './types';
export * from './fileUtils';
export { FileStorageWeb } from './FileStorageWeb';
