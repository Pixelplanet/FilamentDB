import { useState, useCallback, useEffect, useRef } from 'react';
import { decode, encode } from 'cbor-x';
import { Capacitor } from '@capacitor/core';
import { CapacitorNfc } from '@capgo/capacitor-nfc';

export type NFCState = 'unsupported' | 'idle' | 'scanning' | 'writing' | 'error' | 'success';

interface NFCReading {
    serialNumber: string;
    records: any[];
}

export const useNFC = () => {
    const [state, setState] = useState<NFCState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [reading, setReading] = useState<NFCReading | null>(null);

    // Track if listeners are registered to prevent duplicates
    const listenersRegistered = useRef(false);
    const ndefReaderRef = useRef<any>(null);

    const isNative = Capacitor.isNativePlatform();

    // Check NFC support on mount
    useEffect(() => {
        if (!isNative) {
            if (typeof window !== 'undefined' && !('NDEFReader' in window)) {
                setState('unsupported');
            }
        }
    }, [isNative]);

    // Cleanup function to remove all listeners
    const cleanup = useCallback(async () => {
        if (isNative && listenersRegistered.current) {
            try {
                // @ts-ignore - removeAllListeners exists but may not be in types
                await CapacitorNfc.removeAllListeners();
                await CapacitorNfc.stopScanning();
                listenersRegistered.current = false;
            } catch (e) {
                console.warn('Failed to cleanup NFC listeners:', e);
            }
        }

        // Cleanup web NFC reader
        if (ndefReaderRef.current) {
            ndefReaderRef.current.onreading = null;
            ndefReaderRef.current.onreadingerror = null;
            ndefReaderRef.current = null;
        }
    }, [isNative]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    // Check NFC availability (native platform only)
    const checkNFCAvailability = useCallback(async (): Promise<{ available: boolean; error: string | null }> => {
        if (!isNative) {
            // For web, we rely on the initial check
            return { available: state !== 'unsupported', error: null };
        }

        try {
            // Check if NFC is supported (plugin available)
            const isSupported = typeof CapacitorNfc.startScanning === 'function';
            if (!isSupported) {
                return { available: false, error: 'NFC_NOT_SUPPORTED' };
            }

            // On Android, we can't always check if NFC is enabled before scanning
            // The scan will fail if NFC is disabled - we'll handle that in the error
            return { available: true, error: null };
        } catch (e) {
            return { available: false, error: 'PERMISSION_DENIED' };
        }
    }, [isNative, state]);

    const scan = useCallback(async () => {
        if (state === 'unsupported') {
            setError('NFC is not supported on this device');
            return;
        }

        try {
            setState('scanning');
            setError(null);

            if (isNative) {
                // Check availability
                const { available, error: availabilityError } = await checkNFCAvailability();
                if (!available) {
                    let errorMessage = 'NFC is not available';
                    switch (availabilityError) {
                        case 'NFC_NOT_SUPPORTED':
                            errorMessage = 'This device does not support NFC';
                            break;
                        case 'NFC_DISABLED':
                            errorMessage = 'Please enable NFC in device settings';
                            break;
                        case 'PERMISSION_DENIED':
                            errorMessage = 'NFC permission denied. Please grant permission in settings';
                            break;
                    }
                    setError(errorMessage);
                    setState('error');
                    return;
                }

                // Remove any existing listeners before adding new ones
                if (listenersRegistered.current) {
                    // @ts-ignore - removeAllListeners exists but may not be in types
                    await CapacitorNfc.removeAllListeners();
                    listenersRegistered.current = false;
                }

                const onTag = async (event: any) => {
                    console.log("NFC Event Detected:", JSON.stringify(event));
                    const tag = event.tag;
                    if (!tag) return;

                    let tagId = 'unknown';
                    if (tag.id && Array.isArray(tag.id)) {
                        tagId = tag.id.map((b: number) => b.toString(16).padStart(2, '0')).join(':');
                    }
                    console.log("Tag ID:", tagId);

                    const parsedRecords: any[] = [];
                    if (tag.ndefMessage && Array.isArray(tag.ndefMessage)) {
                        console.log("[NFC] Found", tag.ndefMessage.length, "NDEF records");

                        for (let i = 0; i < tag.ndefMessage.length; i++) {
                            const record = tag.ndefMessage[i];
                            console.log(`[NFC] Record ${i}:`, JSON.stringify({
                                tnf: record.tnf,
                                typeLength: record.type?.length,
                                payloadLength: record.payload?.length,
                                type: record.type
                            }));

                            try {
                                // Get the type as string
                                let typeStr = '';
                                if (record.type) {
                                    if (Array.isArray(record.type)) {
                                        typeStr = String.fromCharCode(...record.type);
                                    } else if (typeof record.type === 'string') {
                                        typeStr = record.type;
                                    } else if (record.type instanceof Uint8Array) {
                                        typeStr = String.fromCharCode(...(Array.from(record.type) as number[]));
                                    }
                                }
                                console.log(`[NFC] Record ${i} type string:`, typeStr);

                                // Check for OpenPrintTag MIME type
                                // TNF 2 = MIME Media type
                                const isOpenPrintTag = typeStr === 'application/vnd.openprinttag' ||
                                    typeStr.includes('openprinttag') ||
                                    (record.tnf === 2 && typeStr.includes('openprinttag'));

                                if (isOpenPrintTag && record.payload) {
                                    console.log(`[NFC] Parsing OpenPrintTag record...`);
                                    let payloadBytes: Uint8Array;
                                    if (record.payload instanceof Uint8Array) {
                                        payloadBytes = record.payload;
                                    } else if (Array.isArray(record.payload)) {
                                        payloadBytes = new Uint8Array(record.payload);
                                    } else {
                                        payloadBytes = new Uint8Array(Object.values(record.payload));
                                    }
                                    console.log(`[NFC] Payload bytes (first 50):`, Array.from(payloadBytes.slice(0, 50)));

                                    const decoded = decode(payloadBytes);
                                    console.log(`[NFC] CBOR Decoded:`, JSON.stringify(decoded));
                                    parsedRecords.push({ mediaType: typeStr, data: decoded });
                                } else if (record.tnf === 2 && record.payload) {
                                    // Try to parse any MIME type record as CBOR (might be openprinttag with different type string)
                                    console.log(`[NFC] Attempting CBOR decode on MIME record with type: ${typeStr}`);
                                    try {
                                        let payloadBytes: Uint8Array;
                                        if (record.payload instanceof Uint8Array) {
                                            payloadBytes = record.payload;
                                        } else if (Array.isArray(record.payload)) {
                                            payloadBytes = new Uint8Array(record.payload);
                                        } else {
                                            payloadBytes = new Uint8Array(Object.values(record.payload));
                                        }
                                        const decoded = decode(payloadBytes);
                                        // Check if it looks like OpenPrintTag data (has numeric keys like 10, 11, 16)
                                        if (decoded && (Array.isArray(decoded) || (decoded[10] !== undefined || decoded[11] !== undefined || decoded[16] !== undefined))) {
                                            console.log(`[NFC] Found potential OpenPrintTag data in MIME record`);
                                            parsedRecords.push({ mediaType: typeStr || 'application/vnd.openprinttag', data: decoded });
                                        }
                                    } catch (cborErr) {
                                        console.log(`[NFC] Not a CBOR record: ${cborErr}`);
                                    }
                                }
                            } catch (e) {
                                console.warn(`[NFC] Failed to parse record ${i}:`, e);
                            }
                        }
                    } else {
                        console.warn("[NFC] No NDEF message found on tag");
                    }

                    console.log("[NFC] Parsed records:", parsedRecords.length);

                    setReading({ serialNumber: tagId, records: parsedRecords });
                    setState('success');

                    // Cleanup after successful read
                    await cleanup();
                };

                // Add listeners
                await CapacitorNfc.addListener('ndefDiscovered', onTag);
                await CapacitorNfc.addListener('tagDiscovered', onTag);
                listenersRegistered.current = true;

                // Start scanning
                await CapacitorNfc.startScanning();

            } else {
                // Web NFC
                try {
                    // @ts-ignore
                    const ndef = new NDEFReader();
                    ndefReaderRef.current = ndef;

                    await ndef.scan();

                    ndef.onreading = (event: any) => {
                        const { message, serialNumber } = event;
                        const parsedRecords = [];
                        for (const record of message.records) {
                            try {
                                if (record.recordType === "mime") {
                                    const data = new Uint8Array(record.data.buffer);
                                    const decoded = decode(data);
                                    parsedRecords.push({ mediaType: record.mediaType, data: decoded });
                                }
                            } catch (e) {
                                console.warn("Failed to parse record", e);
                            }
                        }
                        setReading({ serialNumber, records: parsedRecords });
                        setState('success');
                    };

                    ndef.onreadingerror = (event: any) => {
                        console.error('NFC read error:', event);
                        setError('Failed to read NFC tag');
                        setState('error');
                    };

                } catch (err: any) {
                    // Handle specific Web NFC errors
                    if (err.name === 'NotAllowedError') {
                        setError('NFC permission denied. Please allow NFC access.');
                    } else if (err.name === 'NotSupportedError') {
                        setError('NFC is not supported in this browser');
                        setState('unsupported');
                    } else {
                        setError(err.message || 'Failed to start NFC scan');
                    }
                    setState('error');
                    throw err;
                }
            }

        } catch (err: any) {
            console.error('NFC scan error:', err);

            // Handle common native NFC errors
            let errorMessage = err.message || "Failed to start NFC scan";

            if (err.message?.includes('NFC is disabled')) {
                errorMessage = 'Please enable NFC in your device settings';
            } else if (err.message?.includes('permission')) {
                errorMessage = 'NFC permission denied';
            }

            setError(errorMessage);
            setState('error');
        }
    }, [isNative, state, checkNFCAvailability, cleanup]);

    const stopScan = useCallback(async () => {
        await cleanup();
        setState('idle');
        setError(null);
    }, [cleanup]);

    const write = useCallback(async (data: any) => {
        if (state === 'unsupported') throw new Error('NFC not supported');

        try {
            setState('writing');
            setError(null);

            const encoded = encode(data);
            console.log('[NFC Write] Encoded CBOR data, size:', encoded.byteLength, 'bytes');

            if (isNative) {
                const payloadArray = Array.from(new Uint8Array(encoded));
                const typeArray = Array.from(new TextEncoder().encode('application/vnd.openprinttag'));

                console.log('[NFC Write] Preparing to write NDEF record...');
                console.log('[NFC Write] Type:', 'application/vnd.openprinttag');
                console.log('[NFC Write] Payload size:', payloadArray.length, 'bytes');

                // Start scanning first to discover the tag
                // Remove any existing listeners
                // @ts-ignore
                await CapacitorNfc.removeAllListeners();

                // Set up listener for tag discovery
                const writePromise = new Promise<void>((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Write timeout - no tag detected within 30 seconds'));
                    }, 30000);

                    const onTagDiscovered = async (event: any) => {
                        try {
                            clearTimeout(timeout);
                            console.log('[NFC Write] Tag discovered:', JSON.stringify(event));

                            const tag = event.tag;
                            if (tag) {
                                console.log('[NFC Write] Tag type:', tag.type);
                                console.log('[NFC Write] Tag techTypes:', tag.techTypes);
                                console.log('[NFC Write] Tag isWritable:', tag.isWritable);
                                console.log('[NFC Write] Tag maxSize:', tag.maxSize);

                                // Check if tag is writable
                                if (tag.isWritable === false) {
                                    reject(new Error('This tag is read-only and cannot be written to'));
                                    return;
                                }

                                // Check size
                                if (tag.maxSize && payloadArray.length > tag.maxSize) {
                                    reject(new Error(`Data too large for tag. Data: ${payloadArray.length} bytes, Tag max: ${tag.maxSize} bytes`));
                                    return;
                                }
                            }

                            // Write to the tag
                            // Set allowFormat to false since OpenPrintTag tags are already NDEF formatted
                            await CapacitorNfc.write({
                                allowFormat: false, // Don't try to format - OpenPrintTag tags are already formatted
                                records: [{
                                    tnf: 2, // TNF_MIME_MEDIA
                                    type: typeArray as any,
                                    id: [],
                                    payload: payloadArray as any,
                                }]
                            });

                            console.log('[NFC Write] Write successful!');
                            resolve();
                        } catch (writeErr) {
                            console.error('[NFC Write] Write failed:', writeErr);
                            reject(writeErr);
                        }
                    };

                    // Listen for tag discovery events
                    CapacitorNfc.addListener('ndefDiscovered', onTagDiscovered);
                    CapacitorNfc.addListener('tagDiscovered', onTagDiscovered);
                    CapacitorNfc.addListener('ndefFormatableDiscovered', onTagDiscovered);
                });

                // Start scanning
                console.log('[NFC Write] Starting scan for tag...');
                await CapacitorNfc.startScanning({
                    invalidateAfterFirstRead: false, // Keep session open for writing
                    alertMessage: 'Hold your NFC tag near the device to write...'
                });

                // Wait for write to complete
                await writePromise;

                // Cleanup
                await CapacitorNfc.stopScanning();
                // @ts-ignore
                await CapacitorNfc.removeAllListeners();
            } else {
                // @ts-ignore
                const ndef = new NDEFReader();
                await ndef.write({
                    records: [{
                        recordType: "mime",
                        mediaType: "application/vnd.openprinttag",
                        data: encoded
                    }]
                });
            }

            setState('success');
            setTimeout(() => setState('idle'), 2000);
        } catch (err: any) {
            console.error('[NFC Write] Error:', err);

            let errorMessage = err.message || 'Failed to write to NFC tag';

            // Provide more helpful error messages
            if (err.message?.includes('cancelled')) {
                errorMessage = 'Write operation cancelled';
            } else if (err.message?.includes('NDEF formatting')) {
                errorMessage = 'Tag write failed. Try holding the tag steady and closer to the NFC reader area on your device.';
            } else if (err.message?.includes('read-only')) {
                errorMessage = 'This tag is write-protected and cannot be modified';
            } else if (err.message?.includes('timeout')) {
                errorMessage = 'No NFC tag detected. Please try again and hold the tag near your device.';
            }

            setError(errorMessage);
            setState('error');
            throw err;
        }
    }, [state, isNative]);

    return {
        state,
        error,
        reading,
        scan,
        stopScan,
        write
    };
};
