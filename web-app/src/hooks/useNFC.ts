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

    useEffect(() => {
        if (!isNative) {
            if (typeof window !== 'undefined' && !('NDEFReader' in window)) {
                setState('unsupported');
            }
        }
    }, [isNative]);

    const scan = useCallback(async () => {
        if (state === 'unsupported') return;

        try {
            setState('scanning');
            setError(null);

            if (isNative) {
                // await CapacitorNfc.removeAllListeners();

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
                    // await CapacitorNfc.removeAllListeners();
                    await CapacitorNfc.stopScanning();
                };

                await CapacitorNfc.addListener('ndefDiscovered', onTag);
                await CapacitorNfc.addListener('tagDiscovered', onTag);
                await CapacitorNfc.startScanning();

            } else {
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
                                parsedRecords.push({ mediaType: record.mediaType, data: decoded });
                            }
                        } catch (e) { }
                    }
                    setReading({ serialNumber, records: parsedRecords });
                    setState('success');
                };
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to start NFC scan");
            setState('error');
        }
    }, [isNative]);

    const write = useCallback(async (data: any) => {
        if (state === 'unsupported') throw new Error('NFC not supported');
        try {
            setState('writing');
            const encoded = encode(data);

            if (isNative) {
                const payloadArray = Array.from(new Uint8Array(encoded));
                const typeArray = Array.from(new TextEncoder().encode('application/vnd.openprinttag'));
                // @ts-ignore
                await CapacitorNfc.write({
                    records: [{
                        tnf: 2,
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
            setError(err.message);
            setState('error');
            throw err;
        }
    }, [state, isNative]);

    return { state, error, reading, scan, write };
};
