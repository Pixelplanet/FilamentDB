
const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'filamentdb.apk');
const DEST_DIR = path.join(__dirname, '..', '..');
const DEST = path.join(DEST_DIR, 'filamentdb.apk');

if (!fs.existsSync(SOURCE)) {
    console.error(`[copy-apk] Source APK not found at: ${SOURCE}`);
    console.error('[copy-apk] Please build the Android app first (npx cap run android or cd android && gradlew assembleDebug)');
    process.exit(1);
}

if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR, { recursive: true });
}

fs.copyFileSync(SOURCE, DEST);
console.log(`[copy-apk] Copied ${SOURCE} to ${DEST}`);
