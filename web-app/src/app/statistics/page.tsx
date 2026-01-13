'use client';

import { Suspense, useMemo } from 'react';
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
    Cell
} from 'recharts';
import { Package, Scale, Factory, Trophy } from 'lucide-react';

export default function StatisticsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading Statistics...</div>}>
            <StatisticsContent />
        </Suspense>
    );
}

function StatisticsContent() {
    const { spools, loading, error } = useSpools();

    const stats = useMemo(() => {
        if (!spools) return null;

        const activeSpools = spools.filter(s => !s.deleted); // Ensure we don't count deleted if soft-delete is used
        const totalCount = activeSpools.length;
        const totalWeight = activeSpools.reduce((sum, s) => sum + s.weightRemaining, 0);

        // Group by Brand
        const brandStats: Record<string, number> = {};
        activeSpools.forEach(s => {
            const b = s.brand || 'Unknown';
            brandStats[b] = (brandStats[b] || 0) + 1;
        });
        const stylesSorted = Object.entries(brandStats)
            .sort(([, a], [, b]) => b - a)
            .map(([name, value]) => ({ name, value }));

        const topBrand = stylesSorted[0]?.name || '-';

        // Group by Type
        const typeStats: Record<string, { count: number, remaining: number, capacity: number }> = {};
        activeSpools.forEach(s => {
            const t = s.type || 'Other';
            if (!typeStats[t]) typeStats[t] = { count: 0, remaining: 0, capacity: 0 };
            typeStats[t].count += 1;
            typeStats[t].remaining += s.weightRemaining;
            typeStats[t].capacity += s.weightTotal;
        });

        const typeUsageData = Object.entries(typeStats)
            .map(([name, data]) => ({
                name,
                Remaining: parseFloat((data.remaining / 1000).toFixed(2)), // kg
                Used: parseFloat(((data.capacity - data.remaining) / 1000).toFixed(2)), // kg
                Total: data.capacity
            }))
            .sort((a, b) => b.Total - a.Total); // Sort by total capacity

        const topMaterial = typeUsageData[0]?.name || '-';

        return {
            totalCount,
            totalWeight: (totalWeight / 1000).toFixed(2),
            topBrand,
            topMaterial,
            brandData: stylesSorted.slice(0, 10), // Top 10 brands
            typeUsageData
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
                            {entry.name}: {entry.value} {entry.unit}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <PageTransition className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Statistics</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Insights into your filament inventory and usage.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    title="Active Spools"
                    value={stats.totalCount}
                    icon={<Package className="w-6 h-6" />}
                    color="blue"
                />
                <KpiCard
                    title="Total Weight"
                    value={`${stats.totalWeight}kg`}
                    icon={<Scale className="w-6 h-6" />}
                    color="green"
                />
                <KpiCard
                    title="Top Brand"
                    value={stats.topBrand}
                    icon={<Factory className="w-6 h-6" />}
                    color="purple"
                />
                <KpiCard
                    title="Top Material"
                    value={stats.topMaterial}
                    icon={<Trophy className="w-6 h-6" />}
                    color="orange"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Material Usage Stacked Bar */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-lg mb-6 text-gray-900 dark:text-white">Material Usage (kg)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={stats.typeUsageData}
                                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}kg`} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                <Legend />
                                <Bar dataKey="Used" stackId="a" fill="#94a3b8" radius={[0, 0, 4, 4]} unit="kg" />
                                <Bar dataKey="Remaining" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} unit="kg" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Manufacturer Distribution Bar */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-lg mb-6 text-gray-900 dark:text-white">Spools by Manufacturer</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={stats.brandData}
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.1} />
                                <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} hide />
                                <YAxis dataKey="name" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Spools" unit="">
                                    {stats.brandData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index < 3 ? '#8b5cf6' : '#a78bfa'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </PageTransition>
    );
}

function KpiCard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: 'blue' | 'green' | 'purple' | 'orange' }) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
        green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
        orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col gap-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]} mb-2`}>
                {icon}
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white truncate" title={String(value)}>{value}</p>
        </div>
    );
}
