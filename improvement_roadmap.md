# FilamentDB: Improvement Roadmap & Technical Audit

This document summarizes the current technical state of FilamentDB and provides a prioritized roadmap for improvements. Use this as a coordination point for agents working on specific project components.

## 🏗️ Architectural Overview
- **Core Framework**: Next.js 15+ (App Router)
- **Hybrid Platform**: Capacitor 8 (targeting Android)
- **Persistence**: Dexie.js (IndexedDB) for local-first storage.
- **Hardware Interaction**: `@capgo/capacitor-nfc` for native NFC tags; Web NDEF for browser support.
- **Design**: Tailwind CSS 4, Lucide icons.

---

## 🔍 Audit Findings

### 📶 NFC Implementation (`useNFC.ts`)
> [!WARNING]
> **Memory Leak Risk**: The current hook registers native listeners (`ndefDiscovered`, `tagDiscovered`) but does not explicitly remove them in a cleanup function when the component unmounts or when the scan ends. This can lead to multiple listeners firing simultaneously over time.

### 🔄 Data Synchronization (`SyncManager.tsx`)
> [!IMPORTANT]
> **Efficiency**: The sync logic uses a "full dump / full pull" approach triggered by change counters.
> **Conflict Resolution**: There is no current logic for conflict resolution (e.g., last-write-wins or semantic merging).

### 🧪 Quality Assurance
> [!CAUTION]
> **No Application Tests**: There are no unit, integration, or E2E tests for the application logic. This makes refactoring high-risk.

---

## 🔍 Functional Audit (Dynamic Verification)
*Executed via Browser Agent in Docker environment.*

### ✅ Confirmed Working
- **Core Navigation**: Dashboard, Inventory, and Settings flows are stable.
- **Edit Flow**: Updating spool metadata (e.g., weights) correctly persists to the database.
- **URL Import**: Successfully extracts Brand, Material, and Color from Prusa product URLs.

### ⚠️ Identified UI/UX Issues
- **React State Sync**: Programmatic updates (via scripts) occasionally fail to trigger state updates in forms. This suggests a need for more robust input change handlers.
- **Metadata Visibility**: Manually added or imported spools sometimes fail to display their **Brand** or **Color** in the Inventory list cards or the Detail page header.
- **Feedback Loops**: The "URL Analyze" process would benefit from a visual loading state on the button itself.

## 🗺️ Improvement Roadmap

### Phase 1: Stability & Safety (High Priority)
1. **Testing Infrastructure**:
   - Install and configure **Vitest** for unit tests.
   - Setup **Playwright** for E2E testing of the scan/inventory flow.
2. **NFC Hook Refactor**: 
   - Implement `useEffect` cleanup to remove listeners.
   - Add robust error handling for "NFC Disabled" or "Permission Denied" states.

### Phase 2: Performance & Synchronization
1. **Delta Syncing**: Update `SyncManager` to send only modified records based on a `lastUpdated` timestamp.
2. **Conflict Resolution**: Implement a basic reconciliation strategy (Server-wins or Client-wins).

### Phase 3: UI/UX & Aesthetics
1. **Design System**: Standardize color palettes and spacing in `globals.css`.
2. **Micro-animations**: Integrate Framer Motion for smooth page transitions and inventory item hover effects.
3. **PWA Optimization**: Ensure manifest and icons are correctly configured for standalone mobile use.

---

## 🤖 Instructions for Agents
- **Testing Agent**: Focus on Phase 1.1. Create mock Dexie environments for testing.
- **Hardware/Mobile Agent**: Tackle Phase 1.2. Ensure the NFC flow is crash-proof on native Android.
- **Backend/Integrator Agent**: Optimize Phase 2.1 and 2.2.
