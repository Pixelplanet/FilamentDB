# Plan: Update Logic, Security Purge, and UI Cleanup

## 1. Google Client ID Security Purge
**Objective**: Remove the hardcoded Google Client ID from all public files.
- [ ] **Edit `README.md`**: Replace specific ID with `your-client-id-here`.
- [ ] **Edit `web-app/docker-compose.yml`**: Replace specific ID with a placeholder.
- [ ] **Verify `.env.local`**: Ensure the local environment still has the valid key for local builds.

## 2. GitHub APK Link & Stability
**Objective**: Ensure the APK link is stable and the file exists.
- [ ] **Verify Link**: The link `https://github.com/Pixelplanet/FilamentDB/releases/latest/download/filamentdb.apk` is correct for the "Latest" release.
- [ ] **Action**: I verified `v0.2.3` has the asset. I will ensure `v0.2.4` also has it attached correctly.

## 3. User Management UI Cleanup
**Objective**: Completely hide user profile UI elements when `ENABLE_USER_MANAGEMENT=false`.
- [ ] **Context Update**: Ensure `AuthContext` correctly exposes a `showAuthUI` flag (derived from `enableUserManagement`).
- [ ] **Navigation Component**: Hide `UserMenu` entirely if auth is disabled.
- [ ] **UserMenu Component**: Double-check internal rendering logic.
- [ ] **Settings Page**: Hide "Login with User Account" section if auth is disabled.
- [ ] **Profile Page**: Add a redirect in `useEffect` if auth is disabled.

## 4. Android Update Checker
**Objective**: Notify Android users when a new APK is available on GitHub.
- [ ] **Create Utility**: `src/lib/githubUpdate.ts` to fetch `https://api.github.com/repos/Pixelplanet/FilamentDB/releases/latest`.
- [ ] **Settings Page Logic**:
    - On mount (or button click), fetch latest release tag.
    - Compare `latestTag` (e.g. `v0.2.4`) with `process.env.NEXT_PUBLIC_APP_VERSION` (`0.2.4`).
    - Logic: If `latestTag > currentVersion`, set `updateAvailable = true`.
- [ ] **UI Implementation**:
    - If `updateAvailable`: Show "Update Available (vX.X.X)" button -> Links to `latest/download/filamentdb.apk`.
    - If `latest`: Show "App is up to date".

## 5. Execution & Release
- [ ] Apply Code Changes.
- [ ] Build Mobile (Hybrid).
- [ ] Run Release Procedure -> `v0.2.4`.
