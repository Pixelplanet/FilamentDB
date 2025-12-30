import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tag-history/[serial]
 * Returns complete history and statistics for a specific NFC tag
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ serial: string }> }
) {
    try {
        const { serial: tagSerial } = await params;

        if (!tagSerial) {
            return NextResponse.json(
                { error: 'Tag serial is required' },
                { status: 400 }
            );
        }

        const storage = getStorage();
        const spools = await storage.listSpools();

        // Find all spools associated with this tag (current or historical)
        const associatedSpools = spools.filter(spool => {
            // Current association
            if (spool.nfcTagSerial === tagSerial) return true;

            // Historical association
            if (spool.nfcTagHistory && spool.nfcTagHistory.some(h => h.tagSerial === tagSerial)) {
                return true;
            }

            return false;
        });

        // Build timeline from all history entries
        const timeline: Array<{
            timestamp: number;
            action: string;
            spool: {
                serial: string;
                brand: string;
                type: string;
                color: string;
                colorHex?: string;
                weightRemaining: number;
            };
            tagSerial: string;
        }> = [];

        associatedSpools.forEach(spool => {
            if (spool.nfcTagHistory) {
                spool.nfcTagHistory.forEach(entry => {
                    if (entry.tagSerial === tagSerial) {
                        timeline.push({
                            timestamp: entry.timestamp,
                            action: entry.action,
                            spool: {
                                serial: spool.serial,
                                brand: spool.brand,
                                type: spool.type,
                                color: spool.color,
                                colorHex: spool.colorHex,
                                weightRemaining: spool.weightRemaining
                            },
                            tagSerial: entry.tagSerial
                        });
                    }
                });
            }
        });

        // Sort by timestamp desc (newest first)
        timeline.sort((a, b) => b.timestamp - a.timestamp);

        // Calculate stats
        const currentSpool = spools.find(s => s.nfcTagSerial === tagSerial);
        const totalAssignments = timeline.filter(t => t.action === 'assigned').length;
        const totalRemovals = timeline.filter(t => t.action === 'removed').length;
        const totalReassignments = timeline.filter(t => t.action === 'reassigned').length;
        const uniqueSpools = new Set(timeline.map(t => t.spool.serial)).size;

        const result = {
            tagSerial,
            timeline,
            currentSpool: currentSpool ? {
                serial: currentSpool.serial,
                brand: currentSpool.brand,
                type: currentSpool.type,
                color: currentSpool.color,
                colorHex: currentSpool.colorHex,
                weightRemaining: currentSpool.weightRemaining,
                weightTotal: currentSpool.weightTotal
            } : null,
            associatedSpools: associatedSpools.map(s => ({
                serial: s.serial,
                brand: s.brand,
                type: s.type,
                color: s.color,
                colorHex: s.colorHex,
                weightRemaining: s.weightRemaining
            })),
            stats: {
                totalAssignments,
                totalRemovals,
                totalReassignments,
                uniqueSpools,
                inUse: !!currentSpool && currentSpool.weightRemaining > 0
            }
        };

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error fetching tag history:', error);
        return NextResponse.json(
            { error: 'Failed to fetch tag history', details: error.message },
            { status: 500 }
        );
    }
}
