# File-Based Storage Migration Plan

> **Migration from IndexedDB to JSON file-based storage**  
> **Format**: JSON with pretty-print (2-space indent)  
> **Filename**: `{type}-{brand}-{color}-{serial}.json`

---

## 📋 Overview

### Current Architecture
- **Web**: IndexedDB (browser-based, no file access)
- **Mobile**: IndexedDB via Capacitor
- **Sync**: Delta sync with conflict resolution, server maintains state

### Target Architecture
- **Web**: Server-side file storage + API
- **Mobile**: Device file storage + File System API
- **Sync**: File-based sync (compare modification times)

---

## 🎯 Goals

1. ✅ Human-readable JSON files per spool
2. ✅ Simplified sync (file-level instead of delta)
3. ✅ Easy backup/restore (just copy folder)
4. ✅ Git-friendly (can track changes)
5. ✅ Platform-agnostic (works everywhere)

---

## 📁 File Structure

### File Naming Convention

**Format**: `{type}-{brand}-{color}-{serial}.json`

**Examples**:
```
spools/
├── PLA-Prusament-GalaxyBlack-ABC123.json
├── PETG-BambuLab-Orange-XYZ789.json
├── ABS-Hatchbox-White-LMN456.json
└── TPU-Overture-Clear-RST012.json
```

**Sanitization Rules**:
- Remove special characters: `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`
- Replace spaces with hyphens: `Galaxy Black` → `GalaxyBlack`
- Convert to safe filename: `Prusa™` → `Prusa`
- Truncate if too long: Max 255 chars total

### File Content

**Schema**:
```json
{
  "id": 1,
  "serial": "ABC123",
  "brand": "Prusament",
  "type": "PLA",
  "color": "Galaxy Black",
  "colorHex": "#1a1a2e",
  "diameter": 1.75,
  "weightTotal": 1000,
  "weightRemaining": 750,
  "price": 24.99,
  "purchaseDate": "2024-01-15",
  "notes": "Great quality, prints smoothly",
  "productUrl": "https://example.com/product",
  "lastUpdated": 1703520000000,
  "createdAt": 1703520000000,
  "_version": 1
}
```

**Fields**:
- All existing Dexie fields preserved
- `_version`: Schema version for future migrations
- Dates stored as ISO 8601 strings or Unix timestamps

### Directory Structure

**Web App (Server)**:
```
FilamentDB/web-app/
├── data/
│   ├── spools/              # Spool JSON files
│   │   ├── PLA-Prusament-GalaxyBlack-ABC123.json
│   │   └── ...
│   └── .metadata/           # Optional: index cache, search
│       └── index.json
```

**Mobile App (Capacitor)**:
```
App Documents/
└── FilamentDB/
    └── spools/
        ├── PLA-Prusament-GalaxyBlack-ABC123.json
        └── ...
```

---

## 🏗️ Implementation Phases

### Phase 1: Storage Abstraction Layer ✅ **Start Here**

**Goal**: Create unified interface that works on both platforms

**Files to Create**:
1. `src/lib/storage/FileStorage.ts` - Core file operations
2. `src/lib/storage/FileStorageWeb.ts` - Server-side (API-based)
3. `src/lib/storage/FileStorageMobile.ts` - Device-side (FS API)
4. `src/lib/storage/types.ts` - TypeScript interfaces

**Interface**:
```typescript
interface ISpoolStorage {
  // CRUD operations
  getSpool(serial: string): Promise<Spool | null>;
  listSpools(): Promise<Spool[]>;
  saveSpool(spool: Spool): Promise<void>;
  deleteSpool(serial: string): Promise<void>;
  
  // Batch operations
  saveSpools(spools: Spool[]): Promise<void>;
  
  // Search
  searchSpools(query: string): Promise<Spool[]>;
  filterSpools(filters: SpoolFilters): Promise<Spool[]>;
  
  // Sync
  getLastModified(serial: string): Promise<number>;
  exportAll(): Promise<Blob>; // Backup
  importAll(data: Blob): Promise<void>; // Restore
}
```

**Implementation Strategy**:
- Web: Calls `/api/spools/*` endpoints
- Mobile: Uses `@capacitor/filesystem` plugin
- Single interface, platform detection at runtime

**Acceptance Criteria**:
- [ ] Interface defined in TypeScript
- [ ] Web implementation using fetch API
- [ ] Mobile implementation using Capacitor FS
- [ ] Platform detection works correctly
- [ ] All methods have error handling

---

### Phase 2: API Endpoints (Web Only) 🌐

**Goal**: Server-side file management for web app

**Endpoints to Create**:

1. **`GET /api/spools`** - List all spools
   ```typescript
   // Returns array of all spool objects
   Response: Spool[]
   ```

