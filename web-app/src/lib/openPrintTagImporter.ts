import { decode } from 'cbor-x';

export interface OpenPrintTagData {
    version?: string;
    brand: string;
    type: string;
    diameter: number;
    color: string;
    weight: number;
    tempMin?: number;
    tempMax?: number;
    uuid?: string;
}

export async function parseOpenPrintTagBin(file: File): Promise<OpenPrintTagData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const buffer = e.target?.result as ArrayBuffer;
                if (!buffer) {
                    reject(new Error('Empty file'));
                    return;
                }

                const uint8Array = new Uint8Array(buffer);

                // Try to decode CBOR
                // OpenPrintTag uses CBOR maps with integer keys
                const decoded = decode(uint8Array);

                if (!decoded || typeof decoded !== 'object') {
                    reject(new Error('Invalid CBOR data'));
                    return;
                }

                // Map keys to human readable format
                // 0: version (string)
                // 1: brand (string)
                // 2: type (string)
                // 3: diameter (float)
                // 4: temp_nozzle_min (int)
                // 5: temp_nozzle_max (int)
                // 6: color (string)
                // 7: weight (float)
                // 8: uuid (string) - optional

                const data: OpenPrintTagData = {
                    version: decoded[0] || '1.0',
                    brand: decoded[1] || 'Unknown Brand',
                    type: decoded[2] || 'PLA',
                    diameter: Number(decoded[3]) || 1.75,
                    tempMin: Number(decoded[4]),
                    tempMax: Number(decoded[5]),
                    color: decoded[6] || 'Unknown Color',
                    weight: Number(decoded[7]) || 1000,
                    uuid: decoded[8]
                };

                resolve(data);
            } catch (error) {
                console.error("CBOR Decode Error:", error);
                reject(new Error('Failed to decode OpenPrintTag binary file. Is it a valid .bin from the generator?'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}
