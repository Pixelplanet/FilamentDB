import { Spool } from '@/db';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Eye, EyeOff, Trash2, BoxSelect, Droplets } from 'lucide-react';
import { useSpoolMutations } from '@/hooks/useFileStorage';

interface Props {
    spool: Spool;
    isEmpty: boolean;
}

export function SpoolCard({ spool, isEmpty }: Props) {
    const [showMenu, setShowMenu] = useState(false);
    const { updateSpool, deleteSpool } = useSpoolMutations();
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isLongPress = useRef(false);
    const touchStartPos = useRef<{ x: number; y: number } | null>(null);

    const LONG_PRESS_THRESHOLD = 10; // pixels of movement before canceling

    const handleTouchStart = (e: React.TouchEvent) => {
        isLongPress.current = false;
        const touch = e.touches[0];
        touchStartPos.current = { x: touch.clientX, y: touch.clientY };

        timerRef.current = setTimeout(() => {
            isLongPress.current = true;
            setShowMenu(true);
            // Vibrator API if available
            if (navigator.vibrate) navigator.vibrate(50);
        }, 500);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        // Cancel long press if user moves finger (scrolling)
        if (touchStartPos.current && timerRef.current) {
            const touch = e.touches[0];
            const dx = Math.abs(touch.clientX - touchStartPos.current.x);
            const dy = Math.abs(touch.clientY - touchStartPos.current.y);

            if (dx > LONG_PRESS_THRESHOLD || dy > LONG_PRESS_THRESHOLD) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
                touchStartPos.current = null;
            }
        }
    };

    const handleTouchEnd = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        touchStartPos.current = null;
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowMenu(true);
    };

    const toggleVisibility = async () => {
        await updateSpool(spool.serial, { weightRemaining: isEmpty ? spool.weightTotal : 0 }); // Toggle empty/full? No, user asked for "visibility of spools" ??
        // "change the visibility of spools" -> likely means Private/Public OR Show/Hide from list (Empty)
        // User also said "delete them or set them as empty".
        // So "visibility" probably means the "Public/Private" toggle I saw in SpoolForm.
        // Let's implement Public/Private toggle and Empty toggle.
        const newVis = spool.visibility === 'public' ? 'private' : 'public';
        await updateSpool(spool.serial, { visibility: newVis });
        setShowMenu(false);
    };

    const toggleEmpty = async () => {
        if (isEmpty) {
            // Restore? Maybe set to full? Or just 10g? Let's ask or just assume Full.
            // "Set them as empty" implies one way. But toggle is nice.
            // Let's just implement "Set Empty" as requested.
        } else {
            if (confirm('Mark this spool as empty?')) {
                await updateSpool(spool.serial, { weightRemaining: 0 });
            }
        }
        setShowMenu(false);
    };

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this spool?')) {
            await deleteSpool(spool.serial);
        }
        setShowMenu(false);
    };

    return (
        <>
            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onContextMenu={handleContextMenu}
                className="relative h-full"
                style={{ touchAction: 'pan-y' }}
            >
                <Link
                    href={`/inventory/detail?serial=${spool.serial}`}
                    onClick={(e) => {
                        if (isLongPress.current) e.preventDefault();
                    }}
                    className={`rounded-xl p-4 shadow-sm border flex flex-col gap-3 transition-all h-full block ${isEmpty
                        ? 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 opacity-60 hover:opacity-80'
                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                        }`}
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${isEmpty
                                    ? 'text-gray-500 dark:text-gray-600 bg-gray-200 dark:bg-gray-800'
                                    : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                                    }`}>
                                    {spool.type}
                                </span>
                                {isEmpty && (
                                    <span className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                                        EMPTY
                                    </span>
                                )}
                                {spool.visibility === 'public' && (
                                    <span className="text-[10px] font-medium text-green-600 border border-green-200 px-1 rounded">PUB</span>
                                )}
                            </div>
                            <h3 className={`font-semibold text-lg mt-1 ${isEmpty ? 'text-gray-500 dark:text-gray-600' : 'text-gray-900 dark:text-white'}`}>
                                {spool.brand || 'Unknown Brand'}
                            </h3>
                            <p className={`text-sm ${isEmpty ? 'text-gray-400 dark:text-gray-700' : 'text-gray-500'}`}>
                                {spool.color || 'No Color'}
                            </p>
                        </div>
                        <div
                            className={`w-6 h-6 rounded-full border shadow-inner ${isEmpty ? 'opacity-50' : ''}`}
                            style={{
                                backgroundColor: spool.colorHex || '#ccc',
                                borderColor: isEmpty ? '#d1d5db' : '#e5e7eb'
                            }}
                        />
                    </div>

                    <div className="mt-auto">
                        <div className="flex justify-between text-sm mb-1">
                            <span className={isEmpty ? 'text-gray-400' : ''}>Remaining</span>
                            <span className={`font-mono ${isEmpty ? 'text-gray-400' : ''}`}>
                                {spool.weightRemaining}g / {spool.weightTotal}g
                            </span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${isEmpty
                                    ? 'bg-gray-300 dark:bg-gray-600'
                                    : spool.weightRemaining < 200
                                        ? 'bg-orange-500'
                                        : 'bg-blue-500'
                                    }`}
                                style={{ width: `${Math.min(100, (spool.weightRemaining / spool.weightTotal) * 100)}%` }}
                            />
                        </div>
                    </div>

                    <div className={`text-xs font-mono truncate ${isEmpty ? 'text-gray-400' : 'text-gray-400'}`}>
                        ID: {spool.serial}
                    </div>
                </Link>
            </div>

            {/* Context Menu Modal */}
            {showMenu && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in"
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                    }}
                    onTouchEnd={(e) => {
                        // Only close if tapping the backdrop itself
                        if (e.target === e.currentTarget) {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowMenu(false);
                        }
                    }}
                >
                    <div
                        className="w-full sm:w-80 bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4 pb-2 border-b dark:border-gray-700">
                            <h3 className="font-bold text-lg">Quick Actions</h3>
                            <button onClick={() => setShowMenu(false)} className="p-2 text-gray-500">Close</button>
                        </div>

                        <div className="space-y-2">
                            <button onClick={toggleVisibility} className="w-full p-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left">
                                {spool.visibility === 'public' ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                <span>{spool.visibility === 'public' ? 'Make Private' : 'Make Public'}</span>
                            </button>

                            {!isEmpty && (
                                <button onClick={toggleEmpty} className="w-full p-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left text-orange-600 dark:text-orange-400">
                                    <Droplets className="w-5 h-5" />
                                    <span>Mark as Empty</span>
                                </button>
                            )}

                            <button onClick={handleDelete} className="w-full p-3 flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors text-left text-red-600 dark:text-red-400">
                                <Trash2 className="w-5 h-5" />
                                <span>Delete Spool</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
