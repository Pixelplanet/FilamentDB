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
    // Don't just check for window.Capacitor (could be injected by browser extensions)
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
        // Check if it's actually running as a native app
        const capacitor = (window as any).Capacitor;
        if (capacitor.isNativePlatform && capacitor.isNativePlatform()) {
            return StoragePlatform.MOBILE;
        }
    }

    // Default to web (including when Capacitor is present but not native)
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
            // TODO: Implement FileStorageMobile
            throw new Error('Mobile storage not yet implemented. Use FileStorageWeb for now.');

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
