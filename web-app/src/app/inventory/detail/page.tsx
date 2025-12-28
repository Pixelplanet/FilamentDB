'use client';

import { useNFC } from '@/hooks/useNFC';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Thermometer, Ruler, Scale, Calendar, Hash, Tag, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { useSpool } from '@/hooks/useFileStorage';

export default function SpoolDetailPage() {
    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-20">
            <Suspense fallback={<div className="p-8 text-center flex items-center justify-center gap-2"><div className="animate-spin w-4 h-4 border-2 border-primary rounded-full border-t-transparent" />Loading...</div>}>
                <SpoolDetailContent />
            </Suspense>
        </div>
    );
}

function SpoolDetailContent() {
    const searchParams = useSearchParams();
    const serial = searchParams.get('serial');

    const { spool, loading } = useSpool(serial);

    // NFC Hook
    const { write, scan, reading: nfcReading, state: nfcState, error: nfcError } = useNFC();

    const router = useRouter();

    // Write Workflow State
    const [writeStage, setWriteStage] = useState<'idle' | 'checking' | 'confirming' | 'writing'>('idle');
    const [scannedData, setScannedData] = useState<any>(null);

    // Effect for capturing scan result
    const [hasScanned, setHasScanned] = useState(false);
    useEffect(() => {
        if (writeStage === 'checking' && nfcState === 'success' && nfcReading && !hasScanned) {
            console.log("Read existing tag data:", nfcReading);
            setScannedData(nfcReading);
            setHasScanned(true);
            setWriteStage('confirming');
        }
    }, [writeStage, nfcState, nfcReading, hasScanned]);

    const handleWriteStart = async () => {
        setWriteStage('checking');
        setHasScanned(false);
        try {
            await scan(); // Start scanning to READ first
        } catch (e) {
            console.error("Scan failed", e);
            setWriteStage('idle');
        }
    };

    const handleConfirmWrite = async () => {
        if (!spool) return;
        setWriteStage('writing');
        try {
            // Create OpenPrintTag Data
            const tagData = {
                "0": "1.0", // version
                "1": spool.brand, // brand
                "2": spool.type, // type
                "3": spool.diameter, // diameter
                "4": spool.temperatureNozzleMin, // min temp
                "5": spool.temperatureNozzleMax, // max temp
                "6": spool.color, // color
                "7": spool.weightSpool, // weight
                "8": spool.serial || "", // serial
            };

            await write(tagData);
            alert("Write Successful!");
            setWriteStage('idle');
        } catch (e) {
            console.error("Write failed", e);
            alert("Write Failed: " + String(e));
            setWriteStage('idle');
        }
    };

    const handleCancelWrite = () => {
        setWriteStage('idle');
    };

    if (!serial) return <div className="p-8 text-center text-red-500">Invalid Spool Serial.</div>;
    if (loading || !spool) return <div className="p-8 text-center flex items-center justify-center gap-2"><div className="animate-spin w-4 h-4 border-2 border-primary rounded-full border-t-transparent" />Loading...</div>;

    // Helpers
    const percent = Math.min(100, (spool.weightRemaining / spool.weightTotal) * 100);

    return (
        <>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/inventory" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">{spool.brand || 'Unknown Brand'} {spool.type}</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <div
                                className="w-3 h-3 rounded-full border border-gray-300"
                                style={{ backgroundColor: spool.colorHex || '#ccc' }}
                            />
                            {spool.color || 'No Color'}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleWriteStart}
                        disabled={writeStage !== 'idle'}
                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full disabled:opacity-50"
                        title="Write to NFC Tag"
                    >
                        <Tag className="w-5 h-5" />
                    </button>
                    <Link
                        href={`/inventory/edit?serial=${serial}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full"
                    >
                        <Edit2 className="w-5 h-5" />
                    </Link>
                </div>
            </div>

            {/* Write Stage Feedback */}
            {writeStage !== 'idle' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                    <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">NFC Write Mode</h3>
                    {writeStage === 'checking' && <p>Scanning tag to check existing data... Hold tag near device.</p>}
                    {writeStage === 'confirming' && (
                        <div>
                            <p className="mb-2">Tag Scanned. Existing Data:</p>
                            <pre className="bg-gray-100 dark:bg-black p-2 rounded text-xs overflow-auto max-h-32 mb-4">
                                {scannedData ? JSON.stringify(scannedData, null, 2) : 'Empty / Unknown Format'}
                            </pre>
                            <div className="flex gap-4">
                                <button
                                    onClick={handleConfirmWrite}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
                                >
                                    Overwrite & Write New
                                </button>
                                <button
                                    onClick={handleCancelWrite}
                                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                    {writeStage === 'writing' && <p>Writing data to tag... Do not move.</p>}
                </div>
            )}

            {/* Vitals Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-400 font-semibold">
                    <Scale className="w-5 h-5" />
                    <span>Material Remaining</span>
                </div>

                <div className="flex items-end justify-between mb-2">
                    <span className="text-4xl font-bold">{spool.weightRemaining}g</span>
                    <span className="text-gray-500 mb-1">of {spool.weightTotal}g total</span>
                </div>

                <div className="w-full h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${percent < 20 ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${percent}%` }}
                    />
                </div>
                <p className="text-xs text-gray-400 mt-2 text-right">Spool Tare: {spool.weightSpool || 'Unknown'}g</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Print Params */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-4 text-orange-600 dark:text-orange-400 font-semibold">
                        <Thermometer className="w-5 h-5" />
                        <span>Temperatures</span>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-300">Nozzle</span>
                            <span className="font-mono font-medium">
                                {spool.temperatureNozzleMin || '?'} - {spool.temperatureNozzleMax || '?'}°C
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-300">Bed</span>
                            <span className="font-mono font-medium">
                                {spool.temperatureBedMin || '?'} - {spool.temperatureBedMax || '?'}°C
                            </span>
                        </div>
                    </div>
                </div>

                {/* Physical Props */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-4 text-purple-600 dark:text-purple-400 font-semibold">
                        <Ruler className="w-5 h-5" />
                        <span>Properties</span>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-300">Diameter</span>
                            <span className="font-mono font-medium">{spool.diameter} mm</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-300">Density</span>
                            <span className="font-mono font-medium">{spool.density || '1.24'} g/cm³</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Traceability */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4 text-gray-600 dark:text-gray-400 font-semibold">
                    <Tag className="w-5 h-5" />
                    <span>Identification</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                        <label className="block text-gray-500 text-xs uppercase tracking-wide mb-1">Serial Number</label>
                        <div className="font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-100 dark:border-gray-700 break-all">
                            {spool.serial}
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-500 text-xs uppercase tracking-wide mb-1">Batch Number</label>
                        <div className="font-mono flex items-center gap-2">
                            <Hash className="w-3 h-3 text-gray-400" />
                            {spool.batchNumber || 'N/A'}
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-500 text-xs uppercase tracking-wide mb-1">Production Date</label>
                        <div className="font-mono flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {spool.productionDate || 'Unknown'}
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-500 text-xs uppercase tracking-wide mb-1">Last Scanned</label>
                        <div className="font-mono">
                            {spool.lastScanned ? new Date(spool.lastScanned).toLocaleDateString() : 'Never'}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
