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
                        for (const record of tag.ndefMessage) {
                            try {
                                if (record.type) {
                                    const typeStr = String.fromCharCode(...record.type);
                                    if (typeStr === 'application/vnd.openprinttag' || typeStr.includes('openprinttag')) {
                                        const payloadBytes = new Uint8Array(record.payload);
                                        const decoded = decode(payloadBytes);
                                        parsedRecords.push({ mediaType: typeStr, data: decoded });
                                    }
                                }
                            } catch (e) {
                                console.warn("Failed to parse record", e);
                            }
                        }
                    }

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

            if (isNative) {
                const payloadArray = Array.from(new Uint8Array(encoded));
                const typeArray = Array.from(new TextEncoder().encode('application/vnd.openprinttag'));

                await CapacitorNfc.write({
                    records: [{
                        tnf: 2, // TNF_MIME_MEDIA
                        type: typeArray as any,
                        id: [],
                        payload: payloadArray as any,
                    }]
                });
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
            console.error('NFC write error:', err);

            let errorMessage = err.message || 'Failed to write to NFC tag';
            if (err.message?.includes('cancelled')) {
                errorMessage = 'Write operation cancelled';
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
