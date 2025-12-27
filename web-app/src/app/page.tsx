'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Circle, Database, Package, Scale, AlertTriangle, Download } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const stats = useLiveQuery(async () => {
    const allSpools = await db.spools.toArray();

    // Total count
    const totalCount = allSpools.length;

    // Total weight (g to kg)
    const totalWeight = allSpools.reduce((sum, s) => sum + s.weightRemaining, 0) / 1000;

    // Breakdown by type
    const byType = allSpools.reduce((acc, spool) => {
      if (!acc[spool.type]) {
        acc[spool.type] = { count: 0, weight: 0 };
      }
      acc[spool.type].count++;
      acc[spool.type].weight += spool.weightRemaining;
      return acc;
    }, {} as Record<string, { count: number, weight: number }>);

    // Low stock (<200g)
    const lowStock = allSpools.filter(s => s.weightRemaining < 200);

    return { totalCount, totalWeight, byType, lowStock };
  });

  if (!stats) return <div className="p-8">Loading Dashboard...</div>;

  const seedDatabase = async () => {
    const dummyData = [
      { serial: 'PRU-PLA-BLK', brand: 'Prusament', type: 'PLA', color: 'Galaxy Black', colorHex: '#1a1a1a', weightRemaining: 850, weightTotal: 1000, lastScanned: Date.now() },
      { serial: 'PRU-PETG-ORG', brand: 'Prusament', type: 'PETG', color: 'Prusa Orange', colorHex: '#ff8800', weightRemaining: 120, weightTotal: 1000, lastScanned: Date.now() },
      { serial: 'PRU-ASA-GRY', brand: 'Prusament', type: 'ASA', color: 'Galaxy Silver', colorHex: '#cccccc', weightRemaining: 980, weightTotal: 1000, lastScanned: Date.now() },
      { serial: 'PRU-PC-CLR', brand: 'Prusament', type: 'PC', color: 'Clear', colorHex: '#ffffff', weightRemaining: 400, weightTotal: 1000, lastScanned: Date.now() },
      { serial: 'PRU-PVB-TRN', brand: 'Prusament', type: 'PVB', color: 'Transparent', colorHex: '#e0e0e0', weightRemaining: 500, weightTotal: 500, lastScanned: Date.now() },
    ];

    await db.spools.bulkAdd(dummyData as any);
    window.location.reload();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-orange-500">Dashboard</h1>
          <p className="text-gray-500 mt-2">Overview of your filament inventory.</p>
        </div>
        <div className="flex items-center gap-2">
          {!((typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform())) && (
            <Link
              href="https://github.com/Pixelplanet/FilamentDB/releases/latest/download/filamentdb.apk"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
            >
              <Download className="w-3 h-3" />
              Android App
            </Link>
          )}
          {stats.totalCount === 0 && (
            <button
              onClick={seedDatabase}
              className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 px-3 py-1 rounded text-gray-500"
            >
              Seed Dummy Data
            </button>
          )}
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/inventory" className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
          <div className="p-4 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
            <Database className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase">Total Spools</p>
            <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">{stats.totalCount}</p>
          </div>
        </Link>

        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
          <div className="p-4 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
            <Scale className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase">Material Quantity</p>
            <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              {stats.totalWeight.toFixed(2)} <span className="text-lg text-gray-500 font-normal">kg</span>
            </p>
          </div>
        </div>
      </div>

      {/* Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Type */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-400" />
            Filament Types
          </h3>
          <div className="space-y-4">
            {Object.entries(stats.byType).map(([type, data]) => (
              <Link href={`/inventory?type=${type}`} key={type} className="block group">
                <div className="flex justify-between items-end mb-1">
                  <span className="font-medium group-hover:text-blue-600 transition-colors">{type}</span>
                  <span className="text-sm text-gray-500">
                    {data.count} spools <span className="mx-1">•</span> {(data.weight / 1000).toFixed(2)}kg
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${(data.count / stats.totalCount) * 100}%` }}
                  />
                </div>
              </Link>
            ))}
            {Object.keys(stats.byType).length === 0 && (
              <p className="text-gray-400 italic">No data yet.</p>
            )}
          </div>
        </div>

        {/* Low Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            Low Stock Alerts
          </h3>
          {stats.lowStock.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 min-h-[100px]">
              <p>All stock levels healthy!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.lowStock.map(spool => (
                <div key={spool.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                  <div>
                    <p className="font-medium text-sm">{spool.brand} {spool.type}</p>
                    <p className="text-xs text-gray-500">{spool.color}</p>
                  </div>
                  <span className="text-red-600 font-bold font-mono text-sm">
                    {spool.weightRemaining}g
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
