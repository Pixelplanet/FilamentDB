'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSpool, useSpoolMutations } from '@/hooks/useFileStorage';

export default function EditSpoolPage() {
    return (
        <div className="max-w-xl mx-auto space-y-6 pb-20">
            <Suspense fallback={<div className="p-8 text-center flex items-center justify-center gap-2"><Loader2 className="animate-spin w-4 h-4 text-primary" />Loading...</div>}>
                <EditSpoolContent />
            </Suspense>
        </div>
    );
}

function EditSpoolContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const serial = searchParams.get('serial');

    const { spool, loading } = useSpool(serial);
    const { updateSpool, deleteSpool } = useSpoolMutations();

    const [formData, setFormData] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (spool) {
            setFormData(spool);
        }
    }, [spool]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!serial || !formData) return;
        setSaving(true);
        try {
            await updateSpool(serial, {
                ...formData,
                lastScanned: Date.now() // Treat edit as interaction
            });
            router.push(`/inventory/detail?serial=${serial}`);
        } catch (error) {
            console.error("Save failed", error);
            alert("Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!serial || !confirm("Are you sure you want to delete this filament? This cannot be undone.")) return;
        setDeleting(true);
        try {
            await deleteSpool(serial);
            router.push('/inventory');
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete filament.");
        } finally {
            setDeleting(false);
        }
    };

    if (!serial) return <div className="p-8 text-center text-red-500">Invalid Spool Serial.</div>;
    if (loading || !formData) return <div className="p-8 text-center flex items-center justify-center gap-2"><Loader2 className="animate-spin w-4 h-4 text-primary" />Initialising...</div>;

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href={`/inventory/detail?serial=${serial}`} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-2xl font-bold">Edit Filament</h1>
                </div>
                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full disabled:opacity-50"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Brand</label>
                        <input
                            type="text"
                            required
                            value={formData.brand}
                            onChange={e => setFormData({ ...formData, brand: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Material Type (e.g. PLA, PETG)</label>
                        <input
                            type="text"
                            required
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color Name</label>
                            <input
                                type="text"
                                required
                                value={formData.color}
                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color HEX</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={formData.colorHex || '#000000'}
                                    onChange={e => setFormData({ ...formData, colorHex: e.target.value })}
                                    className="h-10 w-12 rounded border p-1 bg-white dark:bg-gray-900"
                                />
                                <input
                                    type="text"
                                    value={formData.colorHex || ''}
                                    onChange={e => setFormData({ ...formData, colorHex: e.target.value })}
                                    placeholder="#000000"
                                    className="flex-grow px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 font-mono text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
                    <h3 className="font-semibold text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider">Weight Settings (g)</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Weight</label>
                            <input
                                type="number"
                                required
                                value={formData.weightTotal}
                                onChange={e => setFormData({ ...formData, weightTotal: Number(e.target.value) })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remaining</label>
                            <input
                                type="number"
                                required
                                value={formData.weightRemaining}
                                onChange={e => setFormData({ ...formData, weightRemaining: Number(e.target.value) })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Empty Spool Weight (Tare)</label>
                        <input
                            type="number"
                            value={formData.weightSpool || ''}
                            onChange={e => setFormData({ ...formData, weightSpool: Number(e.target.value) })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900"
                        />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
                    <h3 className="font-semibold text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider">Technical Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Nozzle (°C)</label>
                            <input
                                type="number"
                                value={formData.temperatureNozzleMin || ''}
                                onChange={e => setFormData({ ...formData, temperatureNozzleMin: Number(e.target.value) })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Nozzle (°C)</label>
                            <input
                                type="number"
                                value={formData.temperatureNozzleMax || ''}
                                onChange={e => setFormData({ ...formData, temperatureNozzleMax: Number(e.target.value) })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Diameter (mm)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.diameter || 1.75}
                                onChange={e => setFormData({ ...formData, diameter: Number(e.target.value) })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Density (g/cm³)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.density || 1.24}
                                onChange={e => setFormData({ ...formData, density: Number(e.target.value) })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 sticky bottom-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex-grow flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg transition-colors disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                        Save Changes
                    </button>
                    <Link
                        href={`/inventory/detail?serial=${serial}`}
                        className="px-6 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-3 rounded-xl font-bold transition-colors"
                    >
                        Cancel
                    </Link>
                </div>
            </form>
        </>
    );
}
