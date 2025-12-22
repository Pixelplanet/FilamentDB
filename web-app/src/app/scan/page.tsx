'use client';

import { useState, useEffect } from 'react';
import { useNFC } from '@/hooks/useNFC';
import { Scanner } from '@yudiel/react-qr-scanner';
import { db, Spool } from '@/db';
import { Check, Loader2, AlertTriangle, RefreshCw, Camera as CameraIcon } from 'lucide-react';
import { useRef } from 'react';
import { Camera } from '@capacitor/camera';

type Mode = 'nfc' | 'qr';

export default function ScanPage() {
    const [mode, setMode] = useState<Mode>('nfc');
    const { scan, state: nfcState, reading: nfcReading, error: nfcError } = useNFC();
    const [qrResult, setQrResult] = useState<string | null>(null);

    // DB Interaction State
    const [saving, setSaving] = useState(false);
    const [savedSpool, setSavedSpool] = useState<Spool | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const isProcessing = useRef(false);

    // Effect: Handle NFC Reading Success
    useEffect(() => {
        if (nfcState === 'success' && nfcReading) {
            handleScanData(nfcReading.serialNumber, nfcReading.records);
        }
    }, [nfcState, nfcReading]);

    // Effect: Handle QR Reading Success
    useEffect(() => {
        if (qrResult) {
            // Mocking structure for QR - usually QR contains a JSON or URL with ID
            // For now, treat the string as the ID
            handleScanData(qrResult, []);
        }
    }, [qrResult]);

    async function handleScanData(serial: string, records: any[]) {
        if (!serial || isProcessing.current) return;

        isProcessing.current = true;
        setSaving(true);
        setScanError(null);

        try {
            console.log("Handle Scan:", serial);
            // Check if exists
            const existing = await db.spools.where('serial').equals(serial).first();

            if (existing) {
                setSavedSpool(existing);
            } else {
                // Create New Spool
                let spoolData: Partial<Spool> = {
                    serial,
                    brand: 'Unknown Brand',
                    type: 'PLA',
                    color: 'Unknown Color',
                    diameter: 1.75,
                    weightRemaining: 1000,
                    weightTotal: 1000,
                    lastScanned: Date.now()
                };

                // Parse records for OpenPrintTag JSON/CBOR
                const optRecord = records.find(r => r.mediaType === 'application/vnd.openprinttag');
                if (optRecord && optRecord.data) {
                    const d = optRecord.data;
                    if (d.brand) spoolData.brand = d.brand;
                    if (d.type) spoolData.type = d.type;
                    if (d.color) spoolData.color = d.color;
                    if (d.weight) spoolData.weightRemaining = d.weight;
                }

                const id = await db.spools.add(spoolData as Spool);
                setSavedSpool({ ...spoolData, id } as Spool);
            }
        } catch (e: any) {
            console.error("DB Error", e);
            setScanError(e.message || "Failed to save spool to database.");
        } finally {
            setSaving(false);
            // DO NOT release isProcessing immediately, wait a bit or until reset
            setTimeout(() => { isProcessing.current = false; }, 2000);
        }
    }

    const reset = () => {
        setQrResult(null);
        setSavedSpool(null);
        setScanError(null);
        isProcessing.current = false;
    };

    if (savedSpool) {
        return (
            <div className="flex flex-col items-center justify-center p-8 max-w-md mx-auto min-h-[50vh]">
                <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full mb-4">
                    <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-bold mb-2">Spool Identified!</h2>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 w-full mb-6">
                    <div className="grid grid-cols-2 gap-y-4">
                        <div className="text-sm text-gray-500">Brand</div>
                        <div className="font-semibold text-right">{savedSpool.brand}</div>

                        <div className="text-sm text-gray-500">Material</div>
                        <div className="font-semibold text-right">{savedSpool.type}</div>

                        <div className="text-sm text-gray-500">Color</div>
                        <div className="font-semibold text-right">{savedSpool.color}</div>

                        <div className="text-sm text-gray-500">Weight</div>
                        <div className="font-semibold text-right">{savedSpool.weightRemaining}g</div>
                    </div>
                </div>

                <button
                    onClick={reset}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                    Scan Another
                </button>
            </div>
        );
    }

    const [isSecure, setIsSecure] = useState(true);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        // Capture console logs for mobile debugging
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        const addLog = (type: string, args: any[]) => {
            const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
            setLogs(prev => [`[${type}] ${msg}`, ...prev].slice(0, 50));
        };

        console.log = (...args) => { addLog('LOG', args); originalLog(...args); };
        console.error = (...args) => { addLog('ERR', args); originalError(...args); };
        console.warn = (...args) => { addLog('WRN', args); originalWarn(...args); };

        return () => {
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;
        };
    }, []);

    useEffect(() => {
        // Check for secure context (HTTPS or Localhost)
        if (typeof window !== 'undefined') {
            const isNative = (window as any).Capacitor?.isNativePlatform?.();
            if (!isNative && !window.isSecureContext) {
                setIsSecure(false);
            }
        }
    }, []);

    const requestCameraPermission = async () => {
        try {
            console.log("Requesting Camera Permission...");
            const status = await Camera.requestPermissions();
            console.log("Camera Permission Status:", status.camera);
            setHasCameraPermission(status.camera === 'granted');
            if (status.camera !== 'granted') {
                setScanError("Camera permission denied. Please enable it in Android settings.");
            }
        } catch (e: any) {
            console.error("Camera Permission Error:", e);
            setScanError("Failed to request camera permission: " + e.message);
            setHasCameraPermission(false);
        }
    };

    useEffect(() => {
        if (mode === 'qr' && !savedSpool && hasCameraPermission === null) {
            requestCameraPermission();
        }
    }, [mode, savedSpool, hasCameraPermission]);

    if (!isSecure) {
        return (
            <div className="flex flex-col items-center justify-center p-8 max-w-md mx-auto min-h-[50vh] text-center">
                <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-4">
                    <Loader2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-bold mb-2">Connection Not Secure</h2>
                <p className="text-gray-500 mb-6">
                    Scanning features (Camera & NFC) require a secure connection (HTTPS) or a Native App.
                </p>
                <div className="space-y-4">
                    <p className="text-sm font-semibold">To fix this:</p>
                    <ul className="text-sm text-left list-disc pl-8 space-y-1">
                        <li>Build the Android APK (`npx cap run android`)</li>
                        <li>Or use `localhost` on the device via USB debugging</li>
                        <li>Or use a secure tunnel (ngrok)</li>
                    </ul>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center min-h-[80vh] gap-6 max-w-md mx-auto w-full">

            {/* Header / Mode Switcher */}
            <div className="w-full flex flex-col gap-4 text-center">
                <h1 className="text-2xl font-bold">Scanner</h1>
                <div className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <button
                        onClick={() => { setMode('nfc'); reset(); }}
                        className={`py-2 rounded-md transition-all text-sm font-medium ${mode === 'nfc' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}
                    >
                        NFC Tag
                    </button>
                    <button
                        onClick={() => { setMode('qr'); reset(); }}
                        className={`py-2 rounded-md transition-all text-sm font-medium ${mode === 'qr' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}
                    >
                        QR Code
                    </button>
                </div>
            </div>

            <div className="w-full flex-grow flex flex-col items-center justify-start gap-6">

                {/* NFC Section */}
                {mode === 'nfc' && (
                    <div className="w-full flex flex-col items-center">
                        <div className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl w-full flex flex-col items-center justify-center min-h-[250px] bg-gray-50 dark:bg-gray-900/50 mb-6">
                            {nfcState === 'idle' && <p className="text-gray-500">Tap below to scan NFC</p>}
                            {nfcState === 'scanning' && <div className="animate-pulse text-blue-500 font-semibold">Hold device near tag...</div>}

                            {nfcState === 'error' && <p className="text-red-500">{nfcError}</p>}
                            {nfcState === 'unsupported' && <p className="text-orange-500">NFC not supported on this device</p>}
                        </div>

                        <button
                            onClick={scan}
                            disabled={nfcState === 'scanning' || nfcState === 'unsupported'}
                            className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
                        >
                            {nfcState === 'scanning' ? 'Scanning...' : 'Start NFC Scan'}
                        </button>
                    </div>
                )}

                {/* QR Section */}
                {mode === 'qr' && !savedSpool && (
                    <div className="w-full flex flex-col items-center gap-4">
                        <div className="w-full aspect-square rounded-xl overflow-hidden bg-black relative shadow-lg">
                            {hasCameraPermission === null ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                                    <p className="text-gray-400">Requesting Camera Access...</p>
                                </div>
                            ) : hasCameraPermission && !scanError ? (
                                <Scanner
                                    onScan={(result) => {
                                        if (result && result.length > 0) {
                                            setQrResult(result[0].rawValue);
                                        }
                                    }}
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gray-900 border-2 border-red-500/50 rounded-xl">
                                    <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                                    <p className="text-red-400 font-medium mb-4">{scanError || "Camera access required"}</p>
                                    <button
                                        onClick={() => { reset(); setHasCameraPermission(null); }}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Retry
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {saving && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl flex items-center gap-4 shadow-xl">
                            <Loader2 className="animate-spin text-blue-600" />
                            <span className="font-medium">Saving to Database...</span>
                        </div>
                    </div>
                )}

            </div>

            {/* Terminal Debug Log */}
            <div className="w-full mt-auto bg-black text-xs font-mono p-4 rounded-t-xl overflow-hidden flex flex-col gap-2 max-h-[150px] border-t border-gray-800">
                <div className="flex justify-between items-center text-gray-500 mb-1 border-b border-gray-800 pb-1">
                    <span>Debug Console</span>
                    <button onClick={() => setLogs([])}>Clear</button>
                </div>
                <div className="overflow-y-auto flex flex-col gap-1">
                    {logs.length === 0 && <span className="text-gray-700 italic">No logs captured...</span>}
                    {logs.map((log, i) => (
                        <div key={i} className={log.includes('ERR') ? 'text-red-400' : log.includes('WRN') ? 'text-yellow-400' : 'text-gray-400'}>
                            {log}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