2. **`GET /api/spools/[serial]`** - Get specific spool
   ```typescript
   // Returns single spool or 404
   Response: Spool | { error: string }
   ```

3. **`POST /api/spools`** - Create new spool
   ```typescript
   Body: Spool
   Response: { success: boolean, filename: string }
   ```

4. **`PUT /api/spools/[serial]`** - Update spool
   ```typescript
   Body: Spool
   Response: { success: boolean }
   ```

5. **`DELETE /api/spools/[serial]`** - Delete spool
   ```typescript
   Response: { success: boolean }
   ```

6. **`GET /api/spools/export`** - Export all as ZIP
   ```typescript
   Response: application/zip
   ```

7. **`POST /api/spools/import`** - Import from ZIP
   ```typescript
   Body: multipart/form-data (ZIP file)
   Response: { imported: number, errors: string[] }
   ```

**File Operations**:
```typescript
// Helper functions
function getSpoolFileName(spool: Spool): string {
  // Generate: {type}-{brand}-{color}-{serial}.json
  const sanitize = (str: string) => 
    str.replace(/[/\\:*?"<>|]/g, '')
       .replace(/\s+/g, '');
  
  return `${sanitize(spool.type)}-${sanitize(spool.brand)}-${sanitize(spool.color)}-${spool.serial}.json`;
}

function readSpoolFile(filename: string): Promise<Spool>;
function writeSpoolFile(spool: Spool): Promise<void>;
function deleteSpoolFile(filename: string): Promise<void>;
function listSpoolFiles(): Promise<string[]>;
```

**Acceptance Criteria**:
- [ ] All 7 endpoints implemented
- [ ] File naming works correctly
- [ ] Handles special characters in names
- [ ] Returns proper HTTP status codes
- [ ] Error handling for file I/O
- [ ] Validates spool data before saving

---

### Phase 3: Migration Script 🔄

**Goal**: Convert existing IndexedDB data to JSON files

**Script**: `scripts/migrate-to-files.ts`

**Process**:
1. Read all spools from IndexedDB
2. For each spool:
   - Generate filename
   - Check for conflicts (duplicate filenames)
   - Write JSON file
   - Verify file was created
3. Create backup of old database
4. Generate migration report

