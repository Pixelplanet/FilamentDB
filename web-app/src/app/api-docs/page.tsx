'use client';

import { openApiSpec } from '@/lib/openapi';
import { FileCode, Download, ExternalLink } from 'lucide-react';
import { useState } from 'react';

/**
 * API Documentation Page
 * 
 * Displays OpenAPI specification and provides links to view in external tools
 */
export default function ApiDocsPage() {
    const [copied, setCopied] = useState(false);

    const specJson = JSON.stringify(openApiSpec, null, 2);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(specJson);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const downloadSpec = () => {
        const blob = new Blob([specJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'filamentdb-openapi.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    // Create Swagger Editor URL
    const swaggerEditorUrl = `https://editor.swagger.io/?url=data:application/json;base64,${btoa(specJson)}`;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-8 text-white shadow-lg">
                    <div className="flex items-center gap-3 mb-2">
                        <FileCode className="w-10 h-10" />
                        <h1 className="text-3xl font-bold">FilamentDB API Documentation</h1>
                    </div>
                    <p className="text-purple-100">
                        Interactive REST API for managing 3D printer filament spools
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={copyToClipboard}
                        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-purple-500 transition-all flex flex-col items-center gap-3 group"
                    >
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-full group-hover:scale-110 transition-transform">
                            <FileCode className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold">{copied ? 'Copied!' : 'Copy Spec'}</h3>
                            <p className="text-sm text-gray-500">Copy OpenAPI JSON</p>
                        </div>
                    </button>

                    <button
                        onClick={downloadSpec}
                        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-all flex flex-col items-center gap-3 group"
                    >
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full group-hover:scale-110 transition-transform">
                            <Download className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold">Download</h3>
                            <p className="text-sm text-gray-500">Save as JSON file</p>
                        </div>
                    </button>

                    <a
                        href={swaggerEditorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-green-500 transition-all flex flex-col items-center gap-3 group"
                    >
                        <div className="p-3 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full group-hover:scale-110 transition-transform">
                            <ExternalLink className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold">Swagger Editor</h3>
                            <p className="text-sm text-gray-500">View & Test APIs</p>
                        </div>
                    </a>
                </div>

                {/* API Endpoints Overview */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold mb-4">Available Endpoints</h2>
                    <div className="space-y-4">
                        {Object.entries(openApiSpec.paths || {}).map(([path, methods]: [string, any]) => (
                            <div key={path} className="border-l-4 border-blue-500 pl-4">
                                <code className="text-sm font-mono text-blue-600 dark:text-blue-400 font-bold">
                                    {path}
                                </code>
                                <div className="mt-2 space-y-1">
                                    {Object.entries(methods).map(([method, details]: [string, any]) => (
                                        <div key={method} className="flex items-start gap-3">
                                            <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${method === 'get' ? 'bg-green-100 text-green-700' :
                                                    method === 'post' ? 'bg-blue-100 text-blue-700' :
                                                        method === 'delete' ? 'bg-red-100 text-red-700' :
                                                            'bg-gray-100 text-gray-700'
                                                }`}>
                                                {method}
                                            </span>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{details.summary}</p>
                                                <p className="text-xs text-gray-500">{details.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* OpenAPI Spec Preview */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold mb-4">OpenAPI Specification</h2>
                    <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[600px]">
                        <pre className="text-green-400 text-xs font-mono">
                            {specJson}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
}
