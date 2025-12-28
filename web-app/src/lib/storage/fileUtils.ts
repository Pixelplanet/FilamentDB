/**
 * File Utilities
 * 
 * Helper functions for file naming, sanitization, and file operations
 */

import { Spool } from '@/db';

/**
 * Generate a filename for a spool
 * Format: {type}-{brand}-{color}-{serial}.json
 * 
 * @param spool - Spool object
 * @returns Sanitized filename
 * 
 * @example
 * getSpoolFileName({ type: 'PLA', brand: 'Prusament', color: 'Galaxy Black', serial: 'ABC123' })
 * // Returns: 'PLA-Prusament-GalaxyBlack-ABC123.json'
 */
export function getSpoolFileName(spool: Spool): string {
    const type = sanitizeForFilename(spool.type);
    const brand = sanitizeForFilename(spool.brand || 'Unknown');
    const color = sanitizeForFilename(spool.color || 'NoColor');
    const serial = sanitizeForFilename(spool.serial);

    return `${type}-${brand}-${color}-${serial}.json`;
}

/**
 * Sanitize a string for use in a filename
 * 
 * Removes or replaces characters that are invalid in filenames:
 * - Removes: / \ : * ? " < > |
 * - Replaces spaces with empty string
 * - Removes special characters (™, ®, ©, etc.)
 * - Truncates to 100 characters per segment
 * 
 * @param str - String to sanitize
 * @returns Sanitized string safe for filenames
 * 
 * @example
 * sanitizeForFilename('Prusa™ Research')  // Returns: 'PrusaResearch'
 * sanitizeForFilename('Galaxy Black')      // Returns: 'GalaxyBlack'
 * sanitizeForFilename('Red/Blue')          // Returns: 'RedBlue'
 */
export function sanitizeForFilename(str: string): string {
    if (!str) return 'Unknown';

    return str
        // Remove invalid characters
        .replace(/[/\\:*?"<>|]/g, '')
        // Remove special symbols
        .replace(/[™®©]/g, '')
        // Remove spaces
        .replace(/\s+/g, '')
        // Remove any remaining non-alphanumeric except hyphens
        .replace(/[^a-zA-Z0-9-]/g, '')
        // Truncate to 100 chars
        .substring(0, 100)
        // Ensure we don't return empty string
        || 'Unknown';
}

/**
 * Parse a filename to extract spool information
 * 
 * @param filename - Filename to parse
 * @returns Object with type, brand, color, serial or null if invalid
 * 
 * @example
 * parseSpoolFileName('PLA-Prusament-GalaxyBlack-ABC123.json')
 * // Returns: { type: 'PLA', brand: 'Prusament', color: 'GalaxyBlack', serial: 'ABC123' }
 */
export function parseSpoolFileName(filename: string): {
    type: string;
    brand: string;
    color: string;
    serial: string;
} | null {
    // Remove .json extension
    const nameWithoutExt = filename.replace(/\.json$/, '');

    // Split by hyphens
    const parts = nameWithoutExt.split('-');

    // Need at least 4 parts: type-brand-color-serial
    if (parts.length < 4) {
        return null;
    }

    // Serial is always last
    const serial = parts[parts.length - 1];

    // Type is first
    const type = parts[0];

    // Everything between type and serial is brand and color
    // We need to figure out where brand ends and color begins
    // For now, assume: type-brand-color-serial (4 parts)
    // If more parts, join middle parts
    if (parts.length === 4) {
        return {
            type,
            brand: parts[1],
            color: parts[2],
            serial
        };
    } else {
        // Multiple hyphens in brand or color
        // We can't reliably split, so just combine middle parts
        const middle = parts.slice(1, -1).join('-');
        // Try to split middle in half
        const midpoint = Math.floor(middle.length / 2);
        const brand = middle.substring(0, midpoint);
        const color = middle.substring(midpoint);

        return { type, brand, color, serial };
    }
}

/**
 * Validate if a filename is a valid spool file
 * 
 * @param filename - Filename to validate
 * @returns true if valid spool filename
 */
export function isValidSpoolFilename(filename: string): boolean {
    // Must end with .json
    if (!filename.endsWith('.json')) return false;

    // Try to parse it
    const parsed = parseSpoolFileName(filename);
    return parsed !== null;
}

/**
 * Pretty-print JSON with consistent formatting
 * 
 * @param obj - Object to stringify
 * @returns Formatted JSON string
 */
export function prettyJSON(obj: any): string {
    return JSON.stringify(obj, null, 2);
}

/**
 * Parse JSON safely with error handling
 * 
 * @param json - JSON string to parse
 * @returns Parsed object or null on error
 */
export function safeJSONParse<T>(json: string): T | null {
    try {
        return JSON.parse(json) as T;
    } catch (error) {
        console.error('Failed to parse JSON:', error);
        return null;
    }
}

/**
 * Get file extension
 * 
 * @param filename - Filename
 * @returns Extension (without dot) or empty string
 */
export function getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot + 1);
}

/**
 * Remove file extension
 * 
 * @param filename - Filename
 * @returns Filename without extension
 */
export function removeFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? filename : filename.substring(0, lastDot);
}

/**
 * Ensure directory path ends with slash
 * 
 * @param path - Directory path
 * @returns Path with trailing slash
 */
export function ensureTrailingSlash(path: string): string {
    return path.endsWith('/') ? path : `${path}/`;
}