**Implementation**:
```typescript
async function migrateToFiles() {
  console.log('Starting migration...');
  
  // 1. Connect to IndexedDB
  const db = await openDatabase();
  const spools = await db.spools.toArray();
  
  console.log(`Found ${spools.length} spools to migrate`);
  
  // 2. For each spool
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };
  
  for (const spool of spools) {
    try {
      // Generate filename
      const filename = getSpoolFileName(spool);
      
      // Check for duplicates
      const existingFile = await fileExists(filename);
      if (existingFile) {
        // Handle collision: append ID
        filename = `${spool.type}-${spool.brand}-${spool.color}-${spool.serial}-${spool.id}.json`;
      }
      
      // Save to file
      await saveSpoolToFile(spool, filename);
      
      results.success++;
      console.log(`✓ Migrated: ${filename}`);
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed ${spool.serial}: ${error.message}`);
      console.error(`✗ Failed: ${spool.serial}`, error);
    }
  }
  
  // 3. Generate report
  console.log('\nMigration complete!');
  console.log(`Success: ${results.success}`);
  console.log(`Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(err => console.log(`  - ${err}`));
  }
  
  // 4. Backup old database
  await backupIndexedDB();
  
  return results;
}
```

**Acceptance Criteria**:
- [ ] Script can be run via `npm run migrate`
- [ ] Creates backup before migration
- [ ] Handles filename collisions
- [ ] Generates detailed report
- [ ] Validates all files after creation
- [ ] Can be run multiple times safely (idempotent)

---

### Phase 4: Update Frontend Code 🎨

**Goal**: Replace IndexedDB calls with FileStorage

**Files to Update**:

1. **`src/app/inventory/page.tsx`**
   ```typescript
   // Before:
   const spools = useLiveQuery(() => db.spools.toArray());
   
   // After:
   const [spools, setSpools] = useState<Spool[]>([]);
   useEffect(() => {
     storage.listSpools().then(setSpools);
   }, []);
   ```

2. **`src/app/inventory/add/page.tsx`**
   ```typescript
   // Before:
   await db.spools.add(newSpool);
   
   // After:
   await storage.saveSpool(newSpool);
   ```

3. **`src/app/inventory/detail/page.tsx`**
   ```typescript
   // Before:
   const spool = useLiveQuery(() => db.spools.get(id));
   
   // After:
   const [spool, setSpool] = useState<Spool | null>(null);
   useEffect(() => {
     storage.getSpool(serial).then(setSpool);
   }, [serial]);
   ```

4. **`src/app/inventory/edit/page.tsx`**
   ```typescript
   // Before:
   await db.spools.update(id, updates);
   
   // After:
   const spool = await storage.getSpool(serial);
   await storage.saveSpool({ ...spool, ...updates });
   ```

**Hooks to Create**:
```typescript
// src/hooks/useSpools.ts
export function useSpools() {
  const [spools, setSpools] = useState<Spool[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    storage.listSpools()
      .then(setSpools)
      .finally(() => setLoading(false));
  }, []);
  
  const refresh = async () => {
    setSpools(await storage.listSpools());
  };
  
  return { spools, loading, refresh };
}

// src/hooks/useSpool.ts
export function useSpool(serial: string) {
  const [spool, setSpool] = useState<Spool | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    storage.getSpool(serial)
      .then(setSpool)
      .finally(() => setLoading(false));
  }, [serial]);
  
  const update = async (updates: Partial<Spool>) => {
    if (!spool) return;
    const updated = { ...spool, ...updates };
    await storage.saveSpool(updated);
    setSpool(updated);
  };
  
  return { spool, loading, update };
}
```

**Acceptance Criteria**:
- [ ] All pages use new storage layer
- [ ] Remove all `useLiveQuery` hooks
- [ ] Remove Dexie imports
- [ ] Create custom hooks for common patterns
- [ ] Update tests to mock FileStorage
- [ ] No regression in functionality

---

### Phase 5: Simplified Sync 🔄

**Goal**: Replace complex delta sync with file-based sync

**New Sync Strategy**:
1. Get list of files from both locations
2. Compare modification times
3. Transfer newer files
4. Handle conflicts (last-write-wins or merge)

**Implementation**:
```typescript
interface SyncResult {
  uploaded: string[];    // Files sent to server
  downloaded: string[];  // Files received from server
  conflicts: string[];   // Files with conflicts
  errors: string[];
}

async function syncSpools(serverUrl: string): Promise<SyncResult> {
  const result: SyncResult = {
    uploaded: [],
    downloaded: [],
    conflicts: [],
    errors: []
  };
  
  // 1. Get local files
  const localFiles = await storage.listSpools();
  const localMap = new Map(localFiles.map(s => [s.serial, s]));
  
  // 2. Get remote files
  const remoteFiles = await fetch(`${serverUrl}/api/spools`).then(r => r.json());
  const remoteMap = new Map(remoteFiles.map(s => [s.serial, s]));
  
  // 3. Find differences
  for (const [serial, localSpool] of localMap) {
    const remoteSpool = remoteMap.get(serial);
    
    if (!remoteSpool) {
      // New local spool - upload
      await uploadSpool(serverUrl, localSpool);
      result.uploaded.push(serial);
    } else {
      // Compare timestamps
      if (localSpool.lastUpdated > remoteSpool.lastUpdated) {
        // Local is newer - upload
        await uploadSpool(serverUrl, localSpool);
        result.uploaded.push(serial);
      } else if (localSpool.lastUpdated < remoteSpool.lastUpdated) {
        // Remote is newer - download
        await storage.saveSpool(remoteSpool);
        result.downloaded.push(serial);
      }
      // If equal, no sync needed
    }
  }
  
  // 4. Download new remote spools
  for (const [serial, remoteSpool] of remoteMap) {
    if (!localMap.has(serial)) {
      await storage.saveSpool(remoteSpool);
      result.downloaded.push(serial);
    }
  }
  
  return result;
}
```

**Acceptance Criteria**:
- [ ] Sync works bidirectionally
- [ ] Uses modification times for comparison
- [ ] Handles new/updated/deleted spools
- [ ] Reports sync results
- [ ] Works offline (queues changes)
- [ ] No data loss on conflicts

---

### Phase 6: Search & Indexing 🔍

**Goal**: Fast search without loading all files

**Options**:

**Option A: In-Memory (Simple)**
- Load all files on startup
- Keep in memory
- Search/filter in JavaScript
- Good for < 1000 spools

**Option B: Index File (Better)**
- Create `data/.metadata/index.json`:
  ```json
  {
    "spools": [
      {
        "serial": "ABC123",
        "filename": "PLA-Prusament-GalaxyBlack-ABC123.json",
        "brand": "Prusament",
        "type": "PLA",
        "color": "Galaxy Black",
        "lastUpdated": 1703520000000
      }
    ],
    "lastIndexed": 1703520000000
  }
  ```
- Update index on each write
- Search using index
- Load full files only when needed

**Option C: SQLite (Advanced)**
- Keep SQLite index separate from JSON files
- Best of both worlds
- Complex but fastest

**Recommendation**: Start with **Option A**, migrate to **Option B** if needed.

**Acceptance Criteria**:
- [ ] Search works across all fields
- [ ] Filter by type, brand, color
- [ ] Sort by date, weight, price
- [ ] Performance acceptable (<100ms for 100 spools)
- [ ] Index updates automatically

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
describe('FileStorage', () => {
  it('generates correct filenames', () => {
    const spool = { type: 'PLA', brand: 'Prusa™', color: 'Galaxy Black', serial: 'ABC' };
    expect(getSpoolFileName(spool)).toBe('PLA-Prusa-GalaxyBlack-ABC.json');
  });
  
  it('handles special characters', () => {
    const spool = { type: 'PETG', brand: 'Bambu/Lab', color: 'Red:Blue', serial: 'XYZ' };
    expect(getSpoolFileName(spool)).toBe('PETG-BambuLab-RedBlue-XYZ.json');
  });
  
  it('saves and retrieves spool', async () => {
    const spool = createTestSpool();
    await storage.saveSpool(spool);
    const retrieved = await storage.getSpool(spool.serial);
    expect(retrieved).toEqual(spool);
  });
});
```

### Integration Tests
- Full CRUD operations
- Migration from IndexedDB
- Sync between devices
- File system errors

### Manual Testing
- Web app CRUD
- Mobile app CRUD
- Sync between web and mobile
- Backup/restore
- Large datasets (100+ spools)

---

## 📊 Migration Checklist

### Pre-Migration
- [ ] Review implementation plan
- [ ] Set up development branch
- [ ] Backup production database
- [ ] Create test dataset

### Implementation
- [ ] Phase 1: Storage abstraction
- [ ] Phase 2: API endpoints
- [ ] Phase 3: Migration script
- [ ] Phase 4: Frontend updates
- [ ] Phase 5: Simplified sync
- [ ] Phase 6: Search/indexing

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing complete
- [ ] Performance acceptable
- [ ] No data loss

### Deployment
- [ ] Update documentation
- [ ] Create migration guide for users
- [ ] Deploy to staging
- [ ] Monitor for issues
- [ ] Deploy to production
- [ ] Announce changes

---

## ⚠️ Risks & Mitigations

### Risk 1: File System Permissions
**Problem**: Server may not have write access to `data/spools/`  
**Mitigation**: 
- Check permissions on startup
- Create directory if needed
- Fail gracefully with clear error message

### Risk 2: Filename Collisions
**Problem**: Two spools with same brand/type/color but different serials  
**Mitigation**: 
- Serial is always unique
- Append ID if collision detected
- Log warnings

### Risk 3: Performance with Many Files
**Problem**: Listing 1000+ files may be slow  
**Mitigation**: 
- Implement index file (Phase 6)
- Lazy loading
- Pagination

### Risk 4: Concurrent Writes
**Problem**: Two processes writing same file  
**Mitigation**: 
- File locking (if supported)
- Atomic writes (write to temp, then rename)
- Last-write-wins for conflicts

### Risk 5: Mobile Storage Limits
**Problem**: Device runs out of space  
**Mitigation**: 
- Check available space before write
- Implement auto-cleanup of old backups
- Warn user when space low

---

## 📚 Documentation Updates Needed

1. **README.md**
   - Update "How it Works" section
   - Mention file-based storage
   - Explain backup/restore

2. **ENV_VARIABLES.md**
   - Add `SPOOLS_DATA_DIR` variable
   - Document file permissions

3. **DOCKER_GUIDE.md**
   - Update volume mapping for `data/spools/`
   - Explain file persistence

4. **New: STORAGE_GUIDE.md**
   - Explain file format
   - How to manually edit files
   - Backup/restore procedures
   - Troubleshooting

---

## 🎯 Success Criteria

- [ ] All spools stored as individual JSON files
- [ ] Filename format: `{type}-{brand}-{color}-{serial}.json`
- [ ] Files are human-readable (pretty-printed JSON)
- [ ] Web app works with server-side files
- [ ] Mobile app works with device files
- [ ] Sync simplified (file-based)
- [ ] Migration from IndexedDB complete
- [ ] No data loss
- [ ] Performance acceptable
- [ ] Documentation updated
- [ ] Tests passing

---

## 📅 Estimated Timeline

- **Phase 1**: 2-3 days (Storage abstraction)
- **Phase 2**: 2-3 days (API endpoints)
- **Phase 3**: 1 day (Migration script)
- **Phase 4**: 3-4 days (Frontend updates)
- **Phase 5**: 2-3 days (Simplified sync)
- **Phase 6**: 1-2 days (Search/indexing)

**Total**: ~12-18 days for complete implementation

---

## 🚀 Next Steps

1. **Review this plan** - Discuss any concerns or changes
2. **Create feature branch** - `feature/file-based-storage`
3. **Start Phase 1** - Implement storage abstraction layer
4. **Iterate** - Test each phase before moving to next

---

**Last Updated**: 2025-12-28  
**Status**: Planning  
**Assignee**: TBD
