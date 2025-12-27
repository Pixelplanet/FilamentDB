'use client';

import { useState, useEffect, Suspense } from 'react';
import { db, Spool } from '@/db';
import { ArrowLeft, Save, Globe, Type, Loader2, Sparkles, Terminal, Thermometer, Ruler, Scale, Tag, Hash } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function AddSpoolForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<'manual' | 'url'>('manual');

    // Expanded Form State matching Schema
    const [formData, setFormData] = useState<Partial<Spool>>({
        brand: '',
        type: 'PLA',
        color: '',
        colorHex: '#000000',
        weightRemaining: 1000,
        weightTotal: 1000,
        weightSpool: 0, // Tare
        diameter: 1.75,
        density: 1.24,
        temperatureNozzleMin: 200,
        temperatureNozzleMax: 220,
        temperatureBedMin: 60,
        temperatureBedMax: 60,
        batchNumber: '',
        productionDate: ''
    });

    // Check for draft from Scanner
    useEffect(() => {
        const draftStr = localStorage.getItem('scan_result_draft');
        if (draftStr) {
            try {
                const draft = JSON.parse(draftStr);
                setFormData(prev => ({
                    ...prev,
                    ...draft
                }));
                // Clear draft so it doesn't persist forever
                localStorage.removeItem('scan_result_draft');
            } catch (e) {
                console.error("Failed to parse draft", e);
            }
        }
    }, []);


    // URL State
    const [url, setUrl] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState('');
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const addLog = (msg: string) => setDebugLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    const handleSave = async () => {
        try {
            // Generate semi-random serial if not present
            const serial = `MAN-${Date.now().toString(36).toUpperCase()}`;

            await db.spools.add({
                ...formData,
                serial,
                lastScanned: Date.now()
            } as Spool);

            router.push('/inventory');
        } catch (e) {
            console.error(e);
            alert('Failed to save spool');
        }
    };

    const analyzeUrl = async (urlOverride?: string) => {
        const target = urlOverride || url;
        if (!target) return;

        setAnalyzing(true);
        setAnalysisError('');
        setDebugLogs([]);

        try {
            const res = await fetch(`/api/scrape?url=${encodeURIComponent(target)}`);
            if (!res.ok) throw new Error('Failed to analyze URL');

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // Display logs from server
            if (data.logs) {
                setDebugLogs(data.logs);
            }

            // Update form with extracted data
            setFormData(prev => ({
                ...prev,
                brand: data.brand || prev.brand,
                type: data.type || prev.type,
                color: data.color || prev.color,
                colorHex: data.colorHex || prev.colorHex,
                weightTotal: data.weightTotal || prev.weightTotal,
                weightRemaining: data.weightTotal || prev.weightRemaining, // Assume full spool on first import
                temperatureNozzleMin: data.temperatureNozzleMin || prev.temperatureNozzleMin,
                temperatureNozzleMax: data.temperatureNozzleMax || prev.temperatureNozzleMax,
                temperatureBedMin: data.temperatureBedMin || prev.temperatureBedMin,
                temperatureBedMax: data.temperatureBedMax || prev.temperatureBedMax,
                density: data.density || prev.density
            }));

        } catch (e: any) {
            setAnalysisError(e.message);
        } finally {
            setAnalyzing(false);
        }
    };

    // Auto-analyze if URL param exists
    useEffect(() => {
        const importUrl = searchParams.get('importUrl');
        if (importUrl) {
            setUrl(importUrl);
            setActiveTab('url');
            analyzeUrl(importUrl);
        }
    }, [searchParams]);

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-20">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/inventory" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-2xl font-bold">Add New Spool</h1>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'manual' ? 'bg-white dark:bg-gray-700 shadow text-blue-600' : 'text-gray-500'}`}
                    >
                        Manual
                    </button>
                    <button
                        onClick={() => setActiveTab('url')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'url' ? 'bg-white dark:bg-gray-700 shadow text-blue-600' : 'text-gray-500'}`}
                    >
                        URL Import
                    </button>
                </div>
            </div>

            {activeTab === 'url' && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Product Page URL</label>
                        <div className="flex gap-2">
                            <input
                                type="url"
                                placeholder="Paste URL here..."
                                className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent"
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                            />
                            <button
                                onClick={() => analyzeUrl()}
                                disabled={analyzing || !url}
                                className="px-4 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
                            >
                                {analyzing ? <Loader2 className="animate-spin" /> : 'Analyze'}
                            </button>
                        </div>
                    </div>

                    {analysisError && <p className="text-red-500 text-sm">{analysisError}</p>}

                    {debugLogs.length > 0 && (
                        <div className="mt-4 p-4 bg-gray-950 rounded-lg font-mono text-xs text-green-400 overflow-y-auto max-h-32">
                            {debugLogs.map((log, i) => <div key={i}>{log}</div>)}
                        </div>
                    )}

                    {debugLogs.length > 0 && !analyzing && !analysisError && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-800 dark:text-blue-200 text-sm flex justify-between items-center">
                            <span>Data extracted! Review the details below.</span>
                            <button onClick={() => setActiveTab('manual')} className="font-bold underline">Go to Editor</button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'manual' && (
                <div className="space-y-6">

                    {/* 1. Basic Info Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-4 text-blue-600 font-semibold">
                            <Tag className="w-5 h-5" />
                            <span>Basic Information</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Brand</label>
                                <input
                                    value={formData.brand}
                                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                    className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                                    placeholder="e.g. Prusament"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Material</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                                >
                                    <option>PLA</option><option>PETG</option><option>ASA</option><option>PC</option><option>TPU</option><option>ABS</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Color Name</label>
                                <input
                                    value={formData.color}
                                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                                    className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Color Hex</label>
                                <div className="flex gap-2">
                                    <input type="color" className="h-10 w-12 rounded cursor-pointer" value={formData.colorHex} onChange={e => setFormData({ ...formData, colorHex: e.target.value })} />
                                    <input className="flex-1 p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 uppercase font-mono" value={formData.colorHex} onChange={e => setFormData({ ...formData, colorHex: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Vitals / Weights */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-4 text-green-600 font-semibold">
                            <Scale className="w-5 h-5" />
                            <span>Weight & Dimensions</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Total (g)</label>
                                <input type="number" className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700" value={formData.weightTotal} onChange={e => setFormData({ ...formData, weightTotal: Number(e.target.value) })} />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Remaining (g)</label>
                                <input type="number" className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700" value={formData.weightRemaining} onChange={e => setFormData({ ...formData, weightRemaining: Number(e.target.value) })} />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Spool Tare (g)</label>
                                <input type="number" className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700" value={formData.weightSpool} onChange={e => setFormData({ ...formData, weightSpool: Number(e.target.value) })} />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Diameter (mm)</label>
                                <input type="number" step="0.01" className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700" value={formData.diameter} onChange={e => setFormData({ ...formData, diameter: Number(e.target.value) })} />
                            </div>
                        </div>
                    </div>

                    {/* 3. Temperatures */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-4 text-orange-600 font-semibold">
                            <Thermometer className="w-5 h-5" />
                            <span>Temperatures (°C)</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Nozzle */}
                            <div className="space-y-2">
                                <span className="text-sm font-medium">Nozzle Range</span>
                                <div className="flex items-center gap-2">
                                    <input type="number" className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700" placeholder="Min" value={formData.temperatureNozzleMin} onChange={e => setFormData({ ...formData, temperatureNozzleMin: Number(e.target.value) })} />
                                    <span className="text-gray-400">-</span>
                                    <input type="number" className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700" placeholder="Max" value={formData.temperatureNozzleMax} onChange={e => setFormData({ ...formData, temperatureNozzleMax: Number(e.target.value) })} />
                                </div>
                            </div>
                            {/* Bed */}
                            <div className="space-y-2">
                                <span className="text-sm font-medium">Bed Range</span>
                                <div className="flex items-center gap-2">
                                    <input type="number" className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700" placeholder="Min" value={formData.temperatureBedMin} onChange={e => setFormData({ ...formData, temperatureBedMin: Number(e.target.value) })} />
                                    <span className="text-gray-400">-</span>
                                    <input type="number" className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700" placeholder="Max" value={formData.temperatureBedMax} onChange={e => setFormData({ ...formData, temperatureBedMax: Number(e.target.value) })} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. Traceability (Optional) */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-4 text-purple-600 font-semibold">
                            <Hash className="w-5 h-5" />
                            <span>Traceability</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Batch Number</label>
                                <input className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700" value={formData.batchNumber} onChange={e => setFormData({ ...formData, batchNumber: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Production Date</label>
                                <input type="date" className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700" value={formData.productionDate} onChange={e => setFormData({ ...formData, productionDate: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSave}
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2"
                        >
                            <Save className="w-5 h-5" />
                            Save to Inventory
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AddSpoolPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>}>
            <AddSpoolForm />
        </Suspense>
    );
}
