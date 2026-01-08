/**
 * Build script for Capacitor/Mobile builds
 * Temporarily moves API routes out of the way since static export doesn't support them.
 * The mobile app uses external server URLs for API calls.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api');
const API_BACKUP = path.join(__dirname, '..', 'src', 'app', '_api_backup');

console.log('[build-mobile] Starting mobile build...');

// Step 1: Move API directory out of the way
try {
    // Step 2: Run the Next.js build (static export mode)
    console.log('[build-mobile] Running Next.js build...');
    execSync('npx next build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('[build-mobile] Build successful!');
} catch (error) {
    console.error('[build-mobile] Build failed:', error.message);
    if (error.stdout) console.log(error.stdout.toString());
    if (error.stderr) console.error(error.stderr.toString());
    process.exitCode = 1;
}


console.log('[build-mobile] Done.');
