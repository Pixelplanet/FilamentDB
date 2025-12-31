'use client';

import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useMaterialProfiles } from '@/hooks/useMaterialProfiles';
import { MaterialProfile } from '@/db';
import { Plus, Trash2, Edit2, Save, X, FlaskConical } from 'lucide-react';
import Link from 'next/link';

export default function MaterialSettingsPage() {
    const { profiles, loading, saveProfile, deleteProfile } = useMaterialProfiles();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<MaterialProfile>>({});

    const handleEdit = (profile: MaterialProfile) => {
        setEditingId(profile.id);
        setFormData(profile);
    };

    const handleAddNew = () => {
        setEditingId('new');
        setFormData({
            id: crypto.randomUUID(),
            name: '',
            type: '',
            temperatureNozzleMin: 200,
            temperatureNozzleMax: 220,
            temperatureBedMin: 60,
            temperatureBedMax: 60,
            density: 1.24
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setFormData({});
    };

    const handleSave = async () => {
        if (!formData.name || !formData.type) return;

        await saveProfile(formData as MaterialProfile);
        setEditingId(null);
        setFormData({});
    };

    const handleDelete = async (id: string) => {
        if (confirm('Delete this material profile?')) {
            await deleteProfile(id);
        }
    };

    return (
        <PageTransition className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Link href="/settings" className="text-sm text-gray-500 hover:text-blue-500 mb-2 inline-block">← Back to Settings</Link>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <FlaskConical className="w-8 h-8 text-blue-500" />
                        Material Profiles
                    </h1>
                    <p className="text-gray-500">Manage default presets for material types.</p>
                </div>
                <button
                    onClick={handleAddNew}
                    disabled={!!editingId}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Material
                </button>
            </div>

            {loading && <div className="text-center py-10">Loading profiles...</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Edit Card (if active) */}
                {editingId && (
                    <div className="md:col-span-2 lg:col-span-3 bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-blue-200 dark:border-blue-800 mb-4 animate-in fade-in slide-in-from-top-4">
                        <div className="flex justify-between mb-4">
                            <h3 className="font-bold text-lg">{editingId === 'new' ? 'New Material' : 'Edit Material'}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Material Name</label>
                                <input
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="e.g. Polylactic Acid"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Abbreviation (Type)</label>
                                <input
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 uppercase"
                                    placeholder="e.g. PLA"
                                    value={formData.type || ''}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Density</label>
                                <div className="relative flex items-center">
                                    <input
                                        className="w-full p-2 pr-12 border rounded dark:bg-gray-700 dark:border-gray-600"
                                        type="number" step="0.01"
                                        value={formData.density || ''}
                                        onChange={e => setFormData({ ...formData, density: parseFloat(e.target.value) })}
                                    />
                                    <span className="absolute right-3 text-gray-500 text-sm pointer-events-none">g/cm³</span>
                                </div>
                            </div>
                            <div className="hidden md:block"></div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Nozzle Temp</label>
                                <div className="flex gap-2 items-center">
                                    <div className="relative flex-1">
                                        <input
                                            className="w-full p-2 pr-8 border rounded dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500"
                                            type="number" placeholder="Min"
                                            value={formData.temperatureNozzleMin || ''}
                                            onChange={e => setFormData({ ...formData, temperatureNozzleMin: parseFloat(e.target.value) })}
                                        />
                                        <span className="absolute right-2 top-2 text-gray-400 text-xs">°C</span>
                                    </div>
                                    <span className="text-gray-400">-</span>
                                    <div className="relative flex-1">
                                        <input
                                            className="w-full p-2 pr-8 border rounded dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500"
                                            type="number" placeholder="Max"
                                            value={formData.temperatureNozzleMax || ''}
                                            onChange={e => setFormData({ ...formData, temperatureNozzleMax: parseFloat(e.target.value) })}
                                        />
                                        <span className="absolute right-2 top-2 text-gray-400 text-xs">°C</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Bed Temp</label>
                                <div className="flex gap-2 items-center">
                                    <div className="relative flex-1">
                                        <input
                                            className="w-full p-2 pr-8 border rounded dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500"
                                            type="number" placeholder="Min"
                                            value={formData.temperatureBedMin || ''}
                                            onChange={e => setFormData({ ...formData, temperatureBedMin: parseFloat(e.target.value) })}
                                        />
                                        <span className="absolute right-2 top-2 text-gray-400 text-xs">°C</span>
                                    </div>
                                    <span className="text-gray-400">-</span>
                                    <div className="relative flex-1">
                                        <input
                                            className="w-full p-2 pr-8 border rounded dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500"
                                            type="number" placeholder="Max"
                                            value={formData.temperatureBedMax || ''}
                                            onChange={e => setFormData({ ...formData, temperatureBedMax: parseFloat(e.target.value) })}
                                        />
                                        <span className="absolute right-2 top-2 text-gray-400 text-xs">°C</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={handleCancel} className="px-4 py-2 text-gray-500 hover:text-gray-700">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
                                <Save className="w-4 h-4" /> Save Profile
                            </button>
                        </div>
                    </div>
                )}

                {/* List */}
                {profiles.map(p => (
                    <div key={p.id} className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 relative group ${editingId === p.id ? 'opacity-50' : ''}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-bold mb-1">{p.type}</span>
                                <h3 className="font-semibold text-lg">{p.name}</h3>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(p)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-blue-500"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <div className="text-sm text-gray-500 space-y-1">
                            <div className="flex justify-between"><span>Nozzle:</span> <span>{p.temperatureNozzleMin}-{p.temperatureNozzleMax}°C</span></div>
                            <div className="flex justify-between"><span>Bed:</span> <span>{p.temperatureBedMin}-{p.temperatureBedMax}°C</span></div>
                            {p.density && <div className="flex justify-between"><span>Density:</span> <span>{p.density} g/cm³</span></div>}
                        </div>
                    </div>
                ))}
            </div>
        </PageTransition>
    );
}
