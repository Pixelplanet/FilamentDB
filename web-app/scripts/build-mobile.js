/**
 * Build script for Capacitor/Mobile builds
 * Temporarily moves API routes out of the way since static export doesn't support them.
 * The mobile app uses external server URLs for API calls.
 * 
 * CRITICAL: Read .agent/knowledge/project-knowledge.md regarding "Recursive APK Bundling"
 * Ensure public/downloads/ is empty before running this!
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api');
const API_BACKUP = path.join(__dirname, '..', 'src', 'app', '_api_backup');

console.log('[build-mobile] Starting mobile build...');

// Step 0: clean public/downloads to avoid recursive bundling
const apkPath = path.join(__dirname, '..', 'public', 'downloads', 'filamentdb.apk');
if (fs.existsSync(apkPath)) {
    console.log('[build-mobile] Removing existing APK from public/downloads...');
    fs.unlinkSync(apkPath);
}

// Step 1: Move API directory out of the way
if (fs.existsSync(API_DIR)) {
    console.log('[build-mobile] Moving API directory to _api_backup...');
    fs.renameSync(API_DIR, API_BACKUP);
}

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
} finally {
    // Step 3: Restore API directory
    if (fs.existsSync(API_BACKUP)) {
        console.log('[build-mobile] Restoring API directory...');
        fs.renameSync(API_BACKUP, API_DIR);
    }
}


console.log('[build-mobile] Done.');
