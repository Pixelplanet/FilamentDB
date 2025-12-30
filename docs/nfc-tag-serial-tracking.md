# NFC Tag Serial Number Tracking

## Overview
FilamentDB now automatically captures and stores the NFC tag's hardware serial number when reading from or writing to NFC tags. This enables unique identification of physical spools even when batch numbers are unavailable.

## How It Works

### When Scanning a Tag (Read)
1. **New Spool**: When scanning a new NFC tag, the tag's serial number is automatically stored in the `nfcTagSerial` field of the spool record
2. **Existing Spool**: When re-scanning an existing spool that doesn't have a tag serial, the system updates the record to include it

### When Writing to a Tag
After successfully writing spool data to an NFC tag, the system captures the tag's serial number and stores it in the spool record, creating a permanent link between the physical tag and the database entry.

## Benefits

1. **Hardware-Based Identification**: The NFC tag serial is a unique hardware identifier that can't be changed or duplicated
2. **Verification**: You can verify that you're scanning the correct tag by comparing the tag serial
3. **No Batch Number Required**: Even if a filament doesn't have a batch number, you can still uniquely identify specific spools
4. **Audit Trail**: Know exactly which physical tag is associated with each database record

## Data Structure

The `Spool` interface includes a new optional field:

```typescript
interface Spool {
  // ... other fields
  nfcTagSerial?: string;   // NFC Tag hardware serial number
  batchNumber?: string;
  // ... other fields
}
```

## UI Display

The NFC tag serial number is displayed:
- In the **Spool Detail page** under the "Identification" section
- Only shown when the spool has been associated with an NFC tag

## Technical Details

- The serial number is captured from the `serialNumber` field of NFC read events
- Format: Typically displayed as hexadecimal bytes separated by colons (e.g., `04:5a:b2:c3:d4:e5:f6`)
- Storage: Automatically saved when:
  - Creating a new spool from an NFC scan
  - Re-scanning an existing spool (if not already set)
  - Writing spool data to a tag

## Implementation Files

- `src/db/index.ts` - Added `nfcTagSerial` field to Spool interface
- `src/app/scan/page.tsx` - Captures tag serial during NFC reads
- `src/app/inventory/detail/page.tsx` - Captures tag serial during NFC writes and displays it
- `src/hooks/useNFC.ts` - Provides tag serial in reading results

## Future Enhancements

Potential future features:
- Search by NFC tag serial
- Detect if the same tag is reused for different spools
- Tag history tracking
- Bulk tag verification
