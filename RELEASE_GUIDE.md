# FilamentDB Release Guide

> **For LLMs, AI Assistants, and Human Developers**
> 
> This document contains all critical information needed to understand, maintain, and release new versions of FilamentDB. Read this carefully before making changes to the project structure or creating releases.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Critical Files & Naming Constraints](#critical-files--naming-constraints)
3. [Version Management](#version-management)
4. [Release Process](#release-process)
5. [Build Process](#build-process)
6. [Distribution Strategy](#distribution-strategy)
7. [Important Dependencies](#important-dependencies)
8. [Common Pitfalls](#common-pitfalls)

---

## 📦 Project Overview

**FilamentDB** is a hybrid web/mobile application for managing 3D printer filament inventory.

### Architecture
- **Framework**: Next.js 16 (App Router)
- **Mobile Platform**: Capacitor 8 (Android)
- **Database**: Dexie.js (IndexedDB) - client-side only
- **Deployment**: 
  - Web: Vercel/Netlify (or any Node.js host)
  - Mobile: APK distributed via GitHub Releases

### Key Features
- NFC tag scanning (mobile only)
- QR/Barcode scanning
- URL metadata scraping
- Offline-first inventory management
- Optional device sync

---

## 🚨 Critical Files & Naming Constraints

### **Files That MUST NOT Be Renamed**

#### 1. **APK Filename: `filamentdb.apk`**
**Location**: `web-app/public/downloads/filamentdb.apk` (local only, NOT in Git)

**Why It's Critical**:
- The app download links point to: `https://github.com/Pixelplanet/FilamentDB/releases/latest/download/filamentdb.apk`
- GitHub Releases uses the exact filename from the upload
- Changing this name breaks **ALL** existing download links in the app

**Where It's Referenced**:
- `web-app/src/app/page.tsx` (line ~59)
- `web-app/src/app/settings/page.tsx` (line ~194)
- GitHub Releases asset name
- Any external documentation/links

**If You Must Change It**:
1. Update BOTH download links in the source code
2. Update all previous releases (or accept broken old versions)
3. Update README and documentation
4. Consider URL redirects

---

#### 2. **Package Name: `web-app`**
**Location**: `web-app/package.json` → `"name": "web-app"`

**Why It's Critical**:
- Capacitor expects this app ID structure
- Build scripts reference this path
- Docker configurations use this folder name

**Where It's Referenced**:
- `web-app/android/app/build.gradle` (app package ID)
- `web-app/capacitor.config.ts`
- Build scripts in `web-app/scripts/`
- Docker compose files
- Documentation

---

#### 3. **Android Package ID: `com.pixelplanet.filamentdb`**
**Location**: `web-app/capacitor.config.ts` → `appId`

**Why It's Critical**:
- Android package names are **permanent** once published
- Changing this creates a completely different app in Android's eyes
- Users would need to uninstall and reinstall
- All app data would be lost

**Never change this unless starting a completely new app.**

---

#### 4. **Database Name: `FilamentDB`**
**Location**: `web-app/src/db/index.ts` → `new Dexie('FilamentDB')`

**Why It's Critical**:
- Changing this breaks access to existing user data
- Users would lose all their inventory
- No automatic migration path

**If You Must Change It**:
- Provide a data migration script
- Warn users in release notes
- Consider keeping old DB and copying data

---

#### 5. **API Routes**
**Locations**:
- `web-app/src/app/api/sync/route.ts`
- `web-app/src/app/api/scrape/route.ts`
- `web-app/src/app/api/proxy-scrape/route.ts`

**Why It's Critical**:
- Mobile apps have hardcoded API paths
- External sync servers may reference these endpoints
- Changing paths breaks mobile-server communication

**Safe to Change**: Query parameters, request/response bodies (with version checks)
**Unsafe to Change**: Route paths without major version bump

---

### **Files Safe to Rename**

- UI component files (as long as imports are updated)
- Hook files (`useNFC.ts`, etc.) - only imported locally
- Test files
- Documentation files (README, guides, etc.)
- Build script names (as long as package.json scripts are updated)

---

## 📊 Version Management

### Version Number Location

**Single Source of Truth**: `web-app/package.json`

```json
{
  "name": "web-app",
  "version": "0.1.4",  // ← THIS IS THE VERSION
  ...
}
```

### Versioning Strategy

Follow **Semantic Versioning** (semver): `MAJOR.MINOR.PATCH`

- **MAJOR** (1.0.0): Breaking changes, database schema changes, API changes
- **MINOR** (0.2.0): New features, non-breaking changes
- **PATCH** (0.1.5): Bug fixes, performance improvements

### Version References

The version appears in:
1. `web-app/package.json` → `version` field (primary)
2. `web-app/android/app/build.gradle` → `versionName` and `versionCode`
3. Settings page display (reads from package.json)
4. GitHub Release tag (e.g., `v0.1.4`)

### Updating Version

**Automated (Recommended)**:
```bash
cd web-app
npm version patch   # 0.1.4 → 0.1.5
npm version minor   # 0.1.4 → 0.2.0
npm version major   # 0.1.4 → 1.0.0
```

This automatically:
- Updates `package.json`
- Creates a Git commit
- Creates a Git tag

**Manual**:
1. Edit `web-app/package.json` → change `version`
2. Edit `web-app/android/app/build.gradle`:
   ```gradle
   versionCode 5       // Increment by 1 (integer)
   versionName "0.1.5" // Match package.json
   ```

---

## 🚀 Release Process

### Pre-Release Checklist

- [ ] All tests passing (`npm run test`)
- [ ] Code linted (`npm run lint`)
- [ ] Version number updated in `package.json`
- [ ] Android `versionCode` incremented (must always increase)
- [ ] CHANGELOG or release notes prepared
- [ ] Any breaking changes documented

### Step-by-Step Release

#### 1. **Update Version Numbers**

```bash
cd web-app
npm version patch  # or minor/major
```

This creates a Git commit and tag like `v0.1.5`.

#### 2. **Build the Web App**

```bash
# For web deployment (Vercel, Netlify, etc.)
npm run build

# For mobile (includes mobile-specific optimizations)
npm run build:mobile
```

#### 3. **Build the Android APK**

```bash
# Sync web assets to Android project
npm run cap:sync

# Build APK (opens Android Studio)
npx cap open android
```

**In Android Studio**:
1. Select **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Wait for build to complete
3. APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

**Copy APK to public folder**:
```bash
npm run copy:apk
```

This copies the APK to `web-app/public/downloads/filamentdb.apk`.

#### 4. **Create GitHub Release**

```bash
# From project root (FilamentDB/)
gh release create v0.1.5 \
  web-app/public/downloads/filamentdb.apk \
  --title "FilamentDB v0.1.5" \
  --notes-file CHANGELOG.md  # or write notes inline
```

**Release Notes Template**:
```markdown
## 🎉 FilamentDB v0.1.5

### 🆕 New Features
- Feature 1
- Feature 2

### 🐛 Bug Fixes
- Fix 1
- Fix 2

### 🔧 Improvements
- Improvement 1

### 📥 Download
- **Android APK**: Click the asset below
- **Web App**: Visit [your-deployment-url]

### ⚠️ Breaking Changes
(If any - clearly list what users need to do)

---
Made with ❤️ for the 3D printing community
```

#### 5. **Push Changes to GitHub**

```bash
git push origin main
git push origin --tags  # Push the version tag
```

#### 6. **Deploy Web App** (if applicable)

- **Vercel/Netlify**: Should auto-deploy on push to `main`
- **Manual**: Upload build artifacts or run deployment script

#### 7. **Verify Release**

- [ ] GitHub Release page shows APK asset
- [ ] APK download link works: `https://github.com/Pixelplanet/FilamentDB/releases/latest/download/filamentdb.apk`
- [ ] Web app deployed and accessible
- [ ] Download button in app points to correct URL

---

## 🏗️ Build Process

### Build Modes

FilamentDB has two build targets:

#### 1. **Web Build** (`npm run build`)
- Output: `.next/` folder
- For: Vercel, Netlify, or any Node.js hosting
- Features: Full web functionality, no Capacitor APIs

#### 2. **Mobile Build** (`npm run build:mobile`)
- Output: `.next/` folder (optimized for mobile)
- Sets: `BUILD_MODE=mobile` environment variable
- Features: Capacitor APIs enabled, mobile-specific optimizations

### Build Scripts

**Location**: `web-app/package.json`

```json
{
  "scripts": {
    "dev": "next dev",                    // Development server
    "build": "next build",                // Production web build
    "build:server": "...",                // Server mode (deprecated?)
    "build:mobile": "node scripts/build-mobile.js", // Mobile build
    "cap:sync": "npx cap sync android",   // Sync web → Android
    "cap:build": "npm run build:mobile && npx cap sync android",
    "copy:apk": "node scripts/copy-apk.js"
  }
}
```

### Build Order (Mobile)

1. `npm run build:mobile` → Creates optimized web build
2. `npm run cap:sync` → Copies web assets to `android/app/src/main/assets/public`
3. Android Studio → Builds APK from combined web + native code
4. `npm run copy:apk` → Copies APK to public folder

---

## 📦 Distribution Strategy

### Web (PWA)
- **Platform**: Vercel, Netlify, or self-hosted
- **Update Frequency**: Immediate (on push to main)
- **User Experience**: Auto-updates on refresh

### Android (APK)
- ⚠️ **NOT on Google Play Store** (side-loaded only)
- **Distribution**: GitHub Releases ONLY
- **Filename**: MUST be `filamentdb.apk`
- **Update Mechanism**: Manual (users must download new version)

### Why GitHub Releases?

1. **No bandwidth limits** (unlike Git LFS)
2. **Version history** (users can download old versions)
3. **Professional appearance**
4. **Stable URLs** (`/releases/latest/download/filename.apk`)
5. **No Git repository bloat** (APK not in Git history)

### APK Not in Git

**Important**: The APK is `.gitignore`d and should NEVER be committed:

```gitignore
# .gitignore
*.apk
web-app/public/downloads/*.apk
public/downloads/*.apk
```

**Workflow**:
1. Build APK locally
2. Keep local copy in `web-app/public/downloads/filamentdb.apk`
3. Upload to GitHub Releases
4. Do NOT commit to Git

---

## 🔗 Important Dependencies

### Critical Dependencies (Do Not Change Major Versions Without Testing)

| Package | Version | Why Critical |
|---------|---------|--------------|
| `next` | `16.1.0` | App Router features, breaking changes between major versions |
| `@capacitor/*` | `^8.0.0` | Native mobile APIs, 7→8 was breaking, 8→9 will be breaking |
| `dexie` | `^4.2.1` | Database migrations between major versions can break |
| `@capgo/capacitor-nfc` | `^8.0.5` | NFC API, must match Capacitor version |
| `react` | `19.2.3` | Next.js 16 requires React 19 |

### Safe to Update (Patch/Minor)
- UI libraries (`lucide-react`, `clsx`)
- Dev dependencies (ESLint, TypeScript)
- Testing libraries

### Update Strategy
```bash
# Check for updates
npm outdated

# Update non-breaking (patch/minor)
npm update

# Major version updates (test thoroughly!)
npm install package@next
```

---

## ⚠️ Common Pitfalls

### 1. **Forgetting to Increment Android versionCode**

**Problem**: Android rejects installations if `versionCode` doesn't increase.

**Solution**: Every release MUST increment `versionCode` in `android/app/build.gradle`:
```gradle
versionCode 6  // Was 5 in previous release
```

---

### 2. **Changing APK Filename**

**Problem**: Download links break, users can't find the file.

**Solution**: ALWAYS use `filamentdb.apk`. If you must change it, update:
- `page.tsx` download link
- `settings/page.tsx` download link
- All existing releases
- README

---

### 3. **Building Mobile Without `build:mobile`**

**Problem**: Using `npm run build` instead of `npm run build:mobile` creates a web-optimized build that may not work well in Capacitor.

**Solution**: Always use `npm run build:mobile` before `cap:sync`.

---

### 4. **Not Testing APK Before Release**

**Problem**: Releasing an untested APK can break user installations.

**Solution**: Always test the APK on a real device:
1. Install the APK
2. Test NFC scanning
3. Test QR scanning
4. Test offline functionality
5. Check permissions (Camera, NFC)

---

### 5. **Breaking Database Schema Without Migration**

**Problem**: Changing `db/index.ts` schema breaks existing user data.

**Solution**: Use Dexie migrations:
```typescript
const db = new Dexie('FilamentDB');
db.version(1).stores({
  spools: '++id, serial, brand'
});
db.version(2).stores({
  spools: '++id, serial, brand, newField'  // Added field
}).upgrade(tx => {
  // Migration logic
});
```

---

### 6. **Forgetting to Push Tags**

**Problem**: GitHub Releases need Git tags, but they're not pushed automatically.

**Solution**: After `npm version`:
```bash
git push origin main
git push origin --tags  # Don't forget this!
```

---

## 🧪 Testing Before Release

### Checklist

- [ ] **Unit Tests**: `npm run test`
- [ ] **Linting**: `npm run lint`
- [ ] **Web Build**: `npm run build` completes without errors
- [ ] **Mobile Build**: `npm run build:mobile` completes
- [ ] **APK Installs**: Test APK on physical Android device
- [ ] **NFC Works**: Scan an NFC tag (mobile)
- [ ] **QR Works**: Scan a QR code
- [ ] **Database Works**: Add/edit/delete spools
- [ ] **Offline Works**: Disable internet and test
- [ ] **Download Link**: Verify GitHub Releases URL resolves

---

## 📞 Questions for LLMs

If you're an LLM helping with a release and you're unsure:

### ❓ "Should I rename this file?"
- Check the "Critical Files" section above
- If it's listed as critical: **NO**
- If unsure: **Ask the user first**

### ❓ "What version number should I use?"
- Check `web-app/package.json` current version
- Ask user if it's a major/minor/patch change
- Use `npm version` to update

### ❓ "Can I change this dependency version?"
- Check "Important Dependencies" table
- Patch/minor updates: Usually safe
- Major updates: **Ask first, test thoroughly**

### ❓ "Should this APK go in Git?"
- **NO, NEVER**
- APKs go in GitHub Releases only
- Keep local copy for upload

### ❓ "The build failed, what do I do?"
1. Check error message
2. Check if dependencies are installed (`npm install`)
3. Check if Android SDK is configured
4. Check if Java 17 is installed (required for Capacitor 8)
5. Ask user for environment details

---

## 🔄 Emergency Procedures

### Rollback a Bad Release

1. **GitHub Release**:
   ```bash
   gh release delete v0.1.5
   git tag -d v0.1.5
   git push origin :refs/tags/v0.1.5
   ```

2. **Re-release Previous Version**:
   - Mark previous release as "Latest"
   - Or create hotfix version (v0.1.6)

3. **Web Deployment**:
   - Revert commit in Git
   - Redeploy

### Critical Bug in Production

1. **Create hotfix branch**:
   ```bash
   git checkout -b hotfix/v0.1.5
   ```

2. **Fix bug, test thoroughly**

3. **Fast-track release**:
   ```bash
   npm version patch
   # Build, release as normal but expedited
   ```

---

## 📚 Additional Resources

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Dexie.js Docs**: https://dexie.org/docs/
- **GitHub CLI Docs**: https://cli.github.com/manual/

---

## ✅ Release Checklist (Quick Reference)

```
[ ] Version updated in package.json
[ ] Android versionCode incremented
[ ] Tests passing
[ ] Lint clean
[ ] Build successful (mobile)
[ ] APK built and tested
[ ] APK copied to correct location
[ ] Release notes prepared
[ ] GitHub Release created with APK
[ ] Tags pushed to GitHub
[ ] Web app deployed
[ ] Download link verified
[ ] Release announced (if applicable)
```

---

**Last Updated**: December 27, 2025  
**Current Version**: v0.1.4  
**Maintainer**: Pixelplanet
