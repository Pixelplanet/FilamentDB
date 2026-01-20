'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSpools } from '@/hooks/useFileStorage';
import { PageTransition } from '@/components/PageTransition';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie
} from 'recharts';
import { Package, Scale, PackageX, TrendingDown, Layers } from 'lucide-react';

// Threshold for considering a spool "empty" (grams)
const EMPTY_THRESHOLD = 50;

type ViewMode = 'count' | 'weight';

export default function StatisticsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading Statistics...</div>}>
            <StatisticsContent />
        </Suspense>
    );
}

function StatisticsContent() {
    const { spools, loading, error } = useSpools();
    const [viewMode, setViewMode] = useState<ViewMode>('count');

    const stats = useMemo(() => {
        if (!spools) return null;

        // Filter out deleted spools
        const allSpools = spools.filter(s => !s.deleted);

        // Separate active and empty spools
        const activeSpools = allSpools.filter(s => s.weightRemaining >= EMPTY_THRESHOLD);
        const emptySpools = allSpools.filter(s => s.weightRemaining < EMPTY_THRESHOLD);

        const activeCount = activeSpools.length;
        const emptyCount = emptySpools.length;
        const totalCount = allSpools.length;

        // Calculate weights
        const totalWeightRemaining = allSpools.reduce((sum, s) => sum + s.weightRemaining, 0);
        const totalWeightCapacity = allSpools.reduce((sum, s) => sum + s.weightTotal, 0);
        const totalWeightUsed = totalWeightCapacity - totalWeightRemaining;

        // Group by Brand
        const brandStats: Record<string, { active: number, empty: number, remaining: number, used: number }> = {};
        allSpools.forEach(s => {
            const b = s.brand || 'Unknown';
            if (!brandStats[b]) brandStats[b] = { active: 0, empty: 0, remaining: 0, used: 0 };
            if (s.weightRemaining >= EMPTY_THRESHOLD) {
                brandStats[b].active += 1;
            } else {
                brandStats[b].empty += 1;
            }
            brandStats[b].remaining += s.weightRemaining;
            brandStats[b].used += (s.weightTotal - s.weightRemaining);
        });

        const brandData = Object.entries(brandStats)
            .sort(([, a], [, b]) => (b.active + b.empty) - (a.active + a.empty))
            .slice(0, 10)
            .map(([name, data]) => ({
                name,
                // Count view
                Active: data.active,
                Empty: data.empty,
                // Weight view (kg)
                Remaining: parseFloat((data.remaining / 1000).toFixed(2)),
                Used: parseFloat((data.used / 1000).toFixed(2))
            }));

        // Group by Type (material)
        const typeStats: Record<string, {
            activeCount: number,
            emptyCount: number,
            remaining: number,
            capacity: number,
            used: number
        }> = {};

        allSpools.forEach(s => {
            const t = s.type || 'Other';
            if (!typeStats[t]) typeStats[t] = { activeCount: 0, emptyCount: 0, remaining: 0, capacity: 0, used: 0 };

            if (s.weightRemaining >= EMPTY_THRESHOLD) {
                typeStats[t].activeCount += 1;
            } else {
                typeStats[t].emptyCount += 1;
            }
            typeStats[t].remaining += s.weightRemaining;
            typeStats[t].capacity += s.weightTotal;
            typeStats[t].used += (s.weightTotal - s.weightRemaining);
        });

        const materialData = Object.entries(typeStats)
            .map(([name, data]) => ({
                name,
                // Count view
                activeCount: data.activeCount,
                emptyCount: data.emptyCount,
                totalCount: data.activeCount + data.emptyCount,
                // Weight view (kg)
                Remaining: parseFloat((data.remaining / 1000).toFixed(2)),
                Used: parseFloat((data.used / 1000).toFixed(2)),
                totalWeight: parseFloat(((data.remaining + data.used) / 1000).toFixed(2))
            }))
            .sort((a, b) => b.totalCount - a.totalCount);

        return {
            activeCount,
            emptyCount,
            totalCount,
            totalWeightRemaining: (totalWeightRemaining / 1000).toFixed(2),
            totalWeightUsed: (totalWeightUsed / 1000).toFixed(2),
            totalWeightCapacity: (totalWeightCapacity / 1000).toFixed(2),
            brandData,
            materialData
        };
    }, [spools]);

    if (loading) return <div className="p-8 text-center">Loading Statistics...</div>;
    if (error) return <div className="p-8 text-center text-red-600">Error: {error.message}</div>;
    if (!stats) return <div className="p-8 text-center">No data found</div>;

    // Custom Tooltip for Recharts
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                    <p className="font-bold text-gray-900 dark:text-white mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: {entry.value} {entry.unit || ''}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Colors for charts
    const MATERIAL_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

    // Toggle button component
    const ViewToggle = () => (
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
                onClick={() => setViewMode('count')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'count'
                        ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-300'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                    }`}
            >
                <Package className="w-4 h-4 inline-block mr-1" />
                Spool Count
            </button>
            <button
                onClick={() => setViewMode('weight')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'weight'
                        ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-300'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                    }`}
            >
                <Scale className="w-4 h-4 inline-block mr-1" />
                Weight (kg)
            </button>
        </div>
    );

    return (
        <PageTransition className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Statistics</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Insights into your filament inventory and usage.</p>
                </div>
                <ViewToggle />
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    title="Active Spools"
                    value={stats.activeCount}
                    icon={<Package className="w-5 h-5" />}
                    color="blue"
                />
                <KpiCard
                    title="Empty Spools"
                    value={stats.emptyCount}
                    icon={<PackageX className="w-5 h-5" />}
                    color="orange"
                />
                <KpiCard
                    title="Available Weight"
                    value={`${stats.totalWeightRemaining}kg`}
                    icon={<Scale className="w-5 h-5" />}
                    color="green"
                />
                <KpiCard
                    title="Total Used"
                    value={`${stats.totalWeightUsed}kg`}
                    icon={<TrendingDown className="w-5 h-5" />}
                    color="purple"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Material Bar Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">
                        {viewMode === 'count' ? 'Spools by Material' : 'Material Weight (kg)'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {viewMode === 'count' ? 'Active vs empty spools per material type' : 'Used vs remaining weight per material'}
                    </p>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={stats.materialData}
                                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={viewMode === 'weight' ? (value) => `${value}kg` : undefined}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                <Legend />
                                {viewMode === 'count' ? (
                                    <>
                                        <Bar dataKey="activeCount" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} name="Active" />
                                        <Bar dataKey="emptyCount" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Empty" />
                                    </>
                                ) : (
                                    <>
                                        <Bar dataKey="Used" stackId="a" fill="#94a3b8" radius={[0, 0, 4, 4]} unit="kg" name="Used" />
                                        <Bar dataKey="Remaining" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} unit="kg" name="Remaining" />
                                    </>
                                )}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Material Distribution Pie Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white flex items-center gap-2">
                        <Layers className="w-5 h-5" />
                        {viewMode === 'count' ? 'Material Distribution' : 'Weight Distribution'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {viewMode === 'count' ? 'Percentage of spools per material' : 'Percentage of weight per material'}
                    </p>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.materialData.map(m => ({
                                        name: m.name,
                                        value: viewMode === 'count' ? m.totalCount : m.totalWeight,
                                        active: m.activeCount,
                                        empty: m.emptyCount,
                                        remaining: m.Remaining,
                                        used: m.Used
                                    }))}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, value, percent = 0 }) =>
                                        `${name}: ${value}${viewMode === 'weight' ? 'kg' : ''} (${(percent * 100).toFixed(0)}%)`
                                    }
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {stats.materialData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={MATERIAL_COLORS[index % MATERIAL_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value, name, props) => {
                                        if (viewMode === 'count') {
                                            return [`${props.payload.active} active, ${props.payload.empty} empty`, 'Spools'];
                                        }
                                        return [`${props.payload.remaining}kg remaining, ${props.payload.used}kg used`, 'Weight'];
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Manufacturer Distribution Bar */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2">
                    <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">
                        {viewMode === 'count' ? 'Spools by Manufacturer' : 'Weight by Manufacturer'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {viewMode === 'count' ? 'Active vs empty spools per brand' : 'Used vs remaining weight per brand'}
                    </p>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={stats.brandData}
                                margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.1} />
                                <XAxis
                                    type="number"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={viewMode === 'weight' ? (value) => `${value}kg` : undefined}
                                />
                                <YAxis dataKey="name" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                <Legend />
                                {viewMode === 'count' ? (
                                    <>
                                        <Bar dataKey="Active" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} name="Active" />
                                        <Bar dataKey="Empty" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Empty" />
                                    </>
                                ) : (
                                    <>
                                        <Bar dataKey="Used" stackId="a" fill="#94a3b8" radius={[0, 0, 0, 0]} unit="kg" name="Used" />
                                        <Bar dataKey="Remaining" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} unit="kg" name="Remaining" />
                                    </>
                                )}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </PageTransition>
    );
}

interface KpiCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: 'blue' | 'green' | 'purple' | 'orange';
}

function KpiCard({ title, value, icon, color }: KpiCardProps) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
        green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
        orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col gap-1">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[color]} mb-1`}>
                {icon}
            </div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white truncate" title={String(value)}>{value}</p>
        </div>
    );
}
