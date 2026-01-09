---
description: Critical implementation details, build workarounds, and architectural decisions for FilamentDB.
---

# FilamentDB Project Knowledge

## 📱 Android Application

### External Configuration (`config.json`)
The Android app supports dynamic configuration to solve "Connection Failed" errors caused by incorrect server URLs (e.g., users trying to connect to `localhost` from a phone).
- **Behavior**: The app attempts to fetch `/config.json` relative to the server root at startup.
- **Logic**: Located in `src/app/settings/page.tsx`.
- **Usage**: Users add `config.json` to the server's `public` directory.
- **Format**:
  ```json
  {
    "serverUrl": "http://192.168.1.50:3000",
    "apiKey": "your-api-key"
  }
  ```

### Critical Build Issue: Recursive APK Bundling
**Problem**: APK fails to install or is abnormally large (>50MB).
**Cause**: Steps:
1. Previous APK exists in `web-app/public/downloads/`.
2. Next.js build copies `public/` to `out/`.
3. Capacitor copies `out/` to Android assets.
4. New APK contains the old APK.
**Solution**:
- **Delete** `public/downloads/*.apk` before running `npm run build:mobile`.
- The release workflow cleans this folder automatically.

### Windows Build Environment
- **File Locks**: `gradlew assembleDebug` fails with "Unable to delete directory" on Windows.
- **Fix**: Kill Java processes: `taskkill /F /IM java.exe`.

## 🎨 UI & Dark Mode

### CSS Architecture
- **Selector**: Use `:root.dark` in `src/app/globals.css`.
  - Do NOT use `:root:where(.dark)` (specificity too low).
- **Explicit Coloring**:
  - Elements on Login/Register pages need explicit dark colors.
  - Pattern: `text-gray-900 dark:text-white`.
  - Do not use `text-gray-900` without a `dark:` counterpart.

## 🚀 Release Procedure
- **Tagging**: Push git tags (`v0.2.x`) to main.
- **Artifacts**: Upload APK to GitHub Releases (do not commit large binaries to git).
- **Docker**: Push to `pixelplanet5/filamentdb-app` on Docker Hub.
