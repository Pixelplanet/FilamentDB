import { renderHook, act, waitFor } from '@testing-library/react';
import { useNFC } from './useNFC';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the external modules
vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: vi.fn(),
    },
}));

vi.mock('@capgo/capacitor-nfc', () => ({
    CapacitorNfc: {
        addListener: vi.fn(),
        startScanning: vi.fn(),
        stopScanning: vi.fn(),
        write: vi.fn(),
    },
}));

import { Capacitor } from '@capacitor/core';
import { CapacitorNfc } from '@capgo/capacitor-nfc';

describe('useNFC', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should initialize with idle state', () => {
        (Capacitor.isNativePlatform as any).mockReturnValue(true);
        const { result } = renderHook(() => useNFC());
        expect(result.current.state).toBe('idle');
    });

    it('should handle non-native platform checks', () => {
        (Capacitor.isNativePlatform as any).mockReturnValue(false);
        // Mock window.NDEFReader presence logic if needed, but JSDOM doesn't have it by default
        // hook checks 'NDEFReader' in window. 
        const { result } = renderHook(() => useNFC());
        // Expect unsupported if NDEFReader is missing
        expect(result.current.state).toBe('unsupported');
    });

    it('should start scanning on native platform', async () => {
        (Capacitor.isNativePlatform as any).mockReturnValue(true);
        (CapacitorNfc.addListener as any).mockResolvedValue({ remove: vi.fn() });

        const { result } = renderHook(() => useNFC());

        await act(async () => {
            await result.current.scan();
        });

        expect(result.current.state).toBe('scanning');
        expect(CapacitorNfc.addListener).toHaveBeenCalledWith('ndefDiscovered', expect.any(Function));
        expect(CapacitorNfc.addListener).toHaveBeenCalledWith('tagDiscovered', expect.any(Function));
        expect(CapacitorNfc.startScanning).toHaveBeenCalled();
    });
});
