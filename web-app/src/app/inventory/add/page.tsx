'use client';

import { useState, useEffect, Suspense } from 'react';
import { Spool } from '@/db';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSpoolMutations } from '@/hooks/useFileStorage';
import { getApiUrl } from '@/lib/apiConfig';
import { SpoolForm } from '@/components/SpoolForm';

function AddSpoolForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { createSpool } = useSpoolMutations();
    const [activeTab, setActiveTab] = useState<'manual' | 'url'>('manual');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initial Data for the form
    const [initialData, setInitialData] = useState<Partial<Spool>>({
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
        temperaturePreheat: 0,
        finish: 'plain'
    });

    // Check for draft from Scanner
    useEffect(() => {
        const draftStr = localStorage.getItem('scan_result_draft');
        if (draftStr) {
            try {
                const draft = JSON.parse(draftStr);
                setInitialData(prev => ({ ...prev, ...draft }));
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

    const handleSave = async (data: Partial<Spool>) => {
        setIsSubmitting(true);
        try {
            // Generate semi-random serial if not present
            const serial = `MAN-${Date.now().toString(36).toUpperCase()}`;

            const success = await createSpool({
                ...data,
                serial,
                lastScanned: Date.now()
            } as Spool);

            if (success) {
                router.push('/inventory');
            } else {
                alert('Failed to save spool');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to save spool');
        } finally {
            setIsSubmitting(false);
        }
    };

    const analyzeUrl = async (urlOverride?: string) => {
        const target = urlOverride || url;
        if (!target) return;

        setAnalyzing(true);
        setAnalysisError('');
        setDebugLogs([]);

        try {
            const res = await fetch(getApiUrl(`/api/scrape?url=${encodeURIComponent(target)}`));
            if (!res.ok) throw new Error('Failed to analyze URL');

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            if (data.logs) {
                setDebugLogs(data.logs);
            }

            // Update initialData with extracted data to populate form
            setInitialData(prev => ({
                ...prev,
                ...data,
                // Ensure defaults if missing from scrape
                weightRemaining: data.weightTotal || prev.weightRemaining
            }));

            // Switch to manual tab to show form
            // setActiveTab('manual'); // Let user review logs first?

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
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/inventory" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Spool</h1>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'manual' ? 'bg-white dark:bg-gray-700 shadow text-blue-600' : 'text-gray-500'}`}
                    >
                        Form
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
                                className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !analyzing && url && analyzeUrl()}
                            />
                            <button
                                onClick={() => analyzeUrl()}
                                disabled={analyzing || !url}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
                            >
                                {analyzing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Analyzing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        <span>Analyze</span>
                                    </>
                                )}
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
                            <span>Data extracted! Review the form.</span>
                            <button onClick={() => setActiveTab('manual')} className="font-bold underline">Go to Form</button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'manual' && (
                <SpoolForm
                    initialData={initialData}
                    onSubmit={handleSave}
                    isSubmitting={isSubmitting}
                    defaultReadOnly={false}
                />
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
