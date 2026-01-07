import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';

/**
 * GET /api/tag-stats
 * Returns aggregate statistics about NFC tag usage
 */
export async function GET(request: NextRequest) {
    try {
        const storage = getStorage();
        const spools = await storage.listSpools();

        // Build map of all tags and their stats
        const tagMap = new Map<string, {
            serial: string;
            currentSpool?: any;
            totalAssignments: number;
            totalRemovals: number;
            inUse: boolean;
            spoolCount: number;
            lastUsed: number;
        }>();

        spools.forEach(spool => {
            // Current tag
            if (spool.nfcTagSerial) {
                if (!tagMap.has(spool.nfcTagSerial)) {
                    tagMap.set(spool.nfcTagSerial, {
                        serial: spool.nfcTagSerial,
                        totalAssignments: 0,
                        totalRemovals: 0,
                        inUse: false,
                        spoolCount: 0,
                        lastUsed: 0
                    });
                }

                const tag = tagMap.get(spool.nfcTagSerial)!;
                if (spool.weightRemaining > 0) {
                    tag.inUse = true;
                    tag.currentSpool = {
                        serial: spool.serial,
                        brand: spool.brand,
                        type: spool.type,
                        color: spool.color,
                        weightRemaining: spool.weightRemaining
                    };
                }
                tag.spoolCount++;
            }

            // Historical tags
            if (spool.nfcTagHistory) {
                spool.nfcTagHistory.forEach(entry => {
                    if (!tagMap.has(entry.tagSerial)) {
                        tagMap.set(entry.tagSerial, {
                            serial: entry.tagSerial,
                            totalAssignments: 0,
                            totalRemovals: 0,
                            inUse: false,
                            spoolCount: 0,
                            lastUsed: 0
                        });
                    }

                    const tag = tagMap.get(entry.tagSerial)!;

                    if (entry.action === 'assigned' || entry.action === 'reassigned') {
                        tag.totalAssignments++;
                    } else if (entry.action === 'removed') {
                        tag.totalRemovals++;
                    }

                    if (entry.timestamp > tag.lastUsed) {
                        tag.lastUsed = entry.timestamp;
                    }

                    tag.spoolCount++;
                });
            }
        });

        const allTags = Array.from(tagMap.values());
        const activeTags = allTags.filter(t => t.inUse).length;
        const totalAssignments = allTags.reduce((sum, t) => sum + t.totalAssignments, 0);
        const totalRemovals = allTags.reduce((sum, t) => sum + t.totalRemovals, 0);
        const averageReuses = allTags.length > 0 ? totalAssignments / allTags.length : 0;

        // Find most reused tag
        const mostReused = allTags.reduce((max, tag) =>
            tag.totalAssignments > (max?.totalAssignments || 0) ? tag : max
            , allTags[0]);

        // Recently used tags
        const recentlyUsed = [...allTags]
            .filter(t => t.lastUsed > 0)
            .sort((a, b) => b.lastUsed - a.lastUsed)
            .slice(0, 10);

        const stats = {
            summary: {
                totalTags: allTags.length,
                activeTags,
                availableTags: allTags.length - activeTags,
                totalAssignments,
                totalRemovals,
                averageReuses: Number(averageReuses.toFixed(2))
            },
            mostReusedTag: mostReused,
            recentlyUsedTags: recentlyUsed,
            allTags: allTags.sort((a, b) => b.totalAssignments - a.totalAssignments)
        };

        return NextResponse.json(stats);
    } catch (error: any) {
        console.error('Error fetching tag stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch tag statistics', details: error.message },
            { status: 500 }
        );
    }
}
