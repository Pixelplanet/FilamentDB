---
description: Standard operating procedure for releasing changes or finalizing features
---

# Release / Feature Checklist

When a major feature is completed or a release is requested, follow these steps strictly:

1.  **Cleanup**:
    *   Remove LLM temporary files (*PLAN.md, *SUMMARY.md, temp logs).
    *   Ensure `data/spools` contains no JSON files (ensure `data/spools/.gitkeep` exists).
    *   Ensure `test-results` and `playwright-report` are ignored/cleared.
    *   Verify `.gitignore` covers new artifacts.

2.  **Documentation**:
    *   Update `README.md` Screenshots if UI changed (use `node scripts/take-screenshots.js`).
    *   Update `README.md` Quick Start / Features sections.
    *   Update `improvement_roadmap.md` to check off completed items.

3.  **Build Validation**:
    *   **Check Mobile Impact**: If ANY client-side code (src/app, src/components, src/lib) changed, you MUST rebuild the Android APK.
    *   Run `npm run build` (PWA).
    *   Run `npm run cap:build` -> `cd android && ./gradlew assembleDebug` (Android).
    *   Ensure no secrets or test data are baked into the build.

4.  **Version & Release**:
    *   Bump version in `package.json` if applicable.
    *   Create a git tag (e.g., `v1.x.x`).
    *   Push `main` branch AND tags.
    *   Create GitHub Release (`gh release create`) with APK attached:
        ```bash
        gh release create v1.x.x "public/downloads/filamentdb.apk#Android APK" --title "v1.x.x - Title" --notes "Notes..."
        ```

5.  **Environment**:
    *   Reset local `data/` if requested to "clean state".
