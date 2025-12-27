# FilamentDB Sync Feature - Implementation Plan

## 🎯 Objective
Implement a robust synchronization system that allows users to sync their filament inventory across multiple devices using a self-hosted or cloud server.

## 📐 Architecture Overview

### Client-Side (Browser/App)
- **Local Database**: Dexie.js (IndexedDB) - primary data storage
- **Sync Manager**: Handles sync logic, conflict resolution, and API communication
- **Sync UI**: Settings page controls for manual/auto sync

### Server-Side
- **Sync API**: Next.js API routes for handling sync requests
- **Data Storage**: JSON file-based storage (simple, portable)
- **Conflict Resolution**: Last-Write-Wins (LWW) strategy

## 🔄 Sync Strategy: Delta Sync with Timestamps

### Why Delta Sync?
- **Efficiency**: Only send changed data, not entire inventory
- **Bandwidth**: Reduces data transfer significantly
- **Speed**: Faster sync times, better UX

### How It Works:
1. Each spool has a `lastUpdated` timestamp (when last modified)
2. Client tracks `lastSyncTime` (when last sync completed)
3. On sync:
   - Client sends only spools modified since `lastSyncTime`
   - Server sends only spools modified since client's `lastSyncTime`
   - Merge changes with conflict resolution

## 📊 Database Schema Changes

### Add New Fields to Spool Interface:
```typescript
interface Spool {
  // ... existing fields
  lastUpdated: number;      // Timestamp of last modification
  syncVersion?: number;     // Optional: version number for conflict detection
  deleted?: boolean;        // Soft delete flag for sync
}
```

### Migration Strategy:
- Version 3 schema: Add `lastUpdated` field
- Populate existing spools with current timestamp
- Non-breaking: App works without sync

## 🛠️ Implementation Steps

### Step 1: Database Schema Update
- [ ] Update Dexie schema to version 3
- [ ] Add `lastUpdated` field to Spool interface
- [ ] Create migration to populate existing data
- [ ] Create helper functions that auto-update `lastUpdated`

### Step 2: Client-Side Sync Logic
- [ ] Create `SyncManager` class/module
- [ ] Implement delta sync algorithm
- [ ] Add conflict detection and resolution
- [ ] Store last sync timestamp in localStorage
- [ ] Add sync status indicators (syncing, success, error)

### Step 3: Server-Side Sync API
- [ ] Create `/api/sync` POST endpoint
- [ ] Implement file-based data storage
- [ ] Handle incoming client changes
- [ ] Return server changes to client
- [ ] Add basic authentication (API key)

### Step 4: Conflict Resolution
- [ ] Implement Last-Write-Wins (LWW) strategy
- [ ] Compare `lastUpdated` timestamps
- [ ] Merge non-conflicting fields intelligently
- [ ] Log conflicts for debugging

### Step 5: UI Updates
- [ ] Update Settings page with sync controls
- [ ] Add sync status indicator
- [ ] Show last sync time
- [ ] Display sync errors clearly
- [ ] Add manual sync button

### Step 6: Testing
- [ ] Unit tests for sync logic
- [ ] Integration tests with mock server
- [ ] Test conflict scenarios
- [ ] Test with multiple devices

## 🔐 Security Considerations

### Authentication:
- Simple API key authentication for self-hosted
- Optional: JWT tokens for cloud deployment
- Environment variable for API key

### Data Privacy:
- All data stored on user's server (self-hosted option)
- No third-party services required
- Encrypted transport (HTTPS in production)

## 📝 API Specification

### POST /api/sync
**Request:**
```json
{
  "apiKey": "user-secret-key",
  "deviceId": "unique-device-id",
  "lastSyncTime": 1703692800000,
  "changes": [
    {
      "id": 1,
      "serial": "ABC-123",
      "brand": "Prusament",
      "lastUpdated": 1703693000000,
      // ... other fields
    }
  ],
  "deletions": [2, 3]  // IDs of deleted spools
}
```

**Response:**
```json
{
  "success": true,
  "serverTime": 1703693500000,
  "changes": [
    // Spools modified on server since lastSyncTime
  ],
  "deletions": [],  // IDs deleted on server
  "conflicts": [
    // Conflicts detected and resolved
  ],
  "stats": {
    "totalSpools": 25,
    "synced": 3,
    "conflictsResolved": 1
  }
}
```

## 🎨 User Experience Flow

### Manual Sync:
1. User clicks "Sync Now" in Settings
2. UI shows "Syncing..." spinner
3. Progress: "Uploading 3 changes..."
4. Progress: "Downloading 2 updates..."
5. Success: "Synced successfully at 2:15 PM"

### Auto Sync (Future):
- Trigger on app startup
- Trigger after major changes
- Background sync every N minutes

## 🚀 Deployment Options

### Option 1: Self-Hosted (Recommended)
- Deploy Next.js app with sync API
- Use Docker compose
- Data stored in `/data/sync.json`
- User controls their data

### Option 2: Cloud (Optional)
- Deploy to Vercel/Netlify
- Use cloud storage (S3, Firebase)
- Per-user authentication required

## 📋 Configuration

### Environment Variables:
```env
# Server
SYNC_API_KEY=your-secret-key-here
SYNC_DATA_DIR=/app/data

# Client
NEXT_PUBLIC_SYNC_URL=https://your-server.com
NEXT_PUBLIC_ENABLE_SYNC=true
```

### Settings UI:
- Server URL input
- API key input (secure)
- Enable/disable sync toggle
- Manual sync button
- Sync frequency selector (future)

## ⚠️ Edge Cases to Handle

1. **Simultaneous Edits**: Same spool edited on 2 devices at once
   - Solution: Last-Write-Wins based on timestamp
   
2. **Clock Skew**: Devices with incorrect time
   - Solution: Use server time as authority
   
3. **Network Failures**: Sync interrupted mid-way
   - Solution: Atomic operations, rollback on error
   
4. **Large Inventories**: 1000+ spools
   - Solution: Paginated sync, batch processing
   
5. **Deleted Items**: Track deletions for sync
   - Solution: Soft delete with `deleted: true` flag

## 🎯 Success Criteria

- [ ] Users can sync inventory across 2+ devices
- [ ] Sync completes in <5 seconds for typical inventory
- [ ] No data loss in conflict scenarios
- [ ] Clear error messages for failures
- [ ] Works offline (queue sync for later)

## 📈 Future Enhancements

### Phase 2 (Future):
- Real-time sync with WebSockets
- Collaborative features (shared inventories)
- Sync history/audit log
- Conflict review UI (manual resolution)
- Backup/restore functionality

### Phase 3 (Future):
- End-to-end encryption
- Multi-user support
- Role-based access control
- API for third-party integrations

## 🛠️ Implementation Timeline

**Total Estimate**: 3-4 hours

1. **Database Schema** (30 min)
2. **Client Sync Logic** (1 hour)
3. **Server API** (1 hour)
4. **UI Updates** (45 min)
5. **Testing** (45 min)

## 📚 Reference Documents

- See `IMPLEMENTATION_GUIDE.md` - Task 2.1 & 2.2
- See `RELEASE_GUIDE.md` - Critical files section
- Dexie versioning: https://dexie.org/docs/Tutorial/Design#database-versioning

---

**Ready to implement!** 🚀
