import { useState, useCallback, useEffect } from 'react';
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

    const isNative = Capacitor.isNativePlatform();

    // Check support on mount
    useEffect(() => {
        if (!isNative) {
            if (typeof window !== 'undefined' && !('NDEFReader' in window)) {
                setState('unsupported');
            }
        }
        // Native support is assumed/checked at runtime via plugin
    }, [isNative]);

    const scan = useCallback(async () => {
        if (state === 'unsupported') return;

        try {
            setState('scanning');
            setError(null);

            if (isNative) {
                // --- NATIVE IMPLEMENTATION ---
                // Simplification for Take 3:
                // Manual permission/status checks often fail with "undefined" on various plugin versions/devices.
                // startScanning() typically triggers the native prompts or gives a clear error if disabled.

                // 1. Define listener
                const listener = await CapacitorNfc.addListener('ndefDiscovered', async (event) => {
                    const tag = event.tag;
                    // Safe access to ID
                    let tagId = 'unknown';
                    if (tag.id && Array.isArray(tag.id)) {
                        tagId = tag.id.map((b: number) => b.toString(16).padStart(2, '0')).join(':');
                    }

                    const parsedRecords: any[] = [];

                    if (tag.ndefMessage && Array.isArray(tag.ndefMessage)) {
                        for (const record of tag.ndefMessage) {
                            // record.type is number[]
                            const typeStr = String.fromCharCode(...record.type);

                            if (typeStr === 'application/vnd.openprinttag') {
                                const payloadBytes = new Uint8Array(record.payload);
                                const decoded = decode(payloadBytes);
                                parsedRecords.push({
                                    mediaType: typeStr,
                                    data: decoded
                                });
                            }
                        }
                    }

                    setReading({ serialNumber: tagId, records: parsedRecords });
                    setState('success');

                    // Stop scanning and remove listener
                    await CapacitorNfc.stopScanning();
                    await listener.remove();
                });

                // Start scanning
                await CapacitorNfc.startScanning();

            } else {
                // --- WEB IMPLEMENTATION ---
                // @ts-ignore
                const ndef = new NDEFReader();
                await ndef.scan();

                ndef.onreading = (event: any) => {
                    const { message, serialNumber } = event;
                    const parsedRecords = [];

                    for (const record of message.records) {
                        try {
                            if (record.recordType === "mime") {
                                const data = new Uint8Array(record.data.buffer);
                                const decoded = decode(data);
                                parsedRecords.push({
                                    mediaType: record.mediaType,
                                    data: decoded
                                });
                            }
                        } catch (e) {
                            console.warn("Failed to decode record", e);
                        }
                    }

                    setReading({ serialNumber, records: parsedRecords });
                    setState('success');
                };

                ndef.onreadingerror = () => {
                    setError("Error reading NFC tag.");
                    setState('error');
                };
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to start NFC scan");
            setState('error');
        }
    }, [isNative]); // Removed state from dependencies to prevent re-creation during scan

    const write = useCallback(async (data: any) => {
        if (state === 'unsupported') throw new Error('NFC not supported');

        try {
            setState('writing');
            setError(null);

            // Encode data to CBOR
            const encoded = encode(data);

            if (isNative) {
                // --- NATIVE WRITE ---
                // CapacitorNfc expects records as array of number arrays or similar depending on version.
                // Checking docs for @capgo/capacitor-nfc: typically write(message: NdefMessage)
                // where record payload is number[] or string (base64)

                // We need to convert Uint8Array (encoded) to number[]
                const payloadArray = Array.from(encoded);
                const typeArray = Array.from(new TextEncoder().encode('application/vnd.openprinttag'));

                // Construct NDEF Message
                // Type 2 = MIME
                // payload = our CBOR data
                // type = mime type string bytes

                await CapacitorNfc.write({
                    records: [
                        {
                            tnf: 2, // MIME Media
                            type: typeArray,
                            id: [],
                            payload: payloadArray,
                        }
                    ]
                });

            } else {
                // --- WEB WRITE ---
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
            console.error(err);
            setError(err.message || "Failed to write NFC tag");
            setState('error');
            throw err;
        }
    }, [state, isNative]);

    return {
        state,
        error,
        reading,
        scan,
        write
    };
};
