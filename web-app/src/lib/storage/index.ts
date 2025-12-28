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
    // Check if we're in Capacitor (mobile app)
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
        return StoragePlatform.MOBILE;
    }

    // Default to web
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
