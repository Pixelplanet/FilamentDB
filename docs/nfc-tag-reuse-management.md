# NFC Tag Reuse & Conflict Management

## Overview
Since NFC tags are reusable, FilamentDB now intelligently handles tag conflicts when the same tag is scanned for different spools. The system ensures that only one "active" (non-empty) spool is associated with each tag at any given time.

## How It Works

### Tag Conflict Detection

When you scan an NFC tag that's already associated with an existing spool:

1. **System Check**: The app searches all spools to find if the tag serial is already in use
2. **Conflict Criteria**: A conflict exists if:
   - The tag serial matches another spool
   - That spool is **not empty** (weightRemaining > 0)
   - It's a different spool (different serial number)

### User Prompt

If a conflict is detected, you'll see a confirmation dialog:

```
⚠️ Tag Already in Use!

This NFC tag is currently associated with:
• Prusament PLA
• Color: Galaxy Black
• Remaining: 850g

Do you want to:
1. Mark the old spool as EMPTY (0g remaining)
2. Reuse this tag for the new spool?

Click OK to proceed, or Cancel to abort.
```

### Your Options

**Option 1: Confirm (OK)**
- The old spool is marked as empty (weightRemaining set to 0)
- The old spool appears grayed out in inventory
- The new spool is created with the tag serial
- You can now use the tag for the new filament

**Option 2: Cancel**
- The scan is aborted
- The old spool remains unchanged
- No new spool is created
- You can remove the old tag and use a different one

## Visual Indicators

### Empty Spools in Inventory
Empty spools (weightRemaining ≤ 0) are automatically styled differently:

- **Grayed out** with reduced opacity (60%)
- **"EMPTY" badge** in red
- **Muted colors** for text and badges
- **Gray progress bar** instead of blue/orange
- Still clickable to view details

### Show/Hide Empty Spools
- Toggle button in the toolbar to hide/show empty spools
- Shows count of hidden spools when filter is active
- Helps keep inventory clean and focused on active materials

## Workflow Example

### Scenario: Reusing a Tag

1. **Finish a Spool**: Your Prusament PLA is depleted
2. **Get New Filament**: You receive a new spool of different filament
3. **Remove Old Tag**: Peel the NFC tag from the empty spool
4. **Attach to New Spool**: Place the tag on the new spool
5. **Scan Tag**: Open FilamentDB and scan the tag
6. **Conflict Detected**: System shows the old spool details
7. **Confirm**: Click OK to mark old spool empty and reuse tag
8. **Fill Details**: Enter new spool information
9. **Save**: New spool is saved with the reused tag serial

### Result
- Old spool: Marked empty, appears grayed out in inventory
- New spool: Active, associated with the same tag serial
- Tag serial: Now linked to the new spool

## Technical Details

### Conflict Detection Logic
```typescript
const spoolWithSameTag = allSpools.find(s => 
    s.nfcTagSerial === serial &&  // Same tag
    s.serial !== serial &&         // Different spool
    s.weightRemaining > 0          // Not empty
);
```

### Marking Spool as Empty
When user confirms tag reuse:
```typescript
await storage.saveSpool({
    ...spoolWithSameTag,
    weightRemaining: 0,
    lastUpdated: Date.now()
});
```

## Best Practices

### ✅ Good Practices
- **Mark spools as empty** when you finish them
- **Reuse tags** to save money and reduce waste
- **Use unique tags** for different filament types when possible
- **Check inventory** before reusing tags to verify old spool is actually empty

### ⚠️ Things to Avoid
- **Don't reuse tags** while the old spool still has material
- **Don't ignore the warning** - it's there to prevent data loss
- **Don't manually delete** old spools - just mark them empty instead

## FAQ

**Q: Can I have multiple spools with the same tag serial?**
A: Yes! You can have multiple spools associated with the same tag serial, but only one should be non-empty (active) at a time.

**Q: What happens to the old spool data?**
A: It's preserved! The old spool remains in your database, just marked as empty. You can still view its history.

**Q: Can I undo marking a spool as empty?**
A: Yes! Just navigate to the spool detail page and edit its weight to restore it.

**Q: What if I cancel the tag reuse?**
A: Nothing happens. The scan is aborted, and you can try again with a different tag or manually edit the spool.

**Q: Can I search for spools by tag serial?**
A: Currently, tag serials are displayed but not searchable. This feature may be added in the future.

## Related Features

- **Empty Spool Filter**: Toggle visibility of empty spools in inventory
- **Tag Serial Tracking**: View which physical tag is associated with each spool
- **Visual Indicators**: Clear styling to distinguish empty from active spools

## Future Enhancements

Potential improvements:
- Automatic tag reuse suggestions
- Tag usage history and statistics
- Bulk tag management tools
- Warning when scanning same tag as current spool
