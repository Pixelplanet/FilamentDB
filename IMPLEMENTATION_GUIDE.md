# FilamentDB Implementation Guide for Future Features

> **For LLMs and AI Development Assistants**
>
> This guide provides detailed, actionable instructions for implementing features from the FilamentDB roadmap. Each task includes context, acceptance criteria, file locations, testing requirements, and common pitfalls.

---

## 📚 Table of Contents

- [Prerequisites](#prerequisites)
- [Phase 1: Stability & Safety](#phase-1-stability--safety)
  - [Task 1.1: Testing Infrastructure](#task-11-testing-infrastructure)
  - [Task 1.2: NFC Hook Refactoring](#task-12-nfc-hook-refactoring)
- [Phase 2: Performance & Synchronization](#phase-2-performance--synchronization)
  - [Task 2.1: Delta Syncing](#task-21-delta-syncing)
  - [Task 2.2: Conflict Resolution](#task-22-conflict-resolution)
- [Phase 3: UI/UX & Aesthetics](#phase-3-uiux--aesthetics)
  - [Task 3.1: Design System](#task-31-design-system)
  - [Task 3.2: Micro-animations](#task-32-micro-animations)
  - [Task 3.3: PWA Optimization](#task-33-pwa-optimization)
- [Known Issues to Fix](#known-issues-to-fix)

---

## 📋 Prerequisites

Before starting any task:

1. **Read** [RELEASE_GUIDE.md](RELEASE_GUIDE.md) - Understand critical file constraints
2. **Run** `npm install` in `web-app/` directory
3. **Test** the current app works: `npm run dev`
4. **Create** a new branch: `git checkout -b feature/your-feature-name`
5. **Verify** tests pass: `npm run test` (once tests exist)

---

# Phase 1: Stability & Safety

## Task 1.1: Testing Infrastructure

### 🎯 Objective
Set up comprehensive testing infrastructure to prevent regressions and enable confident refactoring.

### 📍 Current State
- ✅ Vitest is already installed (`web-app/vitest.config.ts` exists)
- ✅ Two test files exist:
  - `web-app/src/hooks/useNFC.test.ts`
  - `web-app/src/app/api/scrape/scrape.test.ts`
- ❌ No E2E tests
- ❌ No integration tests for database operations
- ❌ No tests for React components

### 🛠️ Implementation Steps

#### Step 1: Expand Unit Test Coverage

**Target Files to Test**:
1. `web-app/src/db/index.ts` (Database operations)
2. `web-app/src/hooks/useNFC.ts` (Already has some tests, expand coverage)
3. `web-app/src/app/api/sync/route.ts` (Sync logic)
4. `web-app/src/app/api/proxy-scrape/route.ts` (Scraping logic)

**Example: Testing Database Operations**

Create: `web-app/src/db/index.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './index';

describe('FilamentDB Database', () => {
  beforeEach(async () => {
    // Clear database before each test
    await db.spools.clear();
  });

  it('should add a new spool', async () => {
    const spool = {
      serial: 'TEST-001',
      brand: 'Test Brand',
      type: 'PLA',
      color: 'Red',
      colorHex: '#ff0000',
      weightRemaining: 1000,
      weightTotal: 1000,
      lastScanned: Date.now()
    };

    const id = await db.spools.add(spool);
    expect(id).toBeDefined();

    const retrieved = await db.spools.get(id);
    expect(retrieved?.brand).toBe('Test Brand');
  });

  it('should update spool weight', async () => {
    const id = await db.spools.add({
      serial: 'TEST-002',
      brand: 'Test',
      type: 'PETG',
      weightRemaining: 1000,
      weightTotal: 1000
    } as any);

    await db.spools.update(id, { weightRemaining: 500 });
    const updated = await db.spools.get(id);
    expect(updated?.weightRemaining).toBe(500);
  });

  it('should delete a spool', async () => {
    const id = await db.spools.add({ serial: 'TEST-003' } as any);
    await db.spools.delete(id);
    const deleted = await db.spools.get(id);
    expect(deleted).toBeUndefined();
  });
});
```

**Run tests**: `npm run test`

#### Step 2: Install and Configure Playwright

**Install Playwright**:
```bash
cd web-app
npm install -D @playwright/test
npx playwright install
```

**Create**: `web-app/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### Step 3: Create E2E Tests

**Create**: `web-app/e2e/inventory.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Inventory Management', () => {
  test('should add a new spool manually', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to Add Spool
    await page.click('text=Inventory');
    await page.click('text=Add New Spool');
    
    // Fill form
    await page.fill('input[name="brand"]', 'Test Brand');
    await page.selectOption('select[name="type"]', 'PLA');
    await page.fill('input[name="color"]', 'Red');
    await page.fill('input[type="color"]', '#ff0000');
    
    // Submit
    await page.click('button:has-text("Save")');
    
    // Verify spool appears in list
    await page.goto('/inventory');
    await expect(page.locator('text=Test Brand')).toBeVisible();
    await expect(page.locator('text=PLA')).toBeVisible();
  });

  test('should edit an existing spool', async ({ page }) => {
    // ... (similar pattern)
  });

  test('should delete a spool', async ({ page }) => {
    // ... (similar pattern)
  });
});
```

**Create**: `web-app/e2e/url-import.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('URL Import', () => {
  test('should import from Prusa URL', async ({ page }) => {
    await page.goto('/inventory/add');
    
    // Paste URL
    const testUrl = 'https://www.prusa3d.com/product/prusament-pla-prusa-orange-1kg/';
    await page.fill('input[placeholder*="URL"]', testUrl);
    await page.click('button:has-text("Analyze")');
    
    // Wait for analysis
    await page.waitForTimeout(2000);
    
    // Verify fields populated
    await expect(page.locator('input[value*="Prusa"]')).toBeVisible();
    await expect(page.locator('text=Orange')).toBeVisible();
  });
});
```

#### Step 4: Add Test Scripts to package.json

**Edit**: `web-app/package.json`

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

### ✅ Acceptance Criteria

- [ ] At least 80% code coverage for database operations
- [ ] E2E tests cover main user flows (add, edit, delete spool)
- [ ] URL import E2E test passes
- [ ] All tests pass: `npm run test:all`
- [ ] CI/CD pipeline runs tests (if applicable)

### ⚠️ Common Pitfalls

1. **IndexedDB in Tests**: Use Dexie's `fake-indexeddb` for unit tests
2. **Async Issues**: Always `await` database operations
3. **Test Isolation**: Clear database between tests to avoid flaky tests
4. **E2E Timeouts**: NFC tests won't work in Playwright (mock or skip)

### 📚 Resources

- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)
- [Testing Dexie](https://dexie.org/docs/Tutorial/Testing)

---

## Task 1.2: NFC Hook Refactoring

### 🎯 Objective
Fix memory leaks and improve error handling in the NFC scanning hook.

### 📍 Current State
**File**: `web-app/src/hooks/useNFC.ts`

**Known Issues**:
1. ❌ Native listeners (`ndefDiscovered`, `tagDiscovered`) are registered but never removed
2. ❌ Multiple listeners can accumulate if component remounts
3. ❌ No error handling for "NFC Disabled" state
4. ❌ No error handling for "Permission Denied" state

### 🛠️ Implementation Steps

#### Step 1: Add Listener Cleanup

**Current Pattern** (problematic):
```typescript
const startScan = async () => {
  // Listeners added but never removed
  NFC.addListener('ndefDiscovered', handleNdefDiscovered);
  NFC.addListener('tagDiscovered', handleTagDiscovered);
};
```

**Fixed Pattern**:
```typescript
import { useEffect, useRef } from 'react';

export function useNFC() {
  const listenersRegistered = useRef(false);

  useEffect(() => {
    // Cleanup function to remove listeners
    return () => {
      if (listenersRegistered.current) {
        NFC.removeAllListeners();
        listenersRegistered.current = false;
      }
    };
  }, []);

  const startScan = async () => {
    if (listenersRegistered.current) {
      // Already registered, don't add duplicates
      return;
    }

    await NFC.addListener('ndefDiscovered', handleNdefDiscovered);
    await NFC.addListener('tagDiscovered', handleTagDiscovered);
    listenersRegistered.current = true;
  };

  const stopScan = async () => {
    if (listenersRegistered.current) {
      await NFC.removeAllListeners();
      listenersRegistered.current = false;
    }
  };

  return { startScan, stopScan, /* ... */ };
}
```

#### Step 2: Add Error Handling

**Check NFC Availability**:
```typescript
const checkNFCAvailability = async () => {
  try {
    // Check if NFC is supported
    const isSupported = await NFC.isSupported();
    if (!isSupported) {
      return { available: false, error: 'NFC_NOT_SUPPORTED' };
    }

    // Check if NFC is enabled
    const isEnabled = await NFC.isEnabled();
    if (!isEnabled) {
      return { available: false, error: 'NFC_DISABLED' };
    }

    return { available: true, error: null };
  } catch (error) {
    return { available: false, error: 'PERMISSION_DENIED' };
  }
};
```

**Use in startScan**:
```typescript
const startScan = async () => {
  const { available, error } = await checkNFCAvailability();
  
  if (!available) {
    setScanError(error);
    
    // Provide user-friendly messages
    switch (error) {
      case 'NFC_NOT_SUPPORTED':
        showToast('This device does not support NFC');
        break;
      case 'NFC_DISABLED':
        showToast('Please enable NFC in device settings');
        break;
      case 'PERMISSION_DENIED':
        showToast('NFC permission denied. Please grant permission in settings');
        break;
    }
    
    return;
  }

  // Proceed with scanning...
};
```

#### Step 3: Add State Management

```typescript
export function useNFC() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<any>(null);

  // ... rest of implementation
}
```

#### Step 4: Update Tests

**Edit**: `web-app/src/hooks/useNFC.test.ts`

Add tests for:
- Listener cleanup
- Error states
- Multiple scan attempts

```typescript
describe('useNFC - Error Handling', () => {
  it('should handle NFC not supported', async () => {
    // Mock NFC.isSupported to return false
    // ... test implementation
  });

  it('should handle NFC disabled', async () => {
    // Mock NFC.isEnabled to return false
    // ... test implementation
  });

  it('should not register duplicate listeners', async () => {
    // Call startScan twice
    // Verify listeners only registered once
  });
});
```

### ✅ Acceptance Criteria

- [ ] Listeners are removed when component unmounts
- [ ] No duplicate listeners registered
- [ ] Clear error messages for NFC not available
- [ ] Clear error messages for NFC disabled
- [ ] Clear error messages for permission denied
- [ ] Tests cover all error scenarios
- [ ] Memory leak verified fixed (use React DevTools Profiler)

### ⚠️ Common Pitfalls

1. **Capacitor Platform Check**: Always check if running on native before using NFC APIs
2. **Async Cleanup**: Use `useEffect` cleanup, not `componentWillUnmount`
3. **Double Invocation**: React 18 StrictMode calls effects twice in dev
4. **Permission Timing**: Some permissions must be requested before checking availability

### 📚 Resources

- [Capacitor NFC Plugin Docs](https://github.com/capgo/capacitor-nfc)
- [React useEffect Cleanup](https://react.dev/reference/react/useEffect#useeffect)

---

# Phase 2: Performance & Synchronization

## Task 2.1: Delta Syncing

### 🎯 Objective
Replace full dump/pull sync with efficient delta synchronization based on timestamps.

### 📍 Current State
**File**: `web-app/src/app/settings/page.tsx` (sync logic)

**Current Implementation**:
- Sends ALL spools to server on every sync
- Receives ALL spools from server
- No tracking of what changed

**Problems**:
- Inefficient for large inventories (>100 spools)
- Wastes bandwidth
- Slower sync times

### 🛠️ Implementation Steps

#### Step 1: Add Timestamp Fields to Database

**Edit**: `web-app/src/db/index.ts`

```typescript
const db = new Dexie('FilamentDB');

db.version(1).stores({
  spools: '++id, serial, brand, type, color, lastScanned'
});

// NEW VERSION with timestamps
db.version(2).stores({
  spools: '++id, serial, brand, type, color, lastScanned, lastUpdated'
}).upgrade(tx => {
  // Migrate existing data
  return tx.table('spools').toCollection().modify(spool => {
    spool.lastUpdated = spool.lastScanned || Date.now();
  });
});

export interface Spool {
  id?: number;
  serial: string;
  brand?: string;
  type: string;
  color?: string;
  colorHex?: string;
  diameter?: number;
  weightTotal: number;
  weightRemaining: number;
  purchaseDate?: number;
  notes?: string;
  lastScanned?: number;
  lastUpdated: number; // NEW FIELD
}
```

#### Step 2: Track Last Sync Time

**Add to localStorage**:
```typescript
const LAST_SYNC_KEY = 'filamentdb_last_sync_timestamp';

const getLastSyncTime = (): number => {
  const stored = localStorage.getItem(LAST_SYNC_KEY);
  return stored ? parseInt(stored, 10) : 0;
};

const setLastSyncTime = (timestamp: number) => {
  localStorage.setItem(LAST_SYNC_KEY, timestamp.toString());
};
```

#### Step 3: Implement Delta Sync Logic

**Edit**: `web-app/src/app/settings/page.tsx`

```typescript
const performSync = async () => {
  if (!serverUrl) return;
  setSyncing(true);
  setSyncStatus('Connecting...');

  try {
    const lastSyncTime = getLastSyncTime();
    const syncStartTime = Date.now();

    // 1. Get ONLY MODIFIED local spools (since last sync)
    const modifiedSpools = await db.spools
      .where('lastUpdated')
      .above(lastSyncTime)
      .toArray();

    setSyncStatus(`Uploading ${modifiedSpools.length} changed spools...`);

    // 2. Send delta to server
    const res = await fetch(`${serverUrl}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spools: modifiedSpools,
        lastSyncTime: lastSyncTime, // Tell server what we know
        syncType: 'delta'
      })
    });

    if (!res.ok) throw new Error(`Server Error: ${res.status}`);

    const data = await res.json();

    // 3. Server returns ONLY changed spools (since our lastSyncTime)
    if (data.changedSpools && data.changedSpools.length > 0) {
      setSyncStatus(`Downloading ${data.changedSpools.length} changed spools...`);
      
      // Merge server changes
      await db.spools.bulkPut(data.changedSpools);
    }

    // 4. Handle deletions (server sends IDs of deleted spools)
    if (data.deletedSpoolIds && data.deletedSpoolIds.length > 0) {
      await db.spools.bulkDelete(data.deletedSpoolIds);
    }

    // 5. Update last sync timestamp
    setLastSyncTime(syncStartTime);
    
    const now = new Date().toLocaleString();
    localStorage.setItem('filamentdb_lastscan', now);
    setLastSync(now);
    setSyncStatus(`Sync Complete! (Synced ${modifiedSpools.length + data.changedSpools.length} items)`);

  } catch (e: any) {
    console.error(e);
    setSyncStatus(`Error: ${e.message}`);
  } finally {
    setSyncing(false);
  }
};
```

#### Step 4: Update Server API (if you control it)

**Edit**: `web-app/src/app/api/sync/route.ts`

```typescript
export async function POST(request: Request) {
  const { spools, lastSyncTime, syncType } = await request.json();

  if (syncType === 'delta') {
    // Get server spools modified since client's lastSyncTime
    const changedSpools = await getSpoolsModifiedSince(lastSyncTime);
    const deletedSpoolIds = await getDeletedSpoolsSince(lastSyncTime);

    // Merge client's changes into server database
    await mergeSpools(spools);

    return NextResponse.json({
      changedSpools,
      deletedSpoolIds,
      stats: { total: await getTotalSpoolCount() }
    });
  }

  // Fallback to full sync
  // ... existing implementation
}
```

#### Step 5: Auto-update lastUpdated on Changes

**Create**: `web-app/src/db/hooks.ts`

```typescript
import { db } from './index';

// Wrapper functions that auto-update timestamps

export async function addSpool(spool: Omit<Spool, 'id' | 'lastUpdated'>) {
  return db.spools.add({
    ...spool,
    lastUpdated: Date.now()
  });
}

export async function updateSpool(id: number, changes: Partial<Spool>) {
  return db.spools.update(id, {
    ...changes,
    lastUpdated: Date.now()
  });
}

export async function deleteSpool(id: number) {
  // Track deletion timestamp if needed for sync
  return db.spools.delete(id);
}
```

**Update all code** that modifies spools to use these wrappers.

### ✅ Acceptance Criteria

- [ ] Database schema updated with `lastUpdated` field
- [ ] Migration runs successfully on existing data
- [ ] Only modified spools are sent to server
- [ ] Only modified spools are received from server
- [ ] Sync time reduced by >50% for large inventories
- [ ] Tests verify delta sync works correctly
- [ ] Full sync still available as fallback

### ⚠️ Common Pitfalls

1. **Clock Skew**: Server and client clocks may differ - use server time as authority
2. **Migration**: Test upgrade path with existing user data
3. **Conflict Window**: Changes between sync start and end can be missed
4. **Deletion Tracking**: Need to track deletions separately (tombstone pattern)

### 📚 Resources

- [Dexie Schema Versioning](https://dexie.org/docs/Tutorial/Design#database-versioning)
- [Delta Sync Patterns](https://martinfowler.com/bliki/DeltaSync.html)

---

## Task 2.2: Conflict Resolution

### 🎯 Objective
Implement a conflict resolution strategy when the same spool is modified on multiple devices.

### 📍 Current State
- No conflict detection
- Last write wins (implicitly)
- Users can lose data if syncing from multiple devices

### 🛠️ Implementation Steps

#### Step 1: Choose a Resolution Strategy

**Options**:
1. **Last-Write-Wins (LWW)**: Simplest, most recent change wins
2. **Server-Wins**: Server is authority
3. **Client-Wins**: Client always overwrites server
4. **Field-Level Merge**: Merge non-conflicting fields
5. **Manual Resolution**: Ask user to choose

**Recommended**: Start with **Last-Write-Wins** with field-level merge for non-critical fields.

#### Step 2: Add Conflict Detection Fields

**Edit**: `web-app/src/db/index.ts`

```typescript
export interface Spool {
  // ... existing fields
  lastUpdated: number;
  lastSyncedVersion?: number; // Server's version number
  conflictFlag?: boolean; // Mark conflicts for user review
}
```

#### Step 3: Implement LWW with Field Merge

**Create**: `web-app/src/sync/conflictResolver.ts`

```typescript
export interface SyncConflict {
  spoolId: string;
  localVersion: Spool;
  serverVersion: Spool;
  conflictFields: string[];
}

export function detectConflicts(
  localSpool: Spool,
  serverSpool: Spool
): SyncConflict | null {
  // No conflict if IDs don't match
  if (localSpool.serial !== serverSpool.serial) return null;

  const conflictFields: string[] = [];

  // Check each field for conflicts
  const fieldsToCheck = ['brand', 'type', 'color', 'weightRemaining', 'weightTotal'];
  
  for (const field of fieldsToCheck) {
    if (localSpool[field] !== serverSpool[field]) {
      conflictFields.push(field);
    }
  }

  if (conflictFields.length === 0) return null;

  return {
    spoolId: localSpool.serial,
    localVersion: localSpool,
    serverVersion: serverSpool,
    conflictFields
  };
}

export function resolveConflict(
  conflict: SyncConflict,
  strategy: 'lww' | 'server-wins' | 'client-wins' = 'lww'
): Spool {
  const { localVersion, serverVersion } = conflict;

  switch (strategy) {
    case 'server-wins':
      return serverVersion;
    
    case 'client-wins':
      return localVersion;
    
    case 'lww':
    default:
      // Last-Write-Wins based on lastUpdated timestamp
      if (localVersion.lastUpdated > serverVersion.lastUpdated) {
        return localVersion;
      } else if (serverVersion.lastUpdated > localVersion.lastUpdated) {
        return serverVersion;
      } else {
        // Timestamps equal - merge fields intelligently
        return mergeSpools(localVersion, serverVersion);
      }
  }
}

function mergeSpools(local: Spool, server: Spool): Spool {
  return {
    ...server, // Start with server version
    // Override with local changes for these fields
    weightRemaining: local.weightRemaining < server.weightRemaining 
      ? local.weightRemaining  // Use lower weight (more conservative)
      : server.weightRemaining,
    notes: local.notes || server.notes, // Preserve notes
    lastUpdated: Math.max(local.lastUpdated, server.lastUpdated)
  };
}
```

#### Step 4: Integrate into Sync Logic

**Edit**: `web-app/src/app/settings/page.tsx`

```typescript
import { detectConflicts, resolveConflict } from '@/sync/conflictResolver';

const performSync = async () => {
  // ... existing code

  // When receiving server spools
  if (data.changedSpools && data.changedSpools.length > 0) {
    const resolvedSpools: Spool[] = [];
    const conflicts: SyncConflict[] = [];

    for (const serverSpool of data.changedSpools) {
      // Check if we have a local version
      const localSpool = await db.spools
        .where('serial')
        .equals(serverSpool.serial)
        .first();

      if (localSpool) {
        const conflict = detectConflicts(localSpool, serverSpool);
        
        if (conflict) {
          // Resolve conflict
          const resolved = resolveConflict(conflict, 'lww');
          resolvedSpools.push(resolved);
          conflicts.push(conflict);
        } else {
          // No conflict, use server version
          resolvedSpools.push(serverSpool);
        }
      } else {
        // New spool from server
        resolvedSpools.push(serverSpool);
      }
    }

    // Apply resolved spools
    await db.spools.bulkPut(resolvedSpools);

    // Notify user of conflicts
    if (conflicts.length > 0) {
      console.warn('Resolved conflicts:', conflicts);
      setSyncStatus(`Sync complete (${conflicts.length} conflicts auto-resolved)`);
    }
  }

  // ... rest of sync logic
};
```

#### Step 5: Add UI for Manual Conflict Resolution (Optional)

For critical conflicts, show a UI:

**Create**: `web-app/src/components/ConflictResolver.tsx`

```typescript
export function ConflictResolver({ conflict, onResolve }: Props) {
  return (
    <div className="conflict-dialog">
      <h3>Sync Conflict Detected</h3>
      <p>Spool "{conflict.spoolId}" was modified on multiple devices.</p>
      
      <div className="conflict-options">
        <div className="option">
          <h4>Your Device</h4>
          <SpoolPreview spool={conflict.localVersion} />
          <button onClick={() => onResolve(conflict.localVersion)}>
            Use This Version
          </button>
        </div>

        <div className="option">
          <h4>Server</h4>
          <SpoolPreview spool={conflict.serverVersion} />
          <button onClick={() => onResolve(conflict.serverVersion)}>
            Use This Version
          </button>
        </div>
      </div>
    </div>
  );
}
```

### ✅ Acceptance Criteria

- [ ] Conflicts are detected when same spool modified on different devices
- [ ] LWW resolution works correctly
- [ ] Weight field uses conservative merge (lower value)
- [ ] User is notified when conflicts are auto-resolved
- [ ] Tests cover conflict scenarios
- [ ] No data loss in conflict resolution

### ⚠️ Common Pitfalls

1. **Timestamp Trust**: Client clocks can be wrong - consider using server timestamps
2. **Serial Uniqueness**: Ensure `serial` is truly unique across devices
3. **Field Sensitivity**: Some fields (like weight) need special handling
4. **User Experience**: Too many conflict prompts annoy users - auto-resolve when safe

### 📚 Resources

- [Conflict-Free Replicated Data Types](https://crdt.tech/)
- [Offline-First Sync Patterns](https://developers.google.com/web/fundamentals/instant-and-offline/offline-cookbook)

---

# Phase 3: UI/UX & Aesthetics

## Task 3.1: Design System

### 🎯 Objective
Create a consistent design system with standardized colors, spacing, and typography.

### 📍 Current State
**File**: `web-app/src/app/globals.css`

**Issues**:
- Ad-hoc Tailwind classes throughout components
- Inconsistent color usage
- No centralized design tokens
- Hard to change theme globally

### 🛠️ Implementation Steps

#### Step 1: Define Design Tokens

**Edit**: `web-app/src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Color Palette */
    --color-primary: 220 90% 56%;        /* Blue */
    --color-primary-dark: 220 90% 40%;
    --color-secondary: 30 100% 50%;      /* Orange */
    --color-secondary-dark: 30 100% 35%;
    
    --color-success: 142 71% 45%;        /* Green */
    --color-warning: 45 93% 47%;         /* Yellow */
    --color-error: 0 84% 60%;            /* Red */
    --color-info: 199 89% 48%;           /* Cyan */

    /* Neutrals */
    --color-gray-50: 210 20% 98%;
    --color-gray-100: 210 20% 95%;
    --color-gray-200: 210 16% 88%;
    --color-gray-300: 210 13% 75%;
    --color-gray-400: 210 10% 60%;
    --color-gray-500: 210 9% 45%;
    --color-gray-600: 210 10% 35%;
    --color-gray-700: 210 12% 25%;
    --color-gray-800: 210 15% 15%;
    --color-gray-900: 210 18% 10%;

    /* Spacing Scale (based on 4px grid) */
    --spacing-0: 0;
    --spacing-1: 0.25rem;  /* 4px */
    --spacing-2: 0.5rem;   /* 8px */
    --spacing-3: 0.75rem;  /* 12px */
    --spacing-4: 1rem;     /* 16px */
    --spacing-6: 1.5rem;   /* 24px */
    --spacing-8: 2rem;     /* 32px */
    --spacing-12: 3rem;    /* 48px */
    --spacing-16: 4rem;    /* 64px */

    /* Border Radius */
    --radius-sm: 0.375rem;  /* 6px */
    --radius-md: 0.5rem;    /* 8px */
    --radius-lg: 0.75rem;   /* 12px */
    --radius-xl: 1rem;      /* 16px */
    --radius-full: 9999px;

    /* Typography */
    --font-sans: 'Inter', system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', monospace;

    --text-xs: 0.75rem;     /* 12px */
    --text-sm: 0.875rem;    /* 14px */
    --text-base: 1rem;      /* 16px */
    --text-lg: 1.125rem;    /* 18px */
    --text-xl: 1.25rem;     /* 20px */
    --text-2xl: 1.5rem;     /* 24px */
    --text-3xl: 1.875rem;   /* 30px */
    --text-4xl: 2.25rem;    /* 36px */

    /* Shadows */
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
    --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);

    /* Animation Durations */
    --duration-fast: 150ms;
    --duration-normal: 300ms;
    --duration-slow: 500ms;
  }

  .dark {
    /* Override colors for dark mode */
    --color-gray-50: 210 18% 10%;
    --color-gray-100: 210 15% 15%;
    /* ... etc */
  }
}

@layer components {
  /* Button Styles */
  .btn {
    @apply px-4 py-2 rounded-lg font-medium transition-colors duration-[var(--duration-normal)];
  }

  .btn-primary {
    @apply btn bg-blue-600 text-white hover:bg-blue-700;
  }

  .btn-secondary {
    @apply btn bg-gray-200 text-gray-800 hover:bg-gray-300;
  }

  .btn-success {
    @apply btn bg-green-600 text-white hover:bg-green-700;
  }

  .btn-danger {
    @apply btn bg-red-600 text-white hover:bg-red-700;
  }

  /* Card Styles */
  .card {
    @apply bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6;
  }

  .card-header {
    @apply font-bold text-lg mb-4;
  }

  /* Form Input Styles */
  .input {
    @apply w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500;
  }

  .label {
    @apply block text-sm font-medium mb-1;
  }

  /* Badge Styles */
  .badge {
    @apply inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold;
  }

  .badge-primary {
    @apply badge bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400;
  }

  .badge-success {
    @apply badge bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400;
  }
}
```

#### Step 2: Update Tailwind Config

**Edit**: `web-app/tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'hsl(var(--color-primary))',
          dark: 'hsl(var(--color-primary-dark))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--color-secondary))',
          dark: 'hsl(var(--color-secondary-dark))',
        },
        success: 'hsl(var(--color-success))',
        warning: 'hsl(var(--color-warning))',
        error: 'hsl(var(--color-error))',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      spacing: {
        '1': 'var(--spacing-1)',
        '2': 'var(--spacing-2)',
        '3': 'var(--spacing-3)',
        '4': 'var(--spacing-4)',
        '6': 'var(--spacing-6)',
        '8': 'var(--spacing-8)',
        '12': 'var(--spacing-12)',
        '16': 'var(--spacing-16)',
      },
    },
  },
  plugins: [],
};

export default config;
```

#### Step 3: Refactor Components to Use Design System

**Example**: Update a button

**Before**:
```tsx
<button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
  Save
</button>
```

**After**:
```tsx
<button className="btn-primary">
  Save
</button>
```

**Systematically update** all components in:
- `web-app/src/app/page.tsx`
- `web-app/src/app/inventory/**/*.tsx`
- `web-app/src/app/settings/page.tsx`
- `web-app/src/components/*.tsx`

#### Step 4: Create Reusable Component Library

**Create**: `web-app/src/components/ui/Button.tsx`

```typescript
import { ComponentProps } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ComponentProps<'button'> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ 
  variant = 'primary', 
  size = 'md',
  className,
  children,
  ...props 
}: ButtonProps) {
  const baseClass = 'btn';
  const variantClass = `btn-${variant}`;
  const sizeClass = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  }[size];

  return (
    <button 
      className={clsx(baseClass, variantClass, sizeClass, className)}
      {...props}
    >
      {children}
    </button>
  );
}
```

**Similarly create**:
- `Card.tsx`
- `Input.tsx`
- `Badge.tsx`
- `Modal.tsx`

### ✅ Acceptance Criteria

- [ ] All colors defined as CSS variables
- [ ] Consistent spacing across all pages
- [ ] All buttons use design system classes
- [ ] Typography scale applied consistently
- [ ] Dark mode works correctly
- [ ] No hardcoded colors (search for `bg-blue-600`, etc.)
- [ ] Design tokens documented in Storybook or similar

### ⚠️ Common Pitfalls

1. **Tailwind Purging**: Ensure dynamic classes are safelisted
2. **CSS Specificity**: Component classes may conflict with utility classes
3. **Dark Mode**: Test all components in both light and dark modes
4. **Migration**: Update all components systematically, don't leave stragglers

---

## Task 3.2: Micro-animations

### 🎯 Objective
Add smooth, delightful animations to improve user experience.

### 📍 Current State
- Some basic hover effects
- No page transitions
- No loading animations (except spinners)

### 🛠️ Implementation Steps

#### Step 1: Install Framer Motion

```bash
cd web-app
npm install framer-motion
```

#### Step 2: Add Page Transitions

**Create**: `web-app/src/components/PageTransition.tsx`

```typescript
'use client';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut'
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: 'easeIn'
    }
  }
};

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
```

**Use in pages**:
```tsx
// In any page.tsx
export default function Page() {
  return (
    <PageTransition>
      <div className="space-y-8">
        {/* ... page content */}
      </div>
    </PageTransition>
  );
}
```

#### Step 3: Animate Inventory Cards

**Edit**: `web-app/src/app/inventory/page.tsx` (or wherever spools are displayed)

```tsx
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3
    }
  }
};

export default function InventoryPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {spools.map(spool => (
        <motion.div
          key={spool.id}
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="card cursor-pointer"
        >
          {/* Spool content */}
        </motion.div>
      ))}
    </motion.div>
  );
}
```

#### Step 4: Add Loading Skeletons

**Create**: `web-app/src/components/SkeletonLoader.tsx`

```tsx
import { motion } from 'framer-motion';

export function SpoolCardSkeleton() {
  return (
    <motion.div
      animate={{
        opacity: [0.5, 1, 0.5]
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
      className="card"
    >
      <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full mb-4" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-3/4" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
    </motion.div>
  );
}
```

#### Step 5: Add Micro-interactions

**Button Press Animation**:
```tsx
<motion.button
  whileTap={{ scale: 0.95 }}
  className="btn-primary"
>
  Save
</motion.button>
```

**Smooth Number Transitions**:
```tsx
import { useSpring, animated } from 'framer-motion';

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(value, {
    stiffness: 100,
    damping: 30
  });

  return <animated.span>{spring.to(n => n.toFixed(2))}</animated.span>;
}
```

**Success Checkmark Animation**:
```tsx
<motion.svg
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
>
  <motion.path
    initial={{ pathLength: 0 }}
    animate={{ pathLength: 1 }}
    transition={{ duration: 0.5, ease: 'easeInOut' }}
    d="M5 10 L10 15 L20 5"
    stroke="currentColor"
    fill="none"
  />
</motion.svg>
```

### ✅ Acceptance Criteria

- [ ] Page transitions smooth and subtle
- [ ] Inventory cards animate on load
- [ ] Hover effects on interactive elements
- [ ] Loading states use skeleton screens
- [ ] No jank or performance issues
- [ ] Animations respect `prefers-reduced-motion`

### ⚠️ Common Pitfalls

1. **Performance**: Too many animations can cause jank
2. **Accessibility**: Always respect `prefers-reduced-motion`
3. **Server Components**: Framer Motion requires 'use client'
4. **Overdoing It**: Subtle is better than flashy

---

## Task 3.3: PWA Optimization

### 🎯 Objective
Optimize the app to work perfectly as a standalone PWA on mobile devices.

### 📍 Current State
- Next.js app (can be installed as PWA)
- May not have optimal manifest
- Icons may not be complete

### 🛠️ Implementation Steps

#### Step 1: Create Web Manifest

**Create**: `web-app/public/manifest.json`

```json
{
  "name": "FilamentDB - Filament Inventory Manager",
  "short_name": "FilamentDB",
  "description": "Manage your 3D printer filament inventory with NFC scanning",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["productivity", "utilities"],
  "screenshots": [
    {
      "src": "/screenshots/dashboard.png",
      "sizes": "1280x720",
      "type": "image/png"
    },
    {
      "src": "/screenshots/scan.png",
      "sizes": "1280x720",
      "type": "image/png"
    }
  ]
}
```

#### Step 2: Generate Icons

Use a tool like [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator):

```bash
npx pwa-asset-generator logo.svg ./public/icons -m ./public/manifest.json
```

Or manually create icons at all required sizes.

#### Step 3: Add Manifest to Layout

**Edit**: `web-app/src/app/layout.tsx`

```tsx
export const metadata: Metadata = {
  title: 'FilamentDB',
  description: 'Manage your 3D printer filament inventory',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FilamentDB'
  },
  formatDetection: {
    telephone: false
  },
  themeColor: '#3b82f6',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false
  }
};
```

#### Step 4: Add Service Worker (Optional for Next.js)

Next.js doesn't require manual service worker setup, but you can add one for advanced caching.

**Install**:
```bash
npm install next-pwa
```

**Edit**: `web-app/next.config.ts`

```typescript
import withPWA from 'next-pwa';

const nextConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
})({
  // Your existing Next.js config
});

export default nextConfig;
```

#### Step 5: Test PWA

1. Build production version: `npm run build`
2. Run locally: `npm run start`
3. Open Chrome DevTools → Lighthouse
4. Run PWA audit
5. Fix any issues

### ✅ Acceptance Criteria

- [ ] Manifest.json complete with all icons
- [ ] PWA installable on mobile and desktop
- [ ] Works offline (basic functionality)
- [ ] Lighthouse PWA score >90
- [ ] Splash screen shows correctly
- [ ] App feels native when installed

### ⚠️ Common Pitfalls

1. **HTTPS Required**: PWA features require HTTPS (except localhost)
2. **Scope**: Ensure `start_url` and `scope` in manifest are correct
3. **Icons**: Need specific sizes for different platforms
4. **Caching**: Be careful with service worker caching strategies

---

# Known Issues to Fix

## Issue: Metadata Visibility

**Description**: Brand or color sometimes don't display in inventory cards.

**Files**: 
- `web-app/src/app/inventory/page.tsx`
- Inventory card component

**Root Cause**: Likely missing null checks or incorrect data mapping.

**Fix**:
```tsx
// Before
<p>{spool.brand} {spool.type}</p>

// After
<p>{spool.brand || 'Unknown'} {spool.type}</p>
```

---

## Issue: URL Analyze Loading State

**Description**: No visual feedback when analyzing URL.

**File**: `web-app/src/app/inventory/add/page.tsx`

**Fix**:
```tsx
const [analyzing, setAnalyzing] = useState(false);

const analyzeUrl = async () => {
  setAnalyzing(true);
  try {
    // ... existing logic
  } finally {
    setAnalyzing(false);
  }
};

// In JSX
<button 
  onClick={analyzeUrl}
  disabled={analyzing}
  className="btn-primary"
>
  {analyzing ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin mr-2" />
      Analyzing...
    </>
  ) : (
    'Analyze URL'
  )}
</button>
```

---

## ✅ General Testing Checklist

Before marking any task as complete:

- [ ] Code lints without errors: `npm run lint`
- [ ] All tests pass: `npm run test:all`
- [ ] Manual testing on desktop browser
- [ ] Manual testing on mobile device (if applicable)
- [ ] Dark mode tested
- [ ] Accessibility checked (keyboard nav, screen reader)
- [ ] Performance acceptable (no jank, fast load times)
- [ ] Documentation updated
- [ ] RELEASE_GUIDE.md reviewed (no critical file changes)

---

## 📞 Questions for LLMs

### "Should I start this task?"

1. Have you read RELEASE_GUIDE.md? 
2. Do you understand the current architecture?
3. Have you created a feature branch?
4. Do you have a clear acceptance criteria?

If all yes → Proceed. If any no → Ask user first.

### "This requires changing a critical file"

1. Check RELEASE_GUIDE.md "Critical Files" section
2. If listed as critical → **Ask user before changing**
3. If not listed → Proceed with caution, add tests

### "The task is unclear"

1. Ask user for clarification
2. Define acceptance criteria together
3. Break into smaller sub-tasks if needed

---

**Last Updated**: December 27, 2025  
**Current Version**: v0.1.4  
**Maintainer**: Pixelplanet

---

**Remember**: Quality over speed. Test thoroughly. Don't break existing functionality. When in doubt, ask the user.
